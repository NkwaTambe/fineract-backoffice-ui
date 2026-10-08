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

import type { GetLoansLoanIdLoanChargeData, GetLoansLoanIdTransactions } from '../../api';

/**
 * Amount from a charge that has not already been refunded.
 *
 * `amountPaid` is the lifetime amount collected; Fineract keeps prior refunds as negative
 * charge-paid-by entries on charge-refund transactions. The backend validates against the
 * difference between those values, so the UI must calculate the same balance before offering
 * the charge or pre-filling the form.
 */
export function refundableChargeAmount(
  charge: GetLoansLoanIdLoanChargeData,
  transactions: readonly GetLoansLoanIdTransactions[] = [],
): number {
  if (charge.id == null) return 0;
  const scale = 10 ** Math.max(0, charge.currency?.decimalPlaces ?? 2);

  const refundedUnits = transactions.reduce((transactionTotal, transaction) => {
    if (
      transaction.type?.code !== 'loanTransactionType.chargeRefund' ||
      transaction.manuallyReversed === true
    ) {
      return transactionTotal;
    }

    return (
      transactionTotal +
      (transaction.loanChargePaidByList ?? []).reduce((chargeTotal, paidBy) => {
        if (paidBy.chargeId !== charge.id || (paidBy.amount ?? 0) >= 0) return chargeTotal;
        return chargeTotal + Math.round(-(paidBy.amount ?? 0) * scale);
      }, 0)
    );
  }, 0);

  const paidUnits = Math.round((charge.amountPaid ?? 0) * scale);
  return Math.max(0, paidUnits - refundedUnits) / scale;
}

/**
 * Whether the shared charge-refund form can safely offer this charge.
 *
 * Installment fees require both `loanChargeId` and either `installmentNumber` or `dueDate`.
 * The shared form does not collect those installment selectors yet, so offering one would only
 * produce a backend validation error. Charges with nothing collected are excluded because the
 * refundable amount is zero.
 */
export function isRefundableLoanCharge(
  charge: GetLoansLoanIdLoanChargeData,
  transactions: readonly GetLoansLoanIdTransactions[] = [],
): boolean {
  const type = `${charge.chargeTimeType?.code ?? ''} ${charge.chargeTimeType?.value ?? ''}`
    .toLowerCase()
    .trim();
  const isInstallmentCharge =
    type.includes('installment') || !!charge.installmentChargeData?.length;
  return (
    charge.id != null && !isInstallmentCharge && refundableChargeAmount(charge, transactions) > 0
  );
}
