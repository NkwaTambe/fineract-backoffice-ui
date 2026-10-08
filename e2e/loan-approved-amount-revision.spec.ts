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

/**
 * `PUT .../approved-amount` and `PUT .../available-disbursement-amount` against a real
 * Fineract — #284. The mocked spec (`loan-servicing-gaps.spec.ts`) pins the request bodies;
 * this is the one that proves the platform actually accepts them and that the screen reflects
 * the new figure afterwards, mirroring the acceptance scenario in `apache/fineract`'s own
 * `LoanUpdateApprovedAmount.feature`: revise the approved amount on a loan that is already
 * disbursed, not only on one still waiting.
 */

import { test, expect, recordingTimeout, Page } from './fixtures';
import { login } from './utils/fineract-login';
import { createActiveLoan } from './utils/create-active-loan';
import { createApiContext, seedPartiallyDisbursedLoan } from './utils/seed-api';
import { menuItem, modalFor } from './utils/ionic-locators';

/**
 * A loan approved for 1000 and disbursed only 400 of it — the starting point UC3 in
 * `apache/fineract`'s own `LoanUpdateApprovedAmount.feature` uses. `createActiveLoan` disburses
 * the whole amount, which leaves nothing this revision could legally change (see the comment on
 * `seedPartiallyDisbursedLoan`).
 */
async function openPartiallyDisbursedLoan(page: Page): Promise<number> {
  const api = await createApiContext();
  try {
    const { loanId } = await seedPartiallyDisbursedLoan(api, 400);
    await page.goto(`/loans/view/${loanId}`);
    await expect(page.getByText('Active', { exact: true })).toBeVisible({ timeout: 15000 });
    return loanId;
  } finally {
    await api.dispose();
  }
}

/**
 * Both revision commands respond with `changes`, not the loan itself, so the screen still has
 * to reload the loan afterward to reflect the new figure — `onReviseApprovedAmount` and
 * `onReviseAvailableDisbursementAmount` both fire that reload themselves, but do not await it.
 * Reopening the dialog immediately after the confirm click races that reload, so this waits on
 * the GET it issues before the caller looks at anything the reload would have changed.
 */
function waitForLoanReload(page: Page, loanId: number): Promise<unknown> {
  return page.waitForResponse(
    (response) =>
      new RegExp(`/loans/${loanId}(\\?|$)`).test(response.url()) &&
      response.request().method() === 'GET',
  );
}

test.describe('Loan approved and available-disbursement amount revision', () => {
  test('revises the approved amount on an active, partially-disbursed loan', async ({ page }) => {
    test.setTimeout(recordingTimeout(120000));
    await login(page);
    const loanId = await openPartiallyDisbursedLoan(page);

    await page.getByRole('button', { name: 'Actions' }).click();
    await menuItem(page, 'Revise Approved Amount').click();

    const dialog = modalFor(page, 'app-loan-approved-amount-dialog');
    await expect(dialog).toBeVisible();
    // The current amount is shown for context — the loan was seeded with a principal of 1000.
    await expect(dialog).toContainText('1000');

    const reloaded = waitForLoanReload(page, loanId);
    await dialog.getByTestId('loan-approved-amount-input').fill('900');
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(dialog).toHaveCount(0);
    await reloaded;

    // The figure the platform now holds, not the one the dialog was opened with — proving the
    // confirm round-tripped through the real backend and the screen reloaded from it, rather
    // than merely echoing back what was typed.
    await page.getByRole('button', { name: 'Actions' }).click();
    await menuItem(page, 'Revise Approved Amount').click();
    await expect(modalFor(page, 'app-loan-approved-amount-dialog')).toContainText('900');
  });

  test('revises the available disbursement amount, which also changes the approved amount', async ({
    page,
  }) => {
    test.setTimeout(recordingTimeout(120000));
    await login(page);
    const loanId = await openPartiallyDisbursedLoan(page);

    await page.getByRole('button', { name: 'Actions' }).click();
    await menuItem(page, 'Revise Available Disbursement Amount').click();

    const dialog = modalFor(page, 'app-loan-available-disbursement-amount-dialog');
    await expect(dialog).toBeVisible();

    // 400 was disbursed out of 1000 approved, leaving 600 available to still draw. Lowering
    // that to 200 is what lets a branch close off most of the undrawn balance of a facility
    // without rebuilding the loan — the case #284 names.
    const reloaded = waitForLoanReload(page, loanId);
    await dialog.getByTestId('loan-available-disbursement-amount-input').fill('200');
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(dialog).toHaveCount(0);
    await reloaded;

    // The platform's own semantics (verified live): lowering the available-disbursement amount
    // by 400 (600 -> 200) lowers the approved amount by the same 400, from 1000 to 600.
    await page.getByRole('button', { name: 'Actions' }).click();
    await menuItem(page, 'Revise Approved Amount').click();
    await expect(modalFor(page, 'app-loan-approved-amount-dialog')).toContainText('600');
  });

  test('shows the platform’s own refusal, not a generic validation message', async ({ page }) => {
    test.setTimeout(recordingTimeout(120000));
    await login(page);
    await createActiveLoan(page);

    await page.getByRole('button', { name: 'Actions' }).click();
    await menuItem(page, 'Revise Approved Amount').click();

    const dialog = modalFor(page, 'app-loan-approved-amount-dialog');
    // Above the applied principal of 1000 — the platform refuses this, not this dialog. The
    // dialog itself only collects the amount and dismisses; the request (and its refusal)
    // happen in the loan-view screen underneath, exactly as for every other command dialog
    // here (undo-approval, disburse-to-savings, ...), so the modal closes regardless.
    await dialog.getByTestId('loan-approved-amount-input').fill('5000');
    await dialog.getByRole('button', { name: 'Confirm' }).click();
    await expect(dialog).toHaveCount(0);

    // Confirmed live: the reason sits one level deeper than Fineract's usual validation body
    // (see the unwrapping fix in error.interceptor.ts) — without it this toast would read only
    // "Validation errors exist.". The platform's own message is this dotted globalisation-style
    // string, not prose — still far more useful than the generic wrapper alone.
    await expect(page.locator('ion-toast.error-toast')).toContainText(
      "can't.be.greater.than.maximum.applied.loan.amount",
    );
  });
});
