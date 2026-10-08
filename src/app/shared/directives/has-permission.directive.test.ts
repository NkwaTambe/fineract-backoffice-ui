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
import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { HasPermissionDirective } from './has-permission.directive';
import { AuthService } from '../../core/services/auth.service';
import { provideTestConfig } from '../../testing/config';

@Component({
  template: `
    <div id="single-permission" *appHasPermission="'CREATE_CLIENT'">Single</div>
    <div id="multiple-permission" *appHasPermission="['CREATE_CLIENT', 'UPDATE_CLIENT']">
      Multiple
    </div>
    <div
      id="strict-permission"
      *appHasPermission="['CREATE_CLIENT', 'UPDATE_CLIENT']; matchAll: true"
    >
      Strict
    </div>
  `,
  standalone: true,
  imports: [HasPermissionDirective],
})
class TestComponent {}

const SINGLE_PERMISSION_SELECTOR = '#single-permission';
const MULTIPLE_PERMISSION_SELECTOR = '#multiple-permission';
const STRICT_PERMISSION_SELECTOR = '#strict-permission';

describe('HasPermissionDirective', () => {
  let fixture: ComponentFixture<TestComponent>;
  let authServiceSpy: SpyObj<AuthService>;

  /** Configures the TestBed with RBAC on or off for this deployment. */
  function configure(rbacEnabled: boolean): void {
    TestBed.configureTestingModule({
      imports: [TestComponent],
      providers: [
        { provide: AuthService, useValue: authServiceSpy },
        provideTestConfig({ rbacEnabled }),
      ],
    });
  }

  beforeEach(() => {
    authServiceSpy = Object.assign(createSpyObj<AuthService>(['hasPermission']), {
      currentUser: () => ({ permissions: ['CREATE_CLIENT'] }),
    });
    configure(true);
  });

  it('should render elements when permission is granted', () => {
    authServiceSpy.hasPermission.mockReturnValue(true);
    fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const singleEl = fixture.debugElement.query(By.css(SINGLE_PERMISSION_SELECTOR));
    const multipleEl = fixture.debugElement.query(By.css(MULTIPLE_PERMISSION_SELECTOR));
    const strictEl = fixture.debugElement.query(By.css(STRICT_PERMISSION_SELECTOR));

    expect(singleEl).toBeTruthy();
    expect(multipleEl).toBeTruthy();
    expect(strictEl).toBeTruthy();
  });

  it('should hide elements when permission is denied', () => {
    authServiceSpy.hasPermission.mockReturnValue(false);
    fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const singleEl = fixture.debugElement.query(By.css(SINGLE_PERMISSION_SELECTOR));
    const multipleEl = fixture.debugElement.query(By.css(MULTIPLE_PERMISSION_SELECTOR));
    const strictEl = fixture.debugElement.query(By.css(STRICT_PERMISSION_SELECTOR));

    expect(singleEl).toBeNull();
    expect(multipleEl).toBeNull();
    expect(strictEl).toBeNull();
  });

  it('should render everything when RBAC is disabled, even without permission', () => {
    TestBed.resetTestingModule();
    configure(false);
    authServiceSpy.hasPermission.mockReturnValue(false);
    fixture = TestBed.createComponent(TestComponent);
    fixture.detectChanges();

    const singleEl = fixture.debugElement.query(By.css(SINGLE_PERMISSION_SELECTOR));
    const multipleEl = fixture.debugElement.query(By.css(MULTIPLE_PERMISSION_SELECTOR));
    const strictEl = fixture.debugElement.query(By.css(STRICT_PERMISSION_SELECTOR));

    expect(singleEl).toBeTruthy();
    expect(multipleEl).toBeTruthy();
    expect(strictEl).toBeTruthy();
    expect(authServiceSpy.hasPermission).not.toHaveBeenCalled();
  });
});
