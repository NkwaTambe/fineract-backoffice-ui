/*
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  See the NOTICE file
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
import { LoadingService } from './loading.service';

describe('LoadingService', () => {
  let service: LoadingService;
  const firstUrl = '/api/first';
  const secondUrl = '/api/second';

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [LoadingService],
    });
    service = TestBed.inject(LoadingService);
  });

  it('should be created and have isLoading initial signal value of false', () => {
    expect(service).toBeTruthy();
    expect(service.isLoading()).toBe(false);
  });

  it('should update isLoading using loading state without url', () => {
    service.setLoading(true, '');
    expect(service.isLoading()).toBe(true);

    service.setLoading(false, '');
    expect(service.isLoading()).toBe(false);
  });

  it('should track multiple concurrent loading processes using url keys', () => {
    service.setLoading(true, firstUrl);
    expect(service.isLoading()).toBe(true);

    service.setLoading(true, secondUrl);
    expect(service.isLoading()).toBe(true);

    // Finish one, should still be loading since second is pending
    service.setLoading(false, firstUrl);
    expect(service.isLoading()).toBe(true);

    // Finish second, should be false
    service.setLoading(false, secondUrl);
    expect(service.isLoading()).toBe(false);
  });

  it('should ignore finish loading if url does not exist in map', () => {
    service.setLoading(true, firstUrl);
    service.setLoading(false, '/api/non-existent');
    expect(service.isLoading()).toBe(true);
  });
});
