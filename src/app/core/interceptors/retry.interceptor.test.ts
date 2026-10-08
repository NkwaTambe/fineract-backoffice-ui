/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 *
 *   http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
 */

import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { idempotent, withRetry, withTimeout } from '../http/http-context';
import { DEFAULT_RETRY_COUNT, retryInterceptor } from './retry.interceptor';

describe('retryInterceptor', () => {
  let httpClient: HttpClient;
  let http: HttpTestingController;
  const testUrl = '/api/test';

  /** Long enough to clear the 300ms + 900ms backoff of a full default retry run. */
  const PAST_ALL_BACKOFF = 5000;

  beforeEach(() => {
    vi.useFakeTimers();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([retryInterceptor])),
        provideHttpClientTesting(),
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => vi.useRealTimers());

  /** Fails every request made to `url` so far, then lets the backoff timer elapse. */
  function failAll(url: string, status: number): number {
    const pending = http.match(url);
    for (const req of pending) {
      req.flush(null, { status, statusText: 'Failed' });
    }
    vi.advanceTimersByTime(PAST_ALL_BACKOFF);
    return pending.length;
  }

  it('should retry a GET on a transient failure and surface the last one', () => {
    let received: unknown = null;
    httpClient.get(testUrl).subscribe({ error: (err) => (received = err) });

    let attempts = 0;
    // One initial attempt plus DEFAULT_RETRY_COUNT retries, each failing.
    for (let i = 0; i <= DEFAULT_RETRY_COUNT; i++) {
      attempts += failAll(testUrl, 503);
    }

    expect(attempts).toBe(DEFAULT_RETRY_COUNT + 1);
    expect(received).toBeTruthy();
    http.verify();
  });

  it('should stop retrying as soon as an attempt succeeds', () => {
    let response: unknown = null;
    httpClient.get(testUrl).subscribe((r) => (response = r));

    failAll(testUrl, 503);
    http.expectOne(testUrl).flush({ data: 'ok' });
    vi.advanceTimersByTime(PAST_ALL_BACKOFF);

    expect(response).toEqual({ data: 'ok' });
    http.verify();
  });

  it('should not retry a 4xx, which repeating cannot fix', () => {
    httpClient.get(testUrl).subscribe({ error: () => undefined });

    http.expectOne(testUrl).flush(null, { status: 400, statusText: 'Bad Request' });
    vi.advanceTimersByTime(PAST_ALL_BACKOFF);

    http.verify();
  });

  it('should not retry a 500, which is deterministic more often than not', () => {
    httpClient.get(testUrl).subscribe({ error: () => undefined });

    http.expectOne(testUrl).flush(null, { status: 500, statusText: 'Server Error' });
    vi.advanceTimersByTime(PAST_ALL_BACKOFF);

    http.verify();
  });

  it('should not repeat a POST, which may already have been applied', () => {
    httpClient.post(testUrl, {}).subscribe({ error: () => undefined });

    http.expectOne(testUrl).flush(null, { status: 503, statusText: 'Unavailable' });
    vi.advanceTimersByTime(PAST_ALL_BACKOFF);

    http.verify();
  });

  it('should repeat a POST the call site declared idempotent', () => {
    httpClient.post(testUrl, {}, { context: idempotent() }).subscribe({ error: () => undefined });

    let attempts = 0;
    for (let i = 0; i <= DEFAULT_RETRY_COUNT; i++) {
      attempts += failAll(testUrl, 503);
    }

    expect(attempts).toBe(DEFAULT_RETRY_COUNT + 1);
    http.verify();
  });

  it('should not treat an explicit count as permission to repeat a POST', () => {
    // withRetry() tunes retrying where it is allowed; idempotent() is what authorises it.
    httpClient.post(testUrl, {}, { context: withRetry(3) }).subscribe({ error: () => undefined });

    http.expectOne(testUrl).flush(null, { status: 503, statusText: 'Unavailable' });
    vi.advanceTimersByTime(PAST_ALL_BACKOFF);

    http.verify();
  });

  it('should let a GET opt out with a count of zero', () => {
    httpClient.get(testUrl, { context: withRetry(0) }).subscribe({ error: () => undefined });

    http.expectOne(testUrl).flush(null, { status: 503, statusText: 'Unavailable' });
    vi.advanceTimersByTime(PAST_ALL_BACKOFF);

    http.verify();
  });

  it('should not impose a timeout unless the call site asks for one', () => {
    let response: unknown = null;
    httpClient.get(testUrl).subscribe((r) => (response = r));

    // Longer than any default would plausibly be — a report or batch job runs this long.
    vi.advanceTimersByTime(120_000);
    http.expectOne(testUrl).flush({ data: 'ok' });
    vi.advanceTimersByTime(PAST_ALL_BACKOFF);

    expect(response).toEqual({ data: 'ok' });
    http.verify();
  });

  it('should abandon a request that outruns its own deadline', () => {
    let received: unknown = null;
    httpClient.get(testUrl, { context: withTimeout(1000) }).subscribe({
      next: () => {
        throw new Error('expected a timeout');
      },
      error: (err) => (received = err),
    });

    const req = http.expectOne(testUrl);
    vi.advanceTimersByTime(1500);

    expect(received).toBeTruthy();
    // The deadline is honoured, not multiplied by the retry count.
    expect(req.cancelled).toBe(true);
    vi.advanceTimersByTime(PAST_ALL_BACKOFF);
    http.verify();
  });
});
