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
 * One continuous, video-recorded walkthrough: creating an office, a Progressive
 * loan product (with the payment allocation reorder), the product view/edit
 * round-trip, a Cumulative product, a client, then the full loan lifecycle
 * (apply -> approve -> disburse), the loan-account schedule-type badge, Custom
 * Fields, Collateral, Disbursement Details, Notes, and a repayment that is then
 * viewed and adjusted.
 *
 * Everything the demo shows is created through the UI, because demonstrating
 * those screens is the point. The only exceptions are the two things the app has
 * no screen for — registering a datatable against m_loan, and creating a
 * collateral *product* — which the `setup` project seeds over the API so the
 * Custom Fields and Collateral steps have something to work with.
 *
 * It runs in the normal suite as a real assertion, and can also be recorded as a
 * presentable demo:
 *
 *   npm run test:e2e:local -- e2e/full-demo.spec.ts            # fast, ~2 min
 *   DEMO_BEAT_MS=900 npm run test:e2e:local -- e2e/full-demo.spec.ts
 *
 * DEMO_BEAT_MS inserts a deliberate pause between steps so the recording is
 * watchable. It is cosmetic only: nothing below synchronises on it, so the spec
 * is equally correct with it unset. The recording lands in
 * test-results/*\/video.webm.
 */

import { test, expect, Page } from './fixtures';
import { login, uniqueSuffix } from './utils/fineract-login';
import { confirmDialog, ionSelect, menuItem, modalFor, selectTab } from './utils/ionic-locators';
import { captureJson } from './utils/capture-response';
import { selectOption } from './utils/select-option';

test.use({ video: 'on', trace: 'on' });

/** Cosmetic pacing for the recording; 0 (the default) makes every beat a no-op. */
const BEAT = Number(process.env.DEMO_BEAT_MS ?? 0);
const beat = (page: Page): Promise<void> =>
  BEAT ? page.waitForTimeout(BEAT) : Promise.resolve(undefined);

const LOAN_SCHEDULE_TYPE_LABEL = 'Loan Schedule Type';
const INTEREST_RATE_LABEL = 'Interest Rate';
const NUMBER_OF_REPAYMENTS_LABEL = 'Number of Repayments';
const REPAYMENT_EVERY_LABEL = 'Repayment Every';

/**
 * The loan product form's selects are filled from GET /loanproducts/template.
 * Wait for the options to exist rather than for one particular strategy name:
 * the default is whatever the instance happens to list first, and the name also
 * matches the select's own display text, which makes it ambiguous.
 */
async function waitForProductTemplate(page: Page): Promise<void> {
  await expect(
    ionSelect(page, 'Repayment Strategy').locator('ion-select-option').first(),
  ).toBeAttached({ timeout: 15000 });
}

