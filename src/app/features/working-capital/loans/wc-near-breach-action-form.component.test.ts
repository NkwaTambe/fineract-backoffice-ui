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
import { WcNearBreachActionFormComponent } from './wc-near-breach-action-form.component';
import {
  WorkingCapitalLoanNearBreachActionsService,
  PostWorkingCapitalLoansLoanIdNearBreachActionsRequest,
} from '../../../api';
import { ActivatedRoute, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { provideFakeAdapters } from '../../../testing/adapters';

describe('WcNearBreachActionFormComponent', () => {
  let component: WcNearBreachActionFormComponent;
  let fixture: ComponentFixture<WcNearBreachActionFormComponent>;
  let nearBreachActionsSpy: SpyObj<WorkingCapitalLoanNearBreachActionsService>;
  let routerSpy: SpyObj<Router>;

  beforeEach(() => {
    nearBreachActionsSpy = createSpyObj(['postWorkingCapitalLoansLoanIdNearBreachActions']);
    routerSpy = createSpyObj(['navigate']);
    nearBreachActionsSpy.postWorkingCapitalLoansLoanIdNearBreachActions.mockReturnValue(
      of({}) as ReturnType<
        WorkingCapitalLoanNearBreachActionsService['postWorkingCapitalLoansLoanIdNearBreachActions']
      >,
    );

    TestBed.configureTestingModule({
      imports: [WcNearBreachActionFormComponent],
      providers: [
        { provide: WorkingCapitalLoanNearBreachActionsService, useValue: nearBreachActionsSpy },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: { get: () => '42' } } },
        },
        provideNoopAnimations(),
        ...provideFakeAdapters().providers,
      ],
    });

    fixture = TestBed.createComponent(WcNearBreachActionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should parse the loan id from the route', () => {
    expect(component.loanId).toBe(42);
  });

  it('defaults the action to RESCHEDULE, the only value the API accepts', () => {
    expect(component.request.action).toBe(
      PostWorkingCapitalLoansLoanIdNearBreachActionsRequest.ActionEnum.Reschedule,
    );
  });

  it('submits the near-breach action with the entered values', () => {
    component.request.nearBreachFrequency = 5;
    component.request.nearBreachFrequencyType =
      PostWorkingCapitalLoansLoanIdNearBreachActionsRequest.NearBreachFrequencyTypeEnum.Weeks;
    component.request.nearBreachThreshold = 90;
    component.onSubmit();

    expect(
      nearBreachActionsSpy.postWorkingCapitalLoansLoanIdNearBreachActions,
    ).toHaveBeenCalledWith(42, component.request);
  });

  it('navigates back to the loan view on success, on the near-breach-actions tab', () => {
    component.onSubmit();

    expect(routerSpy.navigate).toHaveBeenCalledWith(['/working-capital/loans/view/42'], {
      queryParams: { tab: 'nearBreachActions' },
    });
  });

  it('stops saving and does not navigate away when the request fails', () => {
    nearBreachActionsSpy.postWorkingCapitalLoansLoanIdNearBreachActions.mockReturnValue(
      throwError(() => new Error('boom')),
    );
    component.onSubmit();

    expect(component.isSaving()).toBe(false);
    expect(routerSpy.navigate).not.toHaveBeenCalled();
  });

  it('cancel navigates back without submitting', () => {
    component.onCancel();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/working-capital/loans/view/42'], {
      queryParams: { tab: 'nearBreachActions' },
    });
    expect(
      nearBreachActionsSpy.postWorkingCapitalLoansLoanIdNearBreachActions,
    ).not.toHaveBeenCalled();
  });
});
