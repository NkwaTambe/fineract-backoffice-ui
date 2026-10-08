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
 * Covers the Loan Portfolio Summary screen — the search/report tool ported from web-app's
 * "fund mapping" feature (which, despite its name, has no fund field and performs no bulk
 * reassignment; it is a read-only advance search over the loan portfolio). Mocked throughout.
 */

import { test, expect, Page } from './fixtures';
import { ionSelect } from './utils/ionic-locators';

const TENANT = 'default';
const USER = 'mifos';
const PASSWORD = 'password';

async function mockLoanPortfolioSummary(page: Page) {
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

  await page.route('**/api/v1/search/template', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        offices: [{ id: 1, name: 'Head Office' }],
        loanProducts: [{ id: 2, name: 'Personal Loan' }],
      }),
    });
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

test.describe('Loan Portfolio Summary', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoanPortfolioSummary(page);
    await login(page);
    await page.goto('/organization/loan-portfolio-summary');
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  });

  test('searching sends entities: loans and shows the grouped results', async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;
    await page.route('**/api/v1/search/advance', async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { officeName: 'Head Office', loanProductName: 'Personal Loan', count: 5, percentage: 40 },
        ]),
      });
    });

    await page.getByRole('button', { name: 'Search' }).click();

    await expect(page.getByRole('cell', { name: 'Head Office' })).toBeVisible();
    await expect(page.getByRole('cell', { name: 'Personal Loan' })).toBeVisible();
    expect(requestBody?.['entities']).toEqual(['loans']);
    expect(requestBody).not.toHaveProperty('outStandingAmountPercentage');
    expect(requestBody).not.toHaveProperty('outstandingAmount');
  });

  test('Edit Parameters returns from the results view to the filter form', async ({ page }) => {
    await page.route('**/api/v1/search/advance', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ officeName: 'Head Office', loanProductName: 'Personal Loan' }]),
      });
    });

    await page.getByRole('button', { name: 'Search' }).click();
    await expect(page.getByRole('cell', { name: 'Head Office' })).toBeVisible();

    await page.getByRole('button', { name: 'Edit Parameters' }).click();
    await expect(page.getByRole('button', { name: 'Search' })).toBeVisible();
  });

  test('checking the outstanding-amount filter sends the between min/max values', async ({
    page,
  }) => {
    let requestBody: Record<string, unknown> | undefined;
    await page.route('**/api/v1/search/advance', async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.locator('ion-checkbox[aria-label="Outstanding Amount"]').click();
    // 'between' is the default comparison condition, so its min/max fields are already showing.
    await page.getByRole('spinbutton', { name: 'Minimum Value' }).fill('500');
    await page.getByRole('spinbutton', { name: 'Maximum Value' }).fill('1000');

    await page.getByRole('button', { name: 'Search' }).click();

    expect(requestBody?.['includeOutstandingAmount']).toBe(true);
    expect(requestBody?.['outstandingAmountCondition']).toBe('between');
    expect(requestBody?.['minOutstandingAmount']).toBe(500);
    expect(requestBody?.['maxOutstandingAmount']).toBe(1000);
  });

  test('switching to a single-value comparison condition sends one value', async ({ page }) => {
    let requestBody: Record<string, unknown> | undefined;
    await page.route('**/api/v1/search/advance', async (route) => {
      requestBody = route.request().postDataJSON();
      await route.fulfill({ status: 200, contentType: 'application/json', body: '[]' });
    });

    await page.locator('ion-checkbox[aria-label="Outstanding Percentage"]').click();
    await ionSelect(page, 'Comparison Condition').click();
    await page
      .locator('ion-alert, ion-popover, ion-action-sheet')
      .getByRole('radio', { name: '>=', exact: true })
      .click();
    await page.getByRole('spinbutton', { name: 'Comparison Value' }).fill('75');

    await page.getByRole('button', { name: 'Search' }).click();

    expect(requestBody?.['includeOutStandingAmountPercentage']).toBe(true);
    expect(requestBody?.['outStandingAmountPercentageCondition']).toBe('>=');
    expect(requestBody?.['outStandingAmountPercentage']).toBe(75);
  });
});