test.describe('Full feature demo recording', () => {
  test('walk through loan schedule type, lifecycle, custom fields, collateral, and disbursement', async ({
    page,
  }) => {
    // Every screen in the walkthrough is driven through the UI, so this is a long
    // test by design: two loan products, an office, a client, the loan lifecycle,
    // and six loan-view tabs.
    test.setTimeout(BEAT ? 600000 : 360000);

    await login(page);

    // 1. Create a branch office, so later screens have more than one to pick from.
    const officeSuffix = uniqueSuffix();
    const officeName = `Demo Branch ${officeSuffix}`;
    await page.goto('/organization/offices/create');
    await page.getByRole('textbox', { name: 'Office Name' }).fill(officeName);
    await selectOption(page, 'Parent Office', 'Head Office');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/organization\/offices$/, { timeout: 15000 });
    // The list paginates at 10 rows and accumulates offices across runs, so the
    // new one is not necessarily on the first page — search for it by name.
    await page.getByPlaceholder('Type to search...').fill(officeName);
    await expect(page.getByRole('row', { name: new RegExp(officeName) })).toBeVisible({
      timeout: 15000,
    });
    await beat(page);

    // 2. Loan Products list. Only the column is asserted here: on a freshly
    //    migrated Fineract there are no products yet, and this walkthrough is the
    //    thing that creates them. The badge itself is asserted in step 4, on the
    //    specific row the demo just created, which is the stronger check anyway.
    await page.goto('/products/loan');
    await expect(page.getByRole('columnheader', { name: LOAN_SCHEDULE_TYPE_LABEL })).toBeVisible();
    await beat(page);

    // 3. Create a Progressive loan product with a payment allocation reorder
    await page.goto('/products/loan/create');
    await waitForProductTemplate(page);

    const progSuffix = uniqueSuffix();
    const progressiveProductName = `Demo Progressive ${progSuffix}`;
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(progressiveProductName);
    await page
      .getByRole('textbox', { name: 'Short Name' })
      .fill(progSuffix.slice(-4).toUpperCase());
    await page.getByRole('spinbutton', { name: 'Principal' }).fill('5000');
    await page.getByRole('spinbutton', { name: INTEREST_RATE_LABEL }).fill('12');
    await page.getByRole('spinbutton', { name: NUMBER_OF_REPAYMENTS_LABEL }).fill('6');
    await page.getByRole('spinbutton', { name: REPAYMENT_EVERY_LABEL }).fill('1');

    await selectOption(page, LOAN_SCHEDULE_TYPE_LABEL, 'Progressive');
    // Progressive forces the advanced-payment-allocation strategy, so the field
    // locks. ion-select carries `disabled` only as a JS property — there is no
    // disabled/aria-disabled attribute on the host for toBeDisabled() to read.
    await expect(ionSelect(page, 'Repayment Strategy')).toHaveJSProperty('disabled', true);
    // A disabled control that does not say why is a dead end for anyone who does not already
    // know the rule, so the form states it in plain language next to the field.
    await expect(page.getByTestId('strategy-locked-note')).toBeVisible();
    await expect(ionSelect(page, 'Loan Schedule Processing Type')).toBeVisible();

    const firstOrderItem = page.locator('.allocation-order-list ion-item').first();
    const orderBefore = await firstOrderItem.textContent();
    await firstOrderItem.getByRole('button').nth(1).click(); // reorder
    await expect(firstOrderItem).not.toHaveText(orderBefore ?? '');
    await beat(page);

    // Down payment and tranche disbursement. Down payment is a progressive-engine capability, so
    // the control appears only now that the schedule type is Progressive; on a Cumulative product
    // the form says so in its place rather than silently omitting the setting.
    await page.getByTestId('loan-product-enable-down-payment').click();
    await page.getByTestId('loan-product-down-payment-percentage').locator('input').fill('20');
    await expect(page.getByTestId('loan-product-auto-repayment-down-payment')).toBeVisible();
    await beat(page);

    await page.getByTestId('loan-product-multi-disburse').click();
    await page.getByTestId('loan-product-max-tranche-count').locator('input').fill('3');
    await beat(page);

    // Income recognition: spread fee or interest income across the term rather than booking it
    // at once, and let a third party buy down the borrower's rate. Both are progressive-engine
    // capabilities, and both are what the Buy-Down Fees and Capitalised Income tabs on the loan
    // account read — until they were settable here, those tabs could never appear.
    await page.getByTestId('loan-product-enable-income-capitalization').click();
    await expect(page.getByTestId('loan-product-capitalized-income-type')).toBeVisible();
    await page.getByTestId('loan-product-enable-buy-down-fee').click();
    await expect(page.getByTestId('loan-product-buy-down-fee-income-type')).toBeVisible();
    await beat(page);

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/products\/loan$/, { timeout: 15000 });

    // 4. View and edit the new Progressive product
    await page.getByPlaceholder('Type to search...').fill(progressiveProductName);
    const progressiveRow = page.getByRole('row', { name: new RegExp(progressiveProductName) });
    await expect(progressiveRow).toBeVisible({ timeout: 15000 });
    await expect(progressiveRow.locator('ion-badge')).toHaveText('Progressive');

    await progressiveRow.getByRole('button', { name: 'View' }).click();
    await expect(page).toHaveURL(/\/products\/loan\/view\/\d+$/);
    await expect(page.getByText('Advanced payment allocation strategy').first()).toBeVisible();
    await beat(page);

    await page.getByRole('button', { name: 'Edit' }).click();
    await expect(page).toHaveURL(/\/products\/loan\/edit\/\d+$/);
    await expect(ionSelect(page, LOAN_SCHEDULE_TYPE_LABEL)).toHaveText(/Progressive/);
    await beat(page);

    // 5. Create a Cumulative loan product for the lifecycle walkthrough
    await page.goto('/products/loan/create');
    await waitForProductTemplate(page);

    // The same section on a Cumulative product: the down payment control is replaced by an
    // explanation of where the setting lives, rather than simply not being there.
    await expect(page.getByTestId('down-payment-unavailable-note')).toBeVisible();
    await expect(page.getByTestId('loan-product-enable-down-payment')).toHaveCount(0);
    await expect(page.getByTestId('loan-product-enable-income-capitalization')).toHaveCount(0);
    await expect(page.getByTestId('loan-product-enable-buy-down-fee')).toHaveCount(0);
    await beat(page);

    const cumSuffix = uniqueSuffix();
    const cumulativeProductName = `Demo Cumulative ${cumSuffix}`;
    await page.getByRole('textbox', { name: 'Name', exact: true }).fill(cumulativeProductName);
    await page.getByRole('textbox', { name: 'Short Name' }).fill(cumSuffix.slice(-4).toUpperCase());
    await page.getByRole('spinbutton', { name: 'Principal' }).fill('1000');
    await page.getByRole('spinbutton', { name: INTEREST_RATE_LABEL }).fill('10');
    await page.getByRole('spinbutton', { name: NUMBER_OF_REPAYMENTS_LABEL }).fill('3');
    await page.getByRole('spinbutton', { name: REPAYMENT_EVERY_LABEL }).fill('1');

    // Interest recalculation charges interest on what the borrower actually owes rather than on
    // the planned balance. It applies to both engines, and its dependent fields follow the chain
    // the API documents: the mandatory three appear with the toggle, and each interval appears
    // only when its frequency is something other than the repayment period.
    await page.getByTestId('loan-product-interest-recalculation').click();
    await expect(page.getByTestId('loan-product-compounding-method')).toBeVisible();
    await expect(page.getByTestId('loan-product-reschedule-strategy')).toBeVisible();
    // No interval: the seeded rest frequency is the repayment period, which needs none.
    await expect(page.getByTestId('loan-product-rest-interval')).toHaveCount(0);
    // Fineract only supports recalculation with daily interest calculation, so the form fixes
    // that field and says why rather than letting the server reject the product.
    await expect(page.getByTestId('interest-calc-period-locked-note')).toBeVisible();
    await beat(page);

    // Turned back off before saving. This product is the one the rest of the walkthrough lends
    // against, and a recalculating product constrains every loan created from it — the demo is
    // here to show the controls, not to change the product ten later steps depend on.
    await page.getByTestId('loan-product-interest-recalculation').click();
    await expect(page.getByTestId('interest-calc-period-locked-note')).toHaveCount(0);
    await beat(page);

    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/products\/loan$/, { timeout: 15000 });

    // 6. Create a client, in the office created above
    await page.goto('/clients/create', { waitUntil: 'networkidle' });
    await selectOption(page, 'Office', officeName);
    await page.getByRole('button', { name: 'Next' }).click();
    const clientSuffix = uniqueSuffix();
    const firstName = `DemoClient${clientSuffix}`;
    await page.getByRole('textbox', { name: 'First Name' }).fill(firstName);
    await page.getByRole('textbox', { name: 'Last Name' }).fill('Tester');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/clients$/, { timeout: 15000 });
    await beat(page);

    // 7. Create the loan application
    await page.goto('/loans/create', { waitUntil: 'networkidle' });
    // app-client-search is a custom autocomplete, not an ion-select: it renders
    // its hits as ion-items in an inline list, so there is no overlay to query.
    // Retried because a just-created client is not always returned by the search
    // endpoint on the first call.
    const clientSearch = page.getByRole('textbox', { name: 'Client ID' });
    const clientOption = page
      .getByTestId('client-search-results')
      .locator('ion-item')
      .filter({ hasText: firstName });
    await expect(async () => {
      await clientSearch.fill('');
      await clientSearch.fill(firstName);
      await expect(clientOption).toBeVisible({ timeout: 3000 });
    }).toPass({ timeout: 20000, intervals: [1000, 2000, 3000] });
    await clientOption.click();

    await selectOption(page, 'Loan Product', cumulativeProductName);
    await expect(page.getByText(/Loan Schedule Type:\s*Cumulative/)).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('spinbutton', { name: 'Principal', exact: true }).fill('1000');
    await page.getByRole('spinbutton', { name: 'Term Frequency' }).fill('3');
    await selectOption(page, 'Term Type', 'Months');
    await page.getByRole('spinbutton', { name: NUMBER_OF_REPAYMENTS_LABEL }).fill('3');
    await page.getByRole('spinbutton', { name: REPAYMENT_EVERY_LABEL }).fill('1');
    await selectOption(page, 'Frequency', 'Months');
    await page.getByRole('spinbutton', { name: INTEREST_RATE_LABEL }).fill('10');
    await selectOption(page, 'Interest Type', 'Declining Balance');
    await selectOption(page, 'Amortization Type', 'Equal Installments');
    await selectOption(page, 'Interest Calculation Period Type', 'Same as repayment period');

    const created = await captureJson<{ loanId: number }>(page, /\/loans$/, 'POST', () =>
      page.getByRole('button', { name: 'Save' }).click(),
    );
    const loanId = created.loanId;

    // 8. Approve and disburse
    await page.goto(`/loans/view/${loanId}`);
    await expect(page.getByText('Submitted and pending approval')).toBeVisible({
      timeout: 15000,
    });
    await page.getByRole('button', { name: 'Approve' }).click();
    await expect(page).toHaveURL(/\/products\/loan\/\d+\/action\/approve$/);
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(new RegExp(`/loans/view/${loanId}$`), { timeout: 15000 });
    await expect(page.getByText('Approved', { exact: true })).toBeVisible({ timeout: 15000 });
    await beat(page);

    await page.getByRole('button', { name: 'Disburse' }).click();
    await expect(page).toHaveURL(new RegExp(`/loans/${loanId}/transactions/disburse$`));
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/loans$/, { timeout: 15000 });

    // 9. Loan view: schedule type badge on the account itself
    await page.goto(`/loans/view/${loanId}`);
    await expect(page.getByText('Active', { exact: true })).toBeVisible({ timeout: 15000 });
    await expect(page.getByText(/Loan Schedule Type:\s*Cumulative/)).toBeVisible();
    // The two engines are kept apart on the account screen too: buy-down fees and capitalised
    // income belong to the progressive engine, so this cumulative loan must not offer them.
    // They would otherwise render as tabs that can never hold anything.
    await expect(page.locator('ion-segment-button', { hasText: 'Buy-Down Fees' })).toHaveCount(0);
    await expect(page.locator('ion-segment-button', { hasText: 'Capitalized Income' })).toHaveCount(
      0,
    );
    await beat(page);

    // 10. Custom Fields tab: add an entry through the dialog. The datatable this
    // needs is registered by the setup project; without one the tab renders an
    // empty state and this step would silently pass while doing nothing.
    await selectTab(page, /Custom Fields/i);
    const addEntry = page.getByRole('button', { name: /Add Entry/i }).first();
    await expect(addEntry).toBeVisible({ timeout: 15000 });
    await addEntry.click();

    const entryDialog = modalFor(page, 'app-datatable-entry-dialog');
    await expect(entryDialog).toBeVisible();
    const remark = 'Recorded via full demo walkthrough';
    await entryDialog.getByRole('textbox').first().fill(remark);
    await Promise.all([
      page.waitForResponse(
        (res) => res.url().includes('/datatables/') && res.request().method() === 'POST',
      ),
      entryDialog.getByRole('button', { name: 'Save' }).click(),
    ]);
    await expect(entryDialog).toHaveCount(0);
    await expect(page.getByText(remark)).toBeVisible({ timeout: 15000 });
    await beat(page);

    // 11. Collateral: the list, then the Add Collateral form. The collateral
    // product the dropdown offers is seeded by the setup project.
    await page.goto(`/loans/${loanId}/collateral`);
    await page
      .getByRole('button', { name: /Create|Add/i })
      .first()
      .click();
    await expect(page).toHaveURL(new RegExp(`/loans/${loanId}/collateral/create$`));
    await expect(ionSelect(page, 'Type').locator('ion-select-option').first()).toBeAttached({
      timeout: 15000,
    });
    await beat(page);

    // 12. Disbursement Details tab
    await page.goto(`/loans/view/${loanId}`);
    await selectTab(page, /Disbursement Details/i);
    await expect(page.getByText(/Disbursement/i).first()).toBeVisible();
    await beat(page);

    // 13. Notes tab: an append-only audit trail entry
    await selectTab(page, 'Notes');
    const noteText = 'Recorded via full demo walkthrough';
    await page.locator('textarea[name="newNote"]').fill(noteText);
    await Promise.all([
      page.waitForResponse(
        (res) => /\/loans\/\d+\/notes/.test(res.url()) && res.request().method() === 'POST',
      ),
      page.getByRole('button', { name: 'Save' }).click(),
    ]);
    await expect(page.getByText(noteText).first()).toBeVisible({ timeout: 15000 });
    await beat(page);

    // 14. Record a repayment, then view and adjust that transaction.
    await page.getByRole('button', { name: 'Repayment' }).click();
    await expect(page).toHaveURL(new RegExp(`/loans/${loanId}/transactions/repayment$`));
    // The transaction date prefills from the loan template. It renders as an
    // ion-datetime behind an ion-datetime-button, which has no native <input>,
    // so there is nothing to fill — only the amount needs setting.
    await page.locator('input[name="transactionAmount"]').fill('100');
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL(/\/loans$/, { timeout: 15000 });

    await page.goto(`/loans/view/${loanId}`);
    await selectTab(page, 'Transactions');
    const repaymentRow = page.getByRole('row', { name: /Repayment/ }).first();
    await expect(repaymentRow).toBeVisible({ timeout: 10000 });
    // Click the ion-button, not the ion-icon inside it: the button's shadow-DOM
    // native element sits above the icon and swallows the pointer event.
    await repaymentRow.locator('ion-button:has(ion-icon[name="eye-outline"])').click();

    const txDialog = modalFor(page, 'app-transaction-detail-dialog');
    await expect(txDialog).toBeVisible();
    await expect(txDialog.getByText('$100.00').first()).toBeVisible({ timeout: 15000 });
    await beat(page);

    await txDialog.getByRole('button', { name: 'Adjust Transaction' }).click();
    await txDialog.locator('input[name="adjustAmount"]').fill('75');
    await txDialog
      .locator('textarea[name="adjustNote"]')
      .fill('Corrected mis-entered repayment amount');
    await beat(page);
    await txDialog.getByRole('button', { name: 'Adjust Transaction' }).click();

    const confirm = confirmDialog(page);
    await expect(confirm.getByText(/reverse the original transaction/i)).toBeVisible();
    await beat(page);
    const [adjustResponse] = await Promise.all([
      page.waitForResponse(
        (res) => /\/transactions\/\d+$/.test(res.url()) && res.request().method() === 'POST',
      ),
      confirm.getByRole('button', { name: 'Confirm' }).click(),
    ]);
    expect(adjustResponse.ok()).toBeTruthy();

    // 15. Actions menu: the full set of loan lifecycle actions
    await page.goto(`/loans/view/${loanId}`);
    await page.getByRole('button', { name: 'Actions' }).click();
    // Popover entries are ion-items exposing role="listitem", not "menuitem".
    await expect(menuItem(page, 'Undo Disbursal')).toBeVisible();
    await beat(page);
    await page.keyboard.press('Escape');
  });
});
