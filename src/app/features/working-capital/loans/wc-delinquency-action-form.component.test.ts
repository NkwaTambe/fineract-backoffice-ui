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
import { WcDelinquencyActionFormComponent } from './wc-delinquency-action-form.component';
import {
  WorkingCapitalLoanDelinquencyActionsService,
  WorkingCapitalLoanDelinquencyActionData,
} from '../../../api';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideFakeAdapters } from '../../../testing/adapters';

const ACTIONS = WorkingCapitalLoanDelinquencyActionData.ActionEnum;

describe('WcDelinquencyActionFormComponent', () => {
  let component: WcDelinquencyActionFormComponent;
  let fixture: ComponentFixture<WcDelinquencyActionFormComponent>;
  let delinquencyActionsSpy: SpyObj<WorkingCapitalLoanDelinquencyActionsService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(() => {
    delinquencyActionsSpy = createSpyObj(['postWorkingCapitalLoansLoanIdDelinquencyActions']);
    routerSpy = createSpyObj(['navigate']);
    delinquencyActionsSpy.postWorkingCapitalLoansLoanIdDelinquencyActions.mockReturnValue(
      of({}) as ReturnType<
        WorkingCapitalLoanDelinquencyActionsService['postWorkingCapitalLoansLoanIdDelinquencyActions']
      >,
    );

    TestBed.configureTestingModule({
      imports: [WcDelinquencyActionFormComponent],
      providers: [
        {
          provide: WorkingCapitalLoanDelinquencyActionsService,
          useValue: delinquencyActionsSpy,
        },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '42' } } },
        },
        provideNoopAnimations(),
        ...provideFakeAdapters().providers,
      ],
    });

    fixture = TestBed.createComponent(WcDelinquencyActionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should parse the loan id from the route', () => {
    expect(component.loanId).toBe(42);
  });

  it('submits a PAUSE action with start/end dates', () => {
    component.action = ACTIONS.Pause;
    component.startDate = '2026-01-01';
    component.endDate = '2026-02-01';
    component.onSubmit();

    expect(
      delinquencyActionsSpy.postWorkingCapitalLoansLoanIdDelinquencyActions,
    ).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        action: ACTIONS.Pause,
        startDate: expect.any(String),
        endDate: expect.any(String),
      }),
    );
  });

  it('submits a RESET action with the start-new-period flag', () => {
    component.action = ACTIONS.Reset;
    component.startNewPeriod = true;
    component.onSubmit();

    expect(
      delinquencyActionsSpy.postWorkingCapitalLoansLoanIdDelinquencyActions,
    ).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        action: ACTIONS.Reset,
        startNewPeriod: true,
      }),
    );
  });

  it('submits a RESCHEDULE action with frequency and minimum payment fields', () => {
    component.action = ACTIONS.Reschedule;
    component.request.frequency = 3;
    component.request.frequencyType = component.frequencyTypeOptions[0];
    component.request.minimumPayment = 50;
    component.request.minimumPaymentType = component.minimumPaymentTypeOptions[0];
    component.onSubmit();

    expect(
      delinquencyActionsSpy.postWorkingCapitalLoansLoanIdDelinquencyActions,
    ).toHaveBeenCalledWith(
      42,
      expect.objectContaining({
        action: ACTIONS.Reschedule,
        frequency: 3,
        minimumPayment: 50,
      }),
    );
  });

  it('navigates back to the loan view on success, on the delinquency-actions tab', () => {
    component.action = ACTIONS.Resume;
    component.onSubmit();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/working-capital/loans/view/42'], {
      queryParams: { tab: 'delinquencyActions' },
    });
  });

  it('stops saving and does not navigate away when the request fails', () => {
    delinquencyActionsSpy.postWorkingCapitalLoansLoanIdDelinquencyActions.mockReturnValue(
      throwError(() => new Error('boom')),
    );
    component.action = ACTIONS.Enable;
    component.onSubmit();

    expect(component.isSaving()).toBe(false);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('cancel navigates back without submitting', () => {
    component.onCancel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/working-capital/loans/view/42'], {
      queryParams: { tab: 'delinquencyActions' },
    });
    expect(
      delinquencyActionsSpy.postWorkingCapitalLoansLoanIdDelinquencyActions,
    ).not.toHaveBeenCalled();
  });
});
