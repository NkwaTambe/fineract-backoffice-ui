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
 * Covers the breadcrumb trail above page content — ported from web-app's shell breadcrumb,
 * built here from each activated route's existing `title` metadata rather than new route data.
 */

import { test, expect } from './fixtures';

const TENANT = 'default';
const USER = 'mifos';
const PASSWORD = 'password';

test.beforeEach(async ({ page }) => {
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

  await page.goto('/login');
  await page.locator('#tenantId').fill(TENANT);
  await page.locator('#username').fill(USER);
  await page.locator('#password').fill(PASSWORD);
  await page.getByRole('button', { name: 'Sign In' }).click();
  await expect(page).toHaveURL('/dashboard');
});

test('a single-crumb page shows no breadcrumb trail', async ({ page }) => {
  await page.goto('/clients');
  await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(0);
});

test('a nested page shows a trail, and the ancestor crumb navigates back', async ({ page }) => {
  await page.goto('/clients/create');

  const trail = page.locator('nav[aria-label="Breadcrumb"]');
  await expect(trail).toBeVisible();
  await expect(trail.getByRole('link', { name: 'Clients' })).toBeVisible();
  await expect(trail.locator('.current')).toHaveText('Create Client');

  await trail.getByRole('link', { name: 'Clients' }).click();
  await expect(page).toHaveURL('/clients');
  await expect(page.locator('nav[aria-label="Breadcrumb"]')).toHaveCount(0);
});
