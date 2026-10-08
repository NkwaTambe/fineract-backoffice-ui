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
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { AccountingRulesListComponent } from './accounting-rules-list.component';
import { AccountingRulesService } from '../../api';
import { provideIonicTesting } from '../../testing/ionic-testing';
import { provideTranslateTesting } from '../../testing/i18n-testing';

describe('AccountingRulesListComponent', () => {
  let component: AccountingRulesListComponent;
  let fixture: ComponentFixture<AccountingRulesListComponent>;
  let serviceSpy: SpyObj<AccountingRulesService>;

  const rules = [{ id: 1, name: 'Cash to Bank Transfer' }];

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getAccountingrules']);
    serviceSpy.getAccountingrules.mockReturnValue(
      of(rules) as unknown as ReturnType<AccountingRulesService['getAccountingrules']>,
    );

    await TestBed.configureTestingModule({
      imports: [AccountingRulesListComponent],
      providers: [
        provideNoopAnimations(),
        provideIonicTesting(),
        ...provideTranslateTesting(),
        { provide: AccountingRulesService, useValue: serviceSpy },
        { provide: Router, useValue: createSpyObj(['navigate']) },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(AccountingRulesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('loads rules on init', () => {
    expect(serviceSpy.getAccountingrules).toHaveBeenCalledTimes(1);
    expect(component.rules()).toEqual(rules);
    expect(component.hasError()).toBe(false);
  });

  it('shows a load error instead of an empty table', () => {
    serviceSpy.getAccountingrules.mockReturnValue(
      throwError(() => new Error('boom')) as unknown as ReturnType<
        AccountingRulesService['getAccountingrules']
      >,
    );

    component.onRetry();
    fixture.detectChanges();

    expect(component.hasError()).toBe(true);
    expect(component.rules()).toEqual([]);
    expect(fixture.nativeElement.querySelector('[data-testid="data-table-error"]')).not.toBeNull();
  });

  it('clears the error after a successful retry', () => {
    serviceSpy.getAccountingrules.mockReturnValue(
      throwError(() => new Error('boom')) as unknown as ReturnType<
        AccountingRulesService['getAccountingrules']
      >,
    );
    component.onRetry();
    expect(component.hasError()).toBe(true);

    serviceSpy.getAccountingrules.mockReturnValue(
      of(rules) as unknown as ReturnType<AccountingRulesService['getAccountingrules']>,
    );

    component.onRetry();

    expect(component.hasError()).toBe(false);
    expect(component.rules()).toEqual(rules);
  });
});
