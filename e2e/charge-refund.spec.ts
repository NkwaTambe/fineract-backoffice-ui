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

import { expect, Page, test } from './fixtures';
import { selectOption } from './utils/select-option';

const TENANT = 'default';
const USER = 'mifos';
const PASSWORD = 'password';
const HEAD_OFFICE = 'Head Office';
const LOAN_ID = 456;

interface PostedCommand {
  command: string | null;
  body: Record<string, unknown>;
}

function loan() {
  return {
    id: LOAN_ID,
    accountNo: 'L000456',
    clientId: 1,
    clientName: 'Jane Smith',
    loanProductName: 'Micro Loan Product',
    principal: 5000,
    annualInterestRate: 12,
    status: { id: 300, code: 'loanStatusType.active', value: 'Active', active: true },
    currency: { code: 'USD', displaySymbol: '$' },
    summary: { principalOutstanding: 5000, totalOutstanding: 5000 },
    repaymentSchedule: { periods: [] },
    charges: [
      {
        id: 77,
        name: 'Documentation fee',
        amountPaid: 125,
        chargeTimeType: { code: 'chargeTimeType.specifiedDueDate', value: 'Specified due date' },
      },
      {
        id: 88,
        name: 'Insurance fee',
        amountPaid: 50,
        chargeTimeType: { code: 'chargeTimeType.specifiedDueDate', value: 'Specified due date' },
      },
    ],
    transactions: [
      {
        id: 901,
        type: { code: 'loanTransactionType.chargeRefund', value: 'Charge Refund' },
        manuallyReversed: false,
        loanChargePaidByList: [{ chargeId: 77, amount: -40 }],
      },
    ],
  };
}

async function signIn(page: Page): Promise<void> {
  await page.route('**/api/v1/**', async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/config.json*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fineractApiUrl: '/api/v1', defaultTenant: TENANT }),
    });
  });
  await page.route('**/api/v1/authentication**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: USER,
        userId: 1,
        base64EncodedAuthenticationKey: 'YmFzZTY0',
        authenticated: true,
        officeId: 1,
        officeName: HEAD_OFFICE,
        roles: [{ id: 1, name: 'Super User', description: 'Super user' }],
        permissions: ['ALL_FUNCTIONS'],
      }),
    });
  });
  await page.route('**/api/v1/businessdate**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ type: 'BUSINESS_DATE', date: [2026, 9, 28] }]),
    });
  });

  await page.goto('/login');
  await page.locator('#tenantId').fill(TENANT);
  await page.locator('#username').fill(USER);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/dashboard');
}

test.use({ video: 'on' });

test('refunds the remaining balance of a collected loan charge', async ({ page }, testInfo) => {
  const commands: PostedCommand[] = [];
  const pageErrors: string[] = [];
  page.on('pageerror', (error) => pageErrors.push(error.message));

  await signIn(page);
  await page.route(
    new RegExp(`/api/v1/loans/${LOAN_ID}/transactions(?:\\?.*)?$`),
    async (route) => {
      commands.push({
        command: new URL(route.request().url()).searchParams.get('command'),
        body: route.request().postDataJSON() as Record<string, unknown>,
      });
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ loanId: LOAN_ID, resourceId: 902 }),
      });
    },
  );
  await page.route(new RegExp(`/api/v1/loans/${LOAN_ID}(?:\\?.*)?$`), async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(loan()),
    });
  });
  await page.route('**/api/v1/paymenttypes**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ id: 1, name: 'Cash', position: 1 }]),
    });
  });
  await page.route(
    /\/api\/v1\/loans\/\d+\/(delinquencytags|delinquency-actions)/,
    async (route) => {
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    },
  );

  await page.goto(`/loans/view/${LOAN_ID}`);
  await expect(page.getByRole('heading', { name: 'Micro Loan Product' })).toBeVisible();

  await page.locator('#loanMenu-trigger').click();
  const refundAction = page.getByTestId('loan-charge-refund-action');
  await expect(refundAction).toBeVisible();
  await refundAction.scrollIntoViewIfNeeded();
  await page.mouse.move(20, 20);
  const menuScreenshot = testInfo.outputPath('charge-refund-menu.png');
  await page.screenshot({ path: menuScreenshot, fullPage: true });
  await testInfo.attach('charge refund action', {
    path: menuScreenshot,
    contentType: 'image/png',
  });

  await refundAction.click();
  await expect(page).toHaveURL(new RegExp(`/loans/${LOAN_ID}/transactions/chargeRefund$`));
  await expect(
    page.locator('ion-card-title').getByText('Charge Refund', { exact: true }),
  ).toBeVisible();
  await expect(page.getByTestId('transactionDate-picker')).toHaveCount(0);

  await selectOption(page, 'Charge to refund', 'Documentation fee — 85.00');
  await expect(page.getByRole('spinbutton', { name: 'Transaction Amount' })).toHaveValue('85');
  await selectOption(page, 'Payment Type', 'Cash');
  await page.getByRole('spinbutton', { name: 'Transaction Amount' }).fill('30');

  const formScreenshot = testInfo.outputPath('charge-refund-form.png');
  await page.screenshot({ path: formScreenshot, fullPage: true });
  await testInfo.attach('charge refund form', {
    path: formScreenshot,
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: 'Save' }).click();
  await expect(page).toHaveURL('/loans');
  expect(pageErrors).toEqual([]);
  expect(commands).toEqual([
    {
      command: 'chargeRefund',
      body: {
        loanChargeId: 77,
        paymentTypeId: 1,
        transactionAmount: 30,
      },
    },
  ]);
});
