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

import { isRefundableLoanCharge, refundableChargeAmount } from './loan-charge-refund';

describe('loan charge refund helpers', () => {
  it('offers a paid, non-installment charge and exposes its refundable amount', () => {
    const charge = {
      id: 7,
      amountPaid: 125,
      chargeTimeType: { code: 'chargeTimeType.specifiedDueDate', value: 'Specified due date' },
    };

    expect(isRefundableLoanCharge(charge)).toBe(true);
    expect(refundableChargeAmount(charge)).toBe(125);
  });

  it('subtracts previous non-reversed refunds from the refundable balance', () => {
    const charge = {
      id: 7,
      amountPaid: 125,
      chargeTimeType: { code: 'chargeTimeType.specifiedDueDate', value: 'Specified due date' },
    };
    const transactions = [
      {
        type: { code: 'loanTransactionType.chargeRefund' },
        loanChargePaidByList: [{ chargeId: 7, amount: -40 }],
      },
      {
        type: { code: 'loanTransactionType.chargeRefund' },
        manuallyReversed: true,
        loanChargePaidByList: [{ chargeId: 7, amount: -25 }],
      },
    ];

    expect(refundableChargeAmount(charge, transactions)).toBe(85);
    expect(isRefundableLoanCharge(charge, transactions)).toBe(true);
  });

  it('withholds a charge after its collected amount has been fully refunded', () => {
    const charge = {
      id: 7,
      amountPaid: 125,
      chargeTimeType: { code: 'chargeTimeType.specifiedDueDate', value: 'Specified due date' },
    };
    const transactions = [
      {
        type: { code: 'loanTransactionType.chargeRefund' },
        loanChargePaidByList: [{ chargeId: 7, amount: -125 }],
      },
    ];

    expect(refundableChargeAmount(charge, transactions)).toBe(0);
    expect(isRefundableLoanCharge(charge, transactions)).toBe(false);
  });

  it('rounds each refund in the charge currency before comparing the balance', () => {
    const charge = {
      id: 7,
      amountPaid: 0.07,
      currency: { decimalPlaces: 2 },
      chargeTimeType: { code: 'chargeTimeType.specifiedDueDate', value: 'Specified due date' },
    };
    const transactions = [
      {
        type: { code: 'loanTransactionType.chargeRefund' },
        loanChargePaidByList: [{ chargeId: 7, amount: -0.01 }],
      },
      {
        type: { code: 'loanTransactionType.chargeRefund' },
        loanChargePaidByList: [{ chargeId: 7, amount: -0.06 }],
      },
    ];

    expect(refundableChargeAmount(charge, transactions)).toBe(0);
    expect(isRefundableLoanCharge(charge, transactions)).toBe(false);
  });

  it('withholds an unpaid charge', () => {
    expect(
      isRefundableLoanCharge({
        id: 8,
        amountPaid: 0,
        chargeTimeType: { code: 'chargeTimeType.specifiedDueDate', value: 'Specified due date' },
      }),
    ).toBe(false);
  });

  it('withholds an installment charge until the form can identify an installment', () => {
    expect(
      isRefundableLoanCharge({
        id: 9,
        amountPaid: 50,
        chargeTimeType: { code: 'chargeTimeType.installmentFee', value: 'Installment fee' },
      }),
    ).toBe(false);
  });
});
