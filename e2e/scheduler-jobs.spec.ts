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
 * Covers the bulk-select + "Run Selected" affordance on the Scheduler Jobs list — ported from
 * web-app, which offers the same bulk trigger over its job list. Mocked throughout.
 */

import { test, expect, Page } from './fixtures';
import { confirmDialog } from './utils/ionic-locators';

const TENANT = 'default';
const USER = 'mifos';
const PASSWORD = 'password';

async function mockSchedulerJobs(page: Page) {
  await page.route(/\/api\/v1\//, async (route) => {
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
        officeName: 'Head Office',
        roles: [{ id: 1, name: 'Role', description: 'Role' }],
        permissions: ['ALL_FUNCTIONS'],
      }),
    });
  });
  await page.route(/\/api\/v1\/businessdate/, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ type: 'BUSINESS_DATE', date: [2026, 8, 16] }]),
    });
  });

  await page.route('**/api/v1/scheduler', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ active: true }),
    });
  });
  await page.route('**/api/v1/jobs', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { jobId: 1, displayName: 'Update Loan Summary', active: true, nextRunTime: '01 Jan 2026' },
        { jobId: 2, displayName: 'Update NPA', active: true, nextRunTime: '01 Jan 2026' },
      ]),
    });
  });
  await page.route(/\/api\/v1\/jobs\/\d+(\?|$)/, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
}

async function login(page: Page) {
  await page.goto('/login');
  await page.locator('#tenantId').fill(TENANT);
  await page.locator('#username').fill(USER);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Scheduler Jobs bulk run', () => {
  test.beforeEach(async ({ page }) => {
    await mockSchedulerJobs(page);
    await login(page);
    await page.goto('/system/scheduler-jobs');
    await expect(page.getByRole('cell', { name: 'Update Loan Summary' })).toBeVisible();
  });

  test('Run Selected is disabled until a job is checked', async ({ page }) => {
    const runSelected = page.getByRole('button', { name: /Run Selected/ });
    await expect(runSelected).toBeDisabled();

    await page
      .getByRole('row', { name: /Update Loan Summary/ })
      .locator('ion-checkbox')
      .click();
    await expect(runSelected).toBeEnabled();
  });

  test('Select All checks every job, and running confirms then triggers each one', async ({
    page,
  }) => {
    await page.locator('ion-checkbox[aria-label="Select All"]').click();

    const runRequests: string[] = [];
    await page.route(/\/api\/v1\/jobs\/\d+(\?|$)/, async (route) => {
      runRequests.push(new URL(route.request().url()).pathname);
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.getByRole('button', { name: /Run Selected/ }).click();
    await confirmDialog(page).getByTestId('confirm-dialog-confirm').click();

    await expect.poll(() => runRequests.length).toBe(2);
    expect(runRequests).toContain('/api/v1/jobs/1');
    expect(runRequests).toContain('/api/v1/jobs/2');

    // Selection clears once the run completes.
    await expect(page.getByRole('button', { name: /Run Selected/ })).toBeDisabled();
  });

  test('declining the confirmation runs nothing', async ({ page }) => {
    await page
      .getByRole('row', { name: /Update NPA/ })
      .locator('ion-checkbox')
      .click();

    let ran = false;
    await page.route(/\/api\/v1\/jobs\/\d+(\?|$)/, async (route) => {
      ran = true;
      await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
    });

    await page.getByRole('button', { name: /Run Selected/ }).click();
    await confirmDialog(page).getByTestId('confirm-dialog-cancel').click();

    expect(ran).toBe(false);
  });
});
