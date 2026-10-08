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
import { ShareDividendsListComponent } from './share-dividends-list.component';
import { SelfDividendService } from '../../../api';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from '../../../core/services/dialog.service';

describe('ShareDividendsListComponent', () => {
  let component: ShareDividendsListComponent;
  let fixture: ComponentFixture<ShareDividendsListComponent>;
  let serviceSpy: SpyObj<SelfDividendService>;
  let routerSpy: SpyObj<Router>;
  let dialogService: SpyObj<DialogService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getShareproductProductIdDividend',
      'deleteShareproductProductIdDividendDividendId',
    ]);
    routerSpy = createSpyObj(['navigate']);
    dialogService = createSpyObj(['confirm']);
    dialogService.confirm.mockResolvedValue(true);
    serviceSpy.getShareproductProductIdDividend.mockReturnValue(
      of(
        JSON.stringify([{ id: 1, amount: 100, dividendPeriodStartDate: [2026, 1, 1] }]),
      ) as unknown as ReturnType<SelfDividendService['getShareproductProductIdDividend']>,
    );

    await TestBed.configureTestingModule({
      imports: [ShareDividendsListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: SelfDividendService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DialogService, useValue: dialogService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ productId: '1' }) } },
        },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ShareDividendsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load and parse dividends on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getShareproductProductIdDividend).toHaveBeenCalledWith(1);
    expect(component.dividends()).toHaveLength(1);
    expect(component.dividends()[0].amount).toBe(100);
  });

  it('should delete after confirmation and reload', async () => {
    serviceSpy.deleteShareproductProductIdDividendDividendId.mockReturnValue(
      of('') as unknown as ReturnType<
        SelfDividendService['deleteShareproductProductIdDividendDividendId']
      >,
    );

    component.onDelete({ id: 5 });

    await fixture.whenStable();

    expect(serviceSpy.deleteShareproductProductIdDividendDividendId).toHaveBeenCalledWith(1, 5);
    expect(serviceSpy.getShareproductProductIdDividend).toHaveBeenCalledTimes(2);
  });

  it('should not delete when cancelled', async () => {
    dialogService.confirm.mockResolvedValue(false);
    component.onDelete({ id: 5 });
    await fixture.whenStable();
    expect(serviceSpy.deleteShareproductProductIdDividendDividendId).not.toHaveBeenCalled();
  });
});
