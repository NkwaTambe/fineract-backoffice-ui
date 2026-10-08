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

import { test, expect } from './fixtures';

const HEAD_OFFICE = 'Head Office';

/**
 * Regression cover for #541. `ion-datetime-button` resolves its `ion-datetime` once, at load, and
 * never retries, so a revisit to the create form used to leave every date control blank and dead.
 * The failure only appears on the *second* visit — the first one is masked by the lazy Ionic chunk
 * load — which is why this walks a full create before checking.
 */
test.describe('Client form date pickers', () => {
  let createdClients: Record<string, unknown>[] = [];

  test.beforeEach(async ({ page }) => {
    createdClients = [];

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
          roles: [{ id: 1, name: 'Super User', description: 'Super user' }],
          permissions: ['ALL_FUNCTIONS'],
        }),
      }),
    );

    await page.route('**/api/v1/offices**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            name: HEAD_OFFICE,
            nameDecorated: HEAD_OFFICE,
            externalId: '1',
            openingDate: [2009, 1, 1],
            hierarchy: '.',
          },
        ]),
      }),
    );

    await page.route('**/api/v1/clients', async (route) => {
      if (route.request().method() !== 'POST') {
        await route.continue();
        return;
      }
      const body = JSON.parse(route.request().postData() || '{}');
      const created = {
        id: Date.now(),
        accountNo: '000000001',
        displayName: `${body.firstname} ${body.lastname}`,
        firstname: body.firstname,
        lastname: body.lastname,
        status: { value: 'Active' },
        officeName: HEAD_OFFICE,
      };
      createdClients.push(created);
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ clientId: created.id, resourceId: created.id }),
      });
    });

    await page.route('**/api/v1/clients?**', (route) =>
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          totalFilteredRecords: createdClients.length,
          pageItems: createdClients,
        }),
      }),
    );

    await page.goto('/login');
    if (!page.url().includes('/dashboard')) {
      await page.locator('#tenantId').fill('default');
      await page.locator('#username').fill('mifos');
      await page.locator('#password').fill('password');
      await page.getByRole('button', { name: 'Sign In' }).click();
      await expect(page).toHaveURL('/dashboard');
    }
  });

  test('stay usable on a second visit to the create form', async ({ page }) => {
    const ionicErrors: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (text.includes('[ion-datetime-button]')) ionicErrors.push(text);
    });

    // Ionic renders the button's date into its shadow root, so the host's textContent is always
    // empty and cannot tell a bound control from a dead one.
    const renderedDates = () =>
      page.evaluate(() =>
        Array.from(document.querySelectorAll('ion-datetime-button')).map((button) =>
          (button.shadowRoot?.textContent ?? '').trim(),
        ),
      );

    const openCreateForm = async (legalForm: 'Person' | 'Entity') => {
      await page.getByRole('button', { name: 'Create Client', exact: true }).click();
      await expect(page).toHaveURL('/clients/create');
      await page.locator('ion-select[name="legalFormId"]').click();
      await page.locator('ion-alert, ion-popover').getByRole('radio', { name: legalForm }).click();
      await page.locator('ion-select[name="officeId"]').click();
      await page.locator('ion-alert, ion-popover').getByRole('radio').first().click();
      await page.getByRole('button', { name: 'Next' }).click();
    };

    // Reached by URL rather than through the sidebar, which is collapsed at phone width. The
    // revisit that triggers the bug still happens in-app, via the list page's create button.
    await page.goto('/clients');
    await expect(page).toHaveURL('/clients');

    // First client, created in full so the second visit starts from a torn-down form.
    await openCreateForm('Person');
    await page.locator('input[name="firstname"]').fill(`DatePicker${Date.now()}`);
    await page.locator('input[name="lastname"]').fill('E2E');
    await page.getByRole('button', { name: 'Next' }).click();
    await page.getByRole('button', { name: 'Save' }).click();
    await expect(page).toHaveURL('/clients');

    // Second visit, with a different legal form, as reported.
    await openCreateForm('Entity');

    await expect
      .poll(async () => (await renderedDates()).filter((date) => date === '').length)
      .toBe(0);
    expect(ionicErrors).toEqual([]);
  });
});
