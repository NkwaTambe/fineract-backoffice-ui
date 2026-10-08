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
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';

import { LoanTransactionsService, LoansService, PaymentTypeService } from '../../api';
import { DialogService } from '../../core/services/dialog.service';
import { NotificationService } from '../../core/services/notification.service';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { provideIonicTesting } from '../../testing/ionic-testing';
import { createSpyObj, SpyObj } from '../../testing/mocks';
import { LoanTransactionFormComponent } from './loan-transaction-form.component';

const LOAN_ID = 456;
const PAID_CHARGE = {
  id: 77,
  name: 'Documentation fee',
  amountPaid: 125,
  chargeTimeType: { code: 'chargeTimeType.specifiedDueDate', value: 'Specified due date' },
};

describe('LoanTransactionFormComponent charge refund', () => {
  let component: LoanTransactionFormComponent;
  let fixture: ComponentFixture<LoanTransactionFormComponent>;
  let loansSpy: SpyObj<LoansService>;
  let transactionsSpy: SpyObj<LoanTransactionsService>;
  let paymentTypesSpy: SpyObj<PaymentTypeService>;
  let routerSpy: SpyObj<Router>;

  async function setup(
    charges: Record<string, unknown>[] = [PAID_CHARGE],
    transactions: Record<string, unknown>[] = [],
  ): Promise<void> {
    loansSpy = createSpyObj(['getLoansLoanId', 'postLoansLoanId']);
    transactionsSpy = createSpyObj([
      'getLoansLoanIdTransactionsTemplate',
      'postLoansLoanIdTransactions',
    ]);
    paymentTypesSpy = createSpyObj(['getPaymenttypes']);
    routerSpy = createSpyObj(['navigate']);

    loansSpy.getLoansLoanId.mockReturnValue(
      of({
        id: LOAN_ID,
        accountNo: 'L000456',
        clientName: 'Jane Smith',
        loanProductName: 'Micro Loan Product',
        charges,
        transactions,
      }) as never,
    );
    paymentTypesSpy.getPaymenttypes.mockReturnValue(
      of([{ id: 1, name: 'Cash', position: 1 }]) as never,
    );
    transactionsSpy.postLoansLoanIdTransactions.mockReturnValue(of({}) as never);

    await TestBed.configureTestingModule({
      imports: [LoanTransactionFormComponent],
      providers: [
        ...provideTranslateTesting(),
        provideIonicTesting(),
        { provide: LoansService, useValue: loansSpy },
        { provide: LoanTransactionsService, useValue: transactionsSpy },
        { provide: PaymentTypeService, useValue: paymentTypesSpy },
        {
          provide: NotificationService,
          useValue: createSpyObj<NotificationService>(['success', 'error']),
        },
        { provide: DialogService, useValue: createSpyObj<DialogService>(['confirm']) },
        { provide: Router, useValue: routerSpy },
        {
          provide: ActivatedRoute,
          useValue: {
            params: of({ loanId: String(LOAN_ID), type: 'chargeRefund' }),
            snapshot: { data: {} },
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanTransactionFormComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('loads only collected, non-installment charges and skips the unsupported template endpoint', async () => {
    await setup([
      PAID_CHARGE,
      { ...PAID_CHARGE, id: 78, amountPaid: 0 },
      {
        ...PAID_CHARGE,
        id: 79,
        chargeTimeType: { code: 'chargeTimeType.installmentFee', value: 'Installment fee' },
      },
    ]);

    expect(loansSpy.getLoansLoanId).toHaveBeenCalledWith(LOAN_ID, false, 'all');
    expect(transactionsSpy.getLoansLoanIdTransactionsTemplate).not.toHaveBeenCalled();
    expect(component.chargeOptions()).toEqual([PAID_CHARGE]);
    expect(component.chargeId()).toBe(PAID_CHARGE.id);
    expect(component.transaction.loanChargeId).toBe(PAID_CHARGE.id);
    expect(component.transaction.transactionAmount).toBe(PAID_CHARGE.amountPaid);
    expect(component.paymentTypeOptions()).toEqual([{ id: 1, name: 'Cash', position: 1 }]);
  });

  it('prefills the refundable amount when the user selects another paid charge', async () => {
    const secondCharge = { ...PAID_CHARGE, id: 88, name: 'Insurance fee', amountPaid: 40 };
    await setup([PAID_CHARGE, secondCharge]);

    const select = fixture.nativeElement.querySelector(
      '[data-testid="charge-refund-charge"]',
    ) as HTMLIonSelectElement;
    select.value = secondCharge.id;
    select.dispatchEvent(
      new CustomEvent('ionChange', { detail: { value: secondCharge.id }, bubbles: true }),
    );
    fixture.detectChanges();
    await fixture.whenStable();

    expect(component.transaction.loanChargeId).toBe(secondCharge.id);
    expect(component.transaction.transactionAmount).toBe(secondCharge.amountPaid);
  });

  it('prefills only the balance remaining after an earlier partial refund', async () => {
    await setup(
      [PAID_CHARGE],
      [
        {
          type: { code: 'loanTransactionType.chargeRefund' },
          loanChargePaidByList: [{ chargeId: PAID_CHARGE.id, amount: -40 }],
        },
      ],
    );

    expect(component.transaction.transactionAmount).toBe(85);
    expect(
      (
        fixture.nativeElement.querySelector(
          '[data-testid="charge-refund-charge"] ion-select-option',
        ) as HTMLElement
      ).textContent,
    ).toContain('85.00');
  });

  it('does not offer a fully refunded charge', async () => {
    await setup(
      [PAID_CHARGE],
      [
        {
          type: { code: 'loanTransactionType.chargeRefund' },
          loanChargePaidByList: [{ chargeId: PAID_CHARGE.id, amount: -125 }],
        },
      ],
    );

    expect(component.chargeOptions()).toEqual([]);
    expect(component.chargeId()).toBeNull();
  });

  it('posts the charge id with the shared transaction request', async () => {
    await setup();
    component.transaction.paymentTypeId = 1;

    component.onSubmit();

    expect(transactionsSpy.postLoansLoanIdTransactions).toHaveBeenCalledWith(
      LOAN_ID,
      {
        loanChargeId: PAID_CHARGE.id,
        transactionAmount: PAID_CHARGE.amountPaid,
        paymentTypeId: 1,
      },
      'chargeRefund',
    );
  });

  it('does not offer a date that Fineract would replace with its business date', async () => {
    await setup();

    expect(component.dateVisible).toBe(false);
    expect(
      fixture.nativeElement.querySelector('[data-testid="transactionDate-picker"]'),
    ).toBeNull();
  });

  it('does not post without a selected charge', async () => {
    await setup([]);

    component.onSubmit();

    expect(transactionsSpy.postLoansLoanIdTransactions).not.toHaveBeenCalled();
  });
});
