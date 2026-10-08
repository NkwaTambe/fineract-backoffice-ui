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

import { createSpyObj, SpyObj } from '../../testing/mocks';
import { TestBed } from '@angular/core/testing';
import { provideHttpClient, withInterceptors, HttpClient, HttpHeaders } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { LoadingService } from '../services/loading.service';
import { loadingInterceptor } from './loading.interceptor';
import { skipLoading } from '../http/http-context';

describe('loadingInterceptor', () => {
  let httpClient: HttpClient;
  let httpTestingController: HttpTestingController;
  let loadingServiceSpy: SpyObj<LoadingService>;
  const testUrl = '/api/test';

  beforeEach(() => {
    loadingServiceSpy = createSpyObj(['setLoading']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([loadingInterceptor])),
        provideHttpClientTesting(),
        { provide: LoadingService, useValue: loadingServiceSpy },
      ],
    });

    httpClient = TestBed.inject(HttpClient);
    httpTestingController = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    httpTestingController.verify();
  });

  it('should set loading to true and then false upon request completion', () => {
    httpClient.get(testUrl).subscribe((response) => {
      expect(response).toEqual({ data: 'ok' });
    });

    expect(loadingServiceSpy.setLoading).toHaveBeenCalledWith(true, testUrl);

    const req = httpTestingController.expectOne(testUrl);
    req.flush({ data: 'ok' });

    expect(loadingServiceSpy.setLoading).toHaveBeenCalledWith(false, testUrl);
  });

  it('should skip loading indicator when the SKIP_LOADING context is set', () => {
    httpClient.get('/api/test-skip-context', { context: skipLoading() }).subscribe();

    expect(loadingServiceSpy.setLoading).not.toHaveBeenCalled();

    const req = httpTestingController.expectOne('/api/test-skip-context');
    // Context is client-side only: nothing about the opt-out reaches the server.
    expect(req.request.headers.has('X-Skip-Loading')).toBe(false);
    req.flush({});
  });

  it('should skip loading indicator if X-Skip-Loading header is present', () => {
    const headers = new HttpHeaders().set('X-Skip-Loading', 'true');
    httpClient.get('/api/test-skip', { headers }).subscribe();

    expect(loadingServiceSpy.setLoading).not.toHaveBeenCalled();

    const req = httpTestingController.expectOne('/api/test-skip');
    req.flush({});
  });

  it('should set loading to false even if request errors', () => {
    const errorUrl = '/api/test-error';
    httpClient.get(errorUrl).subscribe({
      next: () => {
        throw new Error('expected an error');
      },
      error: () => undefined,
    });

    expect(loadingServiceSpy.setLoading).toHaveBeenCalledWith(true, errorUrl);

    const req = httpTestingController.expectOne(errorUrl);
    req.flush('Error occurred', { status: 500, statusText: 'Server Error' });

    expect(loadingServiceSpy.setLoading).toHaveBeenCalledWith(false, errorUrl);
  });
});
