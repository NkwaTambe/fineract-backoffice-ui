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
import { WcLoanChargeFormComponent } from './wc-loan-charge-form.component';
import { WorkingCapitalLoanChargesService, WorkingCapitalLoanChargeData } from '../../../api';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideFakeAdapters } from '../../../testing/adapters';

describe('WcLoanChargeFormComponent', () => {
  let component: WcLoanChargeFormComponent;
  let fixture: ComponentFixture<WcLoanChargeFormComponent>;
  let chargesSpy: SpyObj<WorkingCapitalLoanChargesService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(() => {
    chargesSpy = createSpyObj([
      'getWorkingCapitalLoansLoanIdChargesTemplate',
      'postWorkingCapitalLoansLoanIdCharges',
    ]);
    routerSpy = createSpyObj(['navigate']);
    chargesSpy.getWorkingCapitalLoansLoanIdChargesTemplate.mockReturnValue(
      of({
        chargeOptions: [
          { id: 1, name: 'Processing Fee' },
          { id: 2, name: 'Late Fee' },
        ],
      } as WorkingCapitalLoanChargeData) as ReturnType<
        WorkingCapitalLoanChargesService['getWorkingCapitalLoansLoanIdChargesTemplate']
      >,
    );
    chargesSpy.postWorkingCapitalLoansLoanIdCharges.mockReturnValue(
      of({}) as ReturnType<
        WorkingCapitalLoanChargesService['postWorkingCapitalLoansLoanIdCharges']
      >,
    );

    TestBed.configureTestingModule({
      imports: [WcLoanChargeFormComponent],
      providers: [
        { provide: WorkingCapitalLoanChargesService, useValue: chargesSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '42' } } },
        },
        provideNoopAnimations(),
        ...provideFakeAdapters().providers,
      ],
    });

    fixture = TestBed.createComponent(WcLoanChargeFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should parse the loan id from the route', () => {
    expect(component.loanId).toBe(42);
  });

  it('loads the charge options from the template', () => {
    expect(component.chargeOptions()).toEqual([
      { id: 1, name: 'Processing Fee' },
      { id: 2, name: 'Late Fee' },
    ]);
  });

  it('submits a new charge', () => {
    component.request.chargeId = 1;
    component.request.amount = 100;
    component.dueDate = '2026-03-01';
    component.onSubmit();

    expect(chargesSpy.postWorkingCapitalLoansLoanIdCharges).toHaveBeenCalledWith(
      42,
      expect.objectContaining({ chargeId: 1, amount: 100, dueDate: expect.any(String) }),
    );
  });

  it('navigates back to the loan view on success, on the charges tab', () => {
    component.request.chargeId = 1;
    component.onSubmit();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/working-capital/loans/view/42'], {
      queryParams: { tab: 'charges' },
    });
  });

  it('stops saving and does not navigate away when the request fails', () => {
    chargesSpy.postWorkingCapitalLoansLoanIdCharges.mockReturnValue(
      throwError(() => new Error('boom')),
    );
    component.request.chargeId = 1;
    component.onSubmit();

    expect(component.isSaving()).toBe(false);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('cancel navigates back without submitting', () => {
    component.onCancel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/working-capital/loans/view/42'], {
      queryParams: { tab: 'charges' },
    });
    expect(chargesSpy.postWorkingCapitalLoansLoanIdCharges).not.toHaveBeenCalled();
  });
});
