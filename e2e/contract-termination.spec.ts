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

const TENANT = 'default';
const USER = 'mifos';
const PASSWORD = 'password';
const HEAD_OFFICE = 'Head Office';
const LOAN_ID = 456;

interface PostedCommand {
  command: string | null;
  body: Record<string, unknown>;
}

function loan(terminated: boolean) {
  return {
    id: LOAN_ID,
    accountNo: 'L000456',
    clientId: 1,
    clientName: 'Jane Smith',
    loanProductName: 'Progressive Demo Product',
    principal: 5000,
    annualInterestRate: 12,
    loanScheduleType: { code: 'PROGRESSIVE', value: 'Progressive' },
    status: { id: 300, code: 'loanStatusType.active', value: 'Active', active: true },
    chargedOff: false,
    subStatus: terminated
      ? {
          id: 900,
          code: 'loanSubStatus.contractTermination',
          value: 'Contract Termination',
        }
      : { id: 0, code: 'loanSubStatus.none', value: 'None' },
    currency: { code: 'USD', displaySymbol: '$' },
    summary: { principalOutstanding: 5000, totalOutstanding: 5000 },
    repaymentSchedule: { periods: [] },
    transactions: [],
    charges: [],
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
      body: JSON.stringify([{ type: 'BUSINESS_DATE', date: [2026, 9, 27] }]),
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

test('terminates and undoes a progressive loan contract', async ({ page }, testInfo) => {
  let terminated = false;
  const commands: PostedCommand[] = [];

  await signIn(page);
  await page.route(new RegExp(`/api/v1/loans/${LOAN_ID}(?:\\?.*)?$`), async (route) => {
    if (route.request().method() === 'POST') {
      const url = new URL(route.request().url());
      const command = url.searchParams.get('command');
      commands.push({
        command,
        body: route.request().postDataJSON() as Record<string, unknown>,
      });
      terminated = command === 'contractTermination';
    }

    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(loan(terminated)),
    });
  });

  await page.goto(`/loans/view/${LOAN_ID}`);
  await expect(page.getByRole('heading', { name: 'Progressive Demo Product' })).toBeVisible();

  await page.locator('#loanMenu-trigger').click();
  const terminateAction = page.getByTestId('loan-contract-termination-action');
  await expect(terminateAction).toBeVisible();
  await expect(page.getByTestId('loan-undo-contract-termination-action')).toHaveCount(0);
  await terminateAction.scrollIntoViewIfNeeded();
  await page.mouse.move(20, 20);
  const menuScreenshot = testInfo.outputPath('contract-termination-menu.png');
  await page.screenshot({ path: menuScreenshot, fullPage: true });
  await testInfo.attach('eligible contract termination action', {
    path: menuScreenshot,
    contentType: 'image/png',
  });

  await terminateAction.click();
  await expect(page).toHaveURL(new RegExp(`/loans/${LOAN_ID}/transactions/contractTermination$`));
  await page
    .locator('ion-textarea[name="note"] textarea')
    .fill('Progressive contract ended after customer default');
  const formScreenshot = testInfo.outputPath('contract-termination-form.png');
  await page.screenshot({ path: formScreenshot, fullPage: true });
  await testInfo.attach('contract termination form', {
    path: formScreenshot,
    contentType: 'image/png',
  });

  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page).toHaveURL('/loans');

  await page.goto(`/loans/view/${LOAN_ID}`);
  await page.locator('#loanMenu-trigger').click();
  const undoTarget = page.getByTestId('loan-undo-contract-termination-action');
  await expect(undoTarget).toBeVisible();
  await expect(page.getByTestId('loan-contract-termination-action')).toHaveCount(0);
  await undoTarget.scrollIntoViewIfNeeded();
  await page.mouse.move(20, 20);
  const undoMenuScreenshot = testInfo.outputPath('contract-termination-undo-menu.png');
  await page.screenshot({ path: undoMenuScreenshot, fullPage: true });
  await testInfo.attach('contract termination undo action', {
    path: undoMenuScreenshot,
    contentType: 'image/png',
  });

  await undoTarget.click();
  await expect(page).toHaveURL(
    new RegExp(`/loans/${LOAN_ID}/transactions/undoContractTermination$`),
  );
  await page.locator('ion-textarea[name="note"] textarea').fill('Correction requested by risk');
  await page.getByRole('button', { name: 'Save' }).click();
  await page.getByRole('button', { name: 'Confirm' }).click();
  await expect(page).toHaveURL('/loans');

  expect(commands).toEqual([
    {
      command: 'contractTermination',
      body: { note: 'Progressive contract ended after customer default' },
    },
    {
      command: 'undoContractTermination',
      body: { note: 'Correction requested by risk' },
    },
  ]);
});
