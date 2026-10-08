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
import { InterestRateChartSlabsComponent } from './interest-rate-chart-slabs.component';
import { InterestRateSlabAKAInterestBandsService } from '../../../api';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from '../../../core/services/dialog.service';

describe('InterestRateChartSlabsComponent', () => {
  let component: InterestRateChartSlabsComponent;
  let fixture: ComponentFixture<InterestRateChartSlabsComponent>;
  let serviceSpy: SpyObj<InterestRateSlabAKAInterestBandsService>;
  let routerSpy: SpyObj<Router>;
  let dialogService: SpyObj<DialogService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getInterestratechartsChartIdChartslabs',
      'getInterestratechartsChartIdChartslabsTemplate',
      'postInterestratechartsChartIdChartslabs',
      'deleteInterestratechartsChartIdChartslabsChartSlabId',
    ]);
    routerSpy = createSpyObj(['navigate']);
    dialogService = createSpyObj(['confirm']);
    dialogService.confirm.mockResolvedValue(true);

    serviceSpy.getInterestratechartsChartIdChartslabsTemplate.mockReturnValue(
      of({ periodTypes: [{ id: 1, code: 'days', value: 'Days' }] }) as unknown as ReturnType<
        InterestRateSlabAKAInterestBandsService['getInterestratechartsChartIdChartslabsTemplate']
      >,
    );
    serviceSpy.getInterestratechartsChartIdChartslabs.mockReturnValue(
      of([{ id: 1, fromPeriod: 0, annualInterestRate: 5 }]) as unknown as ReturnType<
        InterestRateSlabAKAInterestBandsService['getInterestratechartsChartIdChartslabs']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [InterestRateChartSlabsComponent],
      providers: [
        ...provideTranslateTesting(),
        {
          provide: InterestRateSlabAKAInterestBandsService,
          useValue: serviceSpy,
        },
        { provide: Router, useValue: routerSpy },
        { provide: DialogService, useValue: dialogService },
        {
          provide: ActivatedRoute,
          useValue: { paramMap: of(convertToParamMap({ chartId: '12' })) },
        },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(InterestRateChartSlabsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load slabs and template options on init', () => {
    expect(component).toBeTruthy();
    expect(component.chartId).toBe(12);
    expect(serviceSpy.getInterestratechartsChartIdChartslabs).toHaveBeenCalledWith(12);
    expect(component.slabs()).toHaveLength(1);
    expect(component.periodTypeOptions()).toHaveLength(1);
  });

  it('should post a new slab and reload', () => {
    serviceSpy.postInterestratechartsChartIdChartslabs.mockReturnValue(
      of({}) as unknown as ReturnType<
        InterestRateSlabAKAInterestBandsService['postInterestratechartsChartIdChartslabs']
      >,
    );
    component.newSlab().annualInterestRate = 6;
    component.onAdd();
    expect(serviceSpy.postInterestratechartsChartIdChartslabs).toHaveBeenCalled();
    expect(serviceSpy.getInterestratechartsChartIdChartslabs).toHaveBeenCalledTimes(2);
  });

  it('should delete a slab after confirmation and reload', async () => {
    serviceSpy.deleteInterestratechartsChartIdChartslabsChartSlabId.mockReturnValue(
      of({}) as unknown as ReturnType<
        InterestRateSlabAKAInterestBandsService['deleteInterestratechartsChartIdChartslabsChartSlabId']
      >,
    );
    component.onDelete({ id: 3 });
    await fixture.whenStable();
    expect(serviceSpy.deleteInterestratechartsChartIdChartslabsChartSlabId).toHaveBeenCalledWith(
      12,
      3,
    );
    expect(serviceSpy.getInterestratechartsChartIdChartslabs).toHaveBeenCalledTimes(2);
  });

  it('should not delete a slab when cancelled', async () => {
    dialogService.confirm.mockResolvedValue(false);
    component.onDelete({ id: 3 });
    await fixture.whenStable();
    expect(serviceSpy.deleteInterestratechartsChartIdChartslabsChartSlabId).not.toHaveBeenCalled();
  });
});
