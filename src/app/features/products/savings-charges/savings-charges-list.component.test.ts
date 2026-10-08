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

import { createSpyObj, SpyObj } from '../../../testing/mocks';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SavingsChargesListComponent } from './savings-charges-list.component';
import { SavingsChargesService } from '../../../api';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from '../../../core/services/dialog.service';

describe('SavingsChargesListComponent', () => {
  let component: SavingsChargesListComponent;
  let fixture: ComponentFixture<SavingsChargesListComponent>;
  let serviceSpy: SpyObj<SavingsChargesService>;
  let routerSpy: SpyObj<Router>;
  let dialogService: SpyObj<DialogService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getSavingsaccountsSavingsAccountIdCharges',
      'deleteSavingsaccountsSavingsAccountIdChargesSavingsAccountChargeId',
    ]);
    routerSpy = createSpyObj(['navigate']);
    dialogService = createSpyObj(['confirm']);
    dialogService.confirm.mockResolvedValue(true);
    serviceSpy.getSavingsaccountsSavingsAccountIdCharges.mockReturnValue(
      of([{ id: 1, name: 'Withdrawal Fee', amount: 10 }]) as unknown as ReturnType<
        SavingsChargesService['getSavingsaccountsSavingsAccountIdCharges']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [SavingsChargesListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: SavingsChargesService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DialogService, useValue: dialogService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ savingsAccountId: '1' }) } },
        },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SavingsChargesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load charges on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getSavingsaccountsSavingsAccountIdCharges).toHaveBeenCalledWith(1);
    expect(component.charges()).toHaveLength(1);
  });

  it('should delete after confirmation and reload', async () => {
    serviceSpy.deleteSavingsaccountsSavingsAccountIdChargesSavingsAccountChargeId.mockReturnValue(
      of({}) as unknown as ReturnType<
        SavingsChargesService['deleteSavingsaccountsSavingsAccountIdChargesSavingsAccountChargeId']
      >,
    );

    component.onDelete({ id: 5, name: 'Y' });

    await fixture.whenStable();

    expect(
      serviceSpy.deleteSavingsaccountsSavingsAccountIdChargesSavingsAccountChargeId,
    ).toHaveBeenCalledWith(1, 5);
    expect(serviceSpy.getSavingsaccountsSavingsAccountIdCharges).toHaveBeenCalledTimes(2);
  });

  it('should not delete when cancelled', async () => {
    dialogService.confirm.mockResolvedValue(false);
    component.onDelete({ id: 5, name: 'Y' });
    await fixture.whenStable();
    expect(
      serviceSpy.deleteSavingsaccountsSavingsAccountIdChargesSavingsAccountChargeId,
    ).not.toHaveBeenCalled();
  });
});
