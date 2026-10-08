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
 * The Currency field on Products → Collateral Management → Create — #626's own reproduction.
 *
 * Before, this was a plain `ion-select`: a hundred-plus currencies in one alphabetical list,
 * no filter field, so finding one meant scrolling and reading every entry. This asserts the
 * `app-searchable-select` replacement: the option list is not shown until opened, a search
 * narrows it by a case-insensitive substring of the label, and picking a result closes the
 * picker and fills the field — all without leaving the keyboard.
 *
 * Mocked, so this runs in the fast CI project rather than needing a real Fineract.
 */

import { test, expect, Page } from './fixtures';

const CURRENCIES = [
  { code: 'AFN', name: 'Afghan Afghani' },
  { code: 'ALL', name: 'Albanian Lek' },
  { code: 'AUD', name: 'Australian Dollar' },
  { code: 'EUR', name: 'Euro' },
  { code: 'GBP', name: 'British Pound' },
  { code: 'INR', name: 'Indian Rupee' },
  { code: 'JPY', name: 'Japanese Yen' },
  { code: 'USD', name: 'US Dollar' },
  { code: 'ZAR', name: 'South African Rand' },
].map((c) => ({
  ...c,
  decimalPlaces: 2,
  displayLabel: `${c.name} (${c.code})`,
  displaySymbol: c.code,
  inMultiplesOf: 0,
  nameCode: `currency.${c.code}`,
}));

async function signIn(page: Page): Promise<void> {
  await page.route('**/config.json*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fineractApiUrl: '/api/v1', defaultTenant: 'default' }),
    });
  });
  await page.route('**/api/v1/authentication**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: 'mifos',
        userId: 1,
        base64EncodedAuthenticationKey: 'YmFzZTY0',
        authenticated: true,
        officeId: 1,
        officeName: 'Head Office',
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
  await page.route('**/api/v1/collateral-management/template**', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(CURRENCIES),
    });
  });

  await page.goto('/login');
  await page.locator('#tenantId').fill('default');
  await page.locator('#username').fill('mifos');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('Collateral product currency — searchable select (#626)', () => {
  test.beforeEach(async ({ page }) => {
    await signIn(page);
    await page.goto('/products/collateral-management/create');
    await expect(page.locator('input[name="name"]')).toBeVisible({ timeout: 20_000 });
  });

  test('the field is closed with no option list until it is opened', async ({ page }) => {
    await expect(page.locator('[data-testid="collateral-currency-select"]')).toBeVisible();
    await expect(page.locator('[data-testid="searchable-select-option-USD"]')).toHaveCount(0);
  });

  test('typing narrows a long, alphabetical list to the matching currency', async ({ page }) => {
    await page.locator('[data-testid="collateral-currency-select"]').click();
    const search = page.locator('[data-testid="searchable-select-search"] input');
    await expect(search).toBeVisible();

    // Every currency shows with nothing typed.
    await expect(page.locator('ion-item[data-testid^="searchable-select-option-"]')).toHaveCount(
      CURRENCIES.length,
    );

    await search.fill('rupee');
    await expect(page.locator('[data-testid="searchable-select-option-INR"]')).toBeVisible();
    await expect(page.locator('ion-item[data-testid^="searchable-select-option-"]')).toHaveCount(1);
    await expect(page.locator('[data-testid="searchable-select-count"]')).toHaveText(
      '1 result(s) found',
    );

    await page.locator('[data-testid="searchable-select-option-INR"]').click();

    const trigger = page.locator('[data-testid="collateral-currency-select"]');
    await expect(trigger).toHaveText(/Indian Rupee \(INR\)/);
    await expect(page.locator('[data-testid="searchable-select-modal"]')).toHaveCount(0);
  });

  test('matches by currency code as well as by name', async ({ page }) => {
    await page.locator('[data-testid="collateral-currency-select"]').click();
    await page.locator('[data-testid="searchable-select-search"] input').fill('ZAR');
    await expect(page.locator('[data-testid="searchable-select-option-ZAR"]')).toBeVisible();
    await expect(page.locator('ion-item[data-testid^="searchable-select-option-"]')).toHaveCount(1);
  });

  test('shows a "no results" message rather than an empty panel', async ({ page }) => {
    await page.locator('[data-testid="collateral-currency-select"]').click();
    await page.locator('[data-testid="searchable-select-search"] input').fill('does-not-exist');
    await expect(page.locator('[data-testid="searchable-select-empty"]')).toBeVisible();
  });

  test('Cancel closes the picker without changing the selection', async ({ page }) => {
    const trigger = page.locator('[data-testid="collateral-currency-select"]');
    await trigger.click();
    await page.locator('[data-testid="searchable-select-search"] input').fill('yen');
    await page.locator('[data-testid="searchable-select-cancel"]').click();

    await expect(page.locator('[data-testid="searchable-select-modal"]')).toHaveCount(0);
    await expect(trigger).not.toHaveText(/Yen/);
  });
});
