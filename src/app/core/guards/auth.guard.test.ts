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
import { Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { authGuard } from './auth.guard';
import { AuthService } from '../services/auth.service';
import { signal } from '@angular/core';

describe('authGuard', () => {
  let authServiceSpy: SpyObj<AuthService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(() => {
    authServiceSpy = Object.assign(createSpyObj<AuthService>([]), {
      isAuthenticated: signal(false),
    });
    routerSpy = createSpyObj<Router>(['parseUrl']);

    TestBed.configureTestingModule({
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: routerSpy },
      ],
    });
  });

  it('should return true if user is authenticated', () => {
    const isAuthenticatedSignal = signal(true);
    Object.defineProperty(authServiceSpy, 'isAuthenticated', { get: () => isAuthenticatedSignal });

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(result).toBe(true);
  });

  it('should redirect to login if user is not authenticated', () => {
    const isAuthenticatedSignal = signal(false);
    Object.defineProperty(authServiceSpy, 'isAuthenticated', { get: () => isAuthenticatedSignal });

    const loginUrlTree = {} as UrlTree;
    routerSpy.parseUrl.mockReturnValue(loginUrlTree);

    const result = TestBed.runInInjectionContext(() =>
      authGuard({} as ActivatedRouteSnapshot, {} as RouterStateSnapshot),
    );
    expect(result).toBe(loginUrlTree);
    expect(routerSpy.parseUrl).toHaveBeenCalledWith('/login');
  });
});
