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

import { TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { LoanTransactionsService, LoansService } from '../../api';
import { DialogService } from '../../core/services/dialog.service';
import { NotificationService } from '../../core/services/notification.service';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { createSpyObj, SpyObj } from '../../testing/mocks';
import { LoanTransactionFormComponent } from './loan-transaction-form.component';

describe('LoanTransactionFormComponent contract termination', () => {
  let component: LoanTransactionFormComponent;
  let loansSpy: SpyObj<LoansService>;
  let transactionsSpy: SpyObj<LoanTransactionsService>;
  let dialogSpy: SpyObj<DialogService>;

  beforeEach(async () => {
    loansSpy = createSpyObj(['postLoansLoanId']);
    transactionsSpy = createSpyObj([
      'getLoansLoanIdTransactionsTemplate',
      'postLoansLoanIdTransactions',
    ]);
    dialogSpy = createSpyObj(['confirm']);
    loansSpy.postLoansLoanId.mockReturnValue(of({}) as never);
    dialogSpy.confirm.mockResolvedValue(true);

    await TestBed.configureTestingModule({
      imports: [LoanTransactionFormComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: LoansService, useValue: loansSpy },
        { provide: LoanTransactionsService, useValue: transactionsSpy },
        { provide: DialogService, useValue: dialogSpy },
        { provide: NotificationService, useValue: createSpyObj(['success', 'error']) },
        { provide: Router, useValue: createSpyObj(['navigate']) },
        { provide: ActivatedRoute, useValue: { params: of({}) } },
      ],
    }).compileComponents();

    component = TestBed.createComponent(LoanTransactionFormComponent).componentInstance;
    component.loanId = 456;
  });

  it('posts contract termination as a loan-level command with only the optional note', async () => {
    component.transactionType.set('contractTermination');
    component.transaction.note = '  Approved by risk  ';

    component.onSubmit();

    await vi.waitFor(() =>
      expect(loansSpy.postLoansLoanId).toHaveBeenCalledWith(
        456,
        { note: 'Approved by risk' },
        'contractTermination',
      ),
    );
    expect(transactionsSpy.postLoansLoanIdTransactions).not.toHaveBeenCalled();
  });

  it('posts undo contract termination with the same loan-level shape', async () => {
    component.transactionType.set('undoContractTermination');
    component.transaction.note = 'Termination entered incorrectly';

    component.onSubmit();

    await vi.waitFor(() =>
      expect(loansSpy.postLoansLoanId).toHaveBeenCalledWith(
        456,
        { note: 'Termination entered incorrectly' },
        'undoContractTermination',
      ),
    );
  });
});
