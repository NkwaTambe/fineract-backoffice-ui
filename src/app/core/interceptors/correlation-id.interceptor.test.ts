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
import { HttpRequest, HttpHandlerFn, HttpResponse } from '@angular/common/http';
import { correlationIdInterceptor } from './correlation-id.interceptor';
import { firstValueFrom, of } from 'rxjs';

describe('correlationIdInterceptor', () => {
  const testUrl = '/test';

  beforeEach(() => {
    TestBed.configureTestingModule({});
  });

  const CORRELATION_ID_HEADER = 'X-Correlation-ID';

  it('should add X-Correlation-ID header to requests', async () => {
    const request = new HttpRequest('GET', testUrl);
    const next: HttpHandlerFn = (req) => {
      const headerVal = req.headers.get(CORRELATION_ID_HEADER);
      expect(headerVal).toBeTruthy();
      // Match UUID pattern
      expect(headerVal).toMatch(
        /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
      );
      return of(new HttpResponse({ status: 200 }));
    };

    await TestBed.runInInjectionContext(() =>
      firstValueFrom(correlationIdInterceptor(request, next)),
    );
  });

  it('should generate a unique X-Correlation-ID for each request', async () => {
    const request1 = new HttpRequest('GET', testUrl);
    const request2 = new HttpRequest('GET', testUrl);
    let id1 = '';
    let id2 = '';

    const next1: HttpHandlerFn = (req) => {
      id1 = req.headers.get(CORRELATION_ID_HEADER) || '';
      return of(new HttpResponse({ status: 200 }));
    };

    const next2: HttpHandlerFn = (req) => {
      id2 = req.headers.get(CORRELATION_ID_HEADER) || '';
      return of(new HttpResponse({ status: 200 }));
    };

    await TestBed.runInInjectionContext(() =>
      firstValueFrom(correlationIdInterceptor(request1, next1)),
    );
    await TestBed.runInInjectionContext(() =>
      firstValueFrom(correlationIdInterceptor(request2, next2)),
    );

    expect(id1).toBeTruthy();
    expect(id2).toBeTruthy();
    expect(id1).not.toBe(id2);
  });
});
