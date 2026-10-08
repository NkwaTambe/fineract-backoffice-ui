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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { LoanReschedulingService } from '../../../api';
import { NotificationService } from '../../../core/services/notification.service';
import { provideFakeAdapters } from '../../../testing/adapters';
import { createSpyObj } from '../../../testing/mocks';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { LoanScheduleModifyComponent } from './loan-schedule-modify.component';

describe('LoanScheduleModifyComponent', () => {
  let fixture: ComponentFixture<LoanScheduleModifyComponent>;
  const adapters = provideFakeAdapters();

  beforeEach(async () => {
    adapters.i18n.catalogue.set(
      'LOAN_SCHEDULE_MODIFY.CALCULATE_REPAYMENT_SCHEDULE',
      'Calculate-test',
    );
    adapters.i18n.catalogue.set(
      'LOAN_SCHEDULE_MODIFY.FORCE_RECALCULATE_REPAYMENT_SCHEDULE',
      'Recalculate-test',
    );

    await TestBed.configureTestingModule({
      imports: [LoanScheduleModifyComponent],
      providers: [
        ...provideTranslateTesting(),
        ...adapters.providers,
        {
          provide: LoanReschedulingService,
          useValue: createSpyObj<LoanReschedulingService>(['postLoansLoanIdSchedule']),
        },
        {
          provide: NotificationService,
          useValue: createSpyObj<NotificationService>(['success', 'error', 'show']),
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanScheduleModifyComponent);
    fixture.detectChanges();
  });

  it('renders command labels through the translation adapter', () => {
    const text = (fixture.nativeElement as HTMLElement).textContent;
    expect(text).toContain('Calculate-test');
    expect(text).toContain('Recalculate-test');
    expect(text).not.toContain('LOAN_SCHEDULE_MODIFY.CALCULATE_REPAYMENT_SCHEDULE');
  });
});
