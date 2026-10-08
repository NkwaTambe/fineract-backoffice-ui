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
 * List screens must not report "No records found." when the load failed — see issue #611.
 *
 * Two of these failures happen *after* a 2xx: the response arrives, and mapping it throws inside
 * the subscribe's `next`, where the `error` callback cannot see it. That is why the screens
 * degraded to an ordinary empty state instead of an error, and why these cases are worth an e2e
 * test rather than only a unit one — the unit tests cover the mapping, this covers what the
 * operator actually sees.
 *
 *   npx playwright test e2e/list-load-failure.spec.ts --project=mocked
 */

import { expect, test, type Page } from './fixtures';

const HEAD_OFFICE = 'Head Office';

async function signIn(page: Page): Promise<void> {
  await page.route('**/config.json*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fineractApiUrl: '/api/v1', defaultTenant: 'default' }),
    }),
  );
  await page.route('**/api/v1/authentication**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        username: 'mifos',
        userId: 1,
        base64EncodedAuthenticationKey: 'YmFzZTY0',
        authenticated: true,
        officeId: 1,
        officeName: HEAD_OFFICE,
        permissions: ['ALL_FUNCTIONS'],
      }),
    }),
  );
  await page.route('**/api/v1/businessdate**', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([{ type: 'BUSINESS_DATE', date: [2026, 9, 26] }]),
    }),
  );

  await page.goto('/login');
  await page.locator('#tenantId').fill('default');
  await page.locator('#username').fill('mifos');
  await page.locator('#password').fill('password');
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/dashboard');
}

test.describe('entity-to-entity mapping', () => {
  const ENDPOINT = '**/api/v1/entitytoentitymapping**';

  test('renders the rows the endpoint returns, rather than claiming there are none', async ({
    page,
  }) => {
    await signIn(page);
    // The live shape: a JSON array, while the generated client types the response as `string`.
    await page.route(ENDPOINT, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, mappingTypes: 'office_access_to_loan_products', fromId: 10, toId: 20 },
          { id: 2, mappingTypes: 'office_access_to_savings_products', fromId: 11, toId: 21 },
        ]),
      }),
    );

    await page.goto('/system/entity-mapping');

    await expect(page.getByTestId('entity-mapping-load-error')).toHaveCount(0);
    await expect(page.getByText('No records found.')).toHaveCount(0);
    await expect(page.locator('tbody tr')).toHaveCount(2);
  });

  test('shows a failure state, not an empty one, when the payload cannot be read', async ({
    page,
  }, testInfo) => {
    await signIn(page);
    // A 200 carrying a shape the screen cannot map. Before #611 this threw past the error
    // handler and painted "No records found." over the failure.
    await page.route(ENDPOINT, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ unexpected: true }),
      }),
    );

    await page.goto('/system/entity-mapping');

    await expect(page.getByTestId('entity-mapping-load-error')).toBeVisible();
    await expect(page.getByText('No records found.')).toHaveCount(0);

    const shot = testInfo.outputPath('entity-mapping-load-error.png');
    await page.screenshot({ path: shot, fullPage: true });
    await testInfo.attach('entity mapping load failure', { path: shot, contentType: 'image/png' });
  });

  test('retries and recovers', async ({ page }) => {
    await signIn(page);
    await page.route(ENDPOINT, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/system/entity-mapping');
    await expect(page.getByTestId('entity-mapping-load-error')).toBeVisible();

    await page.route(ENDPOINT, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 9, mappingTypes: 'role_access_to_loan_products' }]),
      }),
    );

    await page.getByTestId('entity-mapping-load-error-action').click();

    await expect(page.getByTestId('entity-mapping-load-error')).toHaveCount(0);
    await expect(page.locator('tbody tr')).toHaveCount(1);
  });
});

test.describe('report mailing jobs', () => {
  const ENDPOINT = '**/api/v1/reportmailingjobs**';

  test('reads rows out of the paged envelope the endpoint returns', async ({ page }) => {
    await signIn(page);
    // The generated client types this as an array; the endpoint sends an envelope. Assigning
    // the envelope straight through made a downstream computed throw `t is not iterable`.
    await page.route(ENDPOINT, (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalFilteredRecords: 1,
          pageItems: [
            {
              id: 4,
              name: 'Nightly portfolio',
              emailRecipients: 'ops@example.org',
              emailSubject: 'Portfolio',
              isActive: true,
            },
          ],
        }),
      }),
    );

    await page.goto('/system/report-mailing-jobs');

    await expect(page.getByTestId('report-mailing-jobs-load-error')).toHaveCount(0);
    await expect(page.getByText('Nightly portfolio')).toBeVisible();
  });

  test('shows a failure state when the request errors', async ({ page }) => {
    await signIn(page);
    await page.route(ENDPOINT, (route) =>
      route.fulfill({ status: 500, contentType: 'application/json', body: '{}' }),
    );

    await page.goto('/system/report-mailing-jobs');

    await expect(page.getByTestId('report-mailing-jobs-load-error')).toBeVisible();
    await expect(page.getByText('No records found.')).toHaveCount(0);
  });
});
