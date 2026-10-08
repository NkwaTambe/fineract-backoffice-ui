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

import { Component } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { RouterTestingHarness } from '@angular/router/testing';
import { SECURITY_ROUTES } from './security.routes';

@Component({
  standalone: true,
  template: '',
})
class RouteStub {}

describe('SECURITY_ROUTES', () => {
  beforeEach(() => {
    const routes = SECURITY_ROUTES.map((route) =>
      route.redirectTo ? route : { path: route.path, component: RouteStub },
    );

    TestBed.configureTestingModule({
      providers: [
        provideRouter([
          { path: 'security', children: routes },
          { path: 'dashboard', component: RouteStub },
          { path: '**', redirectTo: 'dashboard' },
        ]),
      ],
    });
  });

  it('keeps the audits screen on /security/audits', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/security/audits');

    expect(TestBed.inject(Router).url).toBe('/security/audits');
  });

  it('sends leftover /security/audit-trails to the audits screen instead of the dashboard', async () => {
    const harness = await RouterTestingHarness.create();

    await harness.navigateByUrl('/security/audit-trails');

    expect(TestBed.inject(Router).url).toBe('/security/audits');
  });
});
