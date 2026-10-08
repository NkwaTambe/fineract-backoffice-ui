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
 * The identity-provider route on the login page, driven against mocked endpoints.
 *
 * The button is switched on by `oidcLoginEnabled` in `config.json` and, for now, only announces
 * that signing in through a provider is not available yet (issue #370). What matters, and what
 * this pins, is everything around that: a deployment that never set the flag sees exactly the
 * screen it always saw, and one that did still has username and password as a way in — the flag
 * must never become the only door, the way a second factor can.
 *
 * `oidc-login-backend.spec.ts` proves the same against a real Fineract; this covers the matrix a
 * real one cannot vary per test, above all the configurations that must show nothing.
 */

import { test, expect, Page } from './fixtures';

const API_BASE = '/api/v1';
const TENANT = 'default';
const USER = 'mifos';
const PASSWORD = 'password';

const SSO_BUTTON = 'login-sso-button';
const NOT_AVAILABLE = /not available yet/i;

interface MockOptions {
  /**
   * What `config.json` says for `oidcLoginEnabled`. Left out entirely, the key is absent, which is
   * every `config.json` that predates the flag.
   */
  oidcLoginEnabled?: unknown;
  /** Whether `/v1/authentication` asks for a second factor after the password. */
  twoFactorRequired?: boolean;
}

interface Mocked {
  /** Every request the page made to the authentication endpoint. */
  authenticationRequests: string[];
}

async function mockPlatform(page: Page, options: MockOptions = {}): Promise<Mocked> {
  const authenticationRequests: string[] = [];
  const config: Record<string, unknown> = { fineractApiUrl: API_BASE, defaultTenant: TENANT };
  if ('oidcLoginEnabled' in options) {
    config['oidcLoginEnabled'] = options.oidcLoginEnabled;
  }

  await page.route('**/config.json*', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(config),
    });
  });

  await page.route('**/api/v1/authentication**', async (route) => {
    authenticationRequests.push(route.request().url());
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
        permissions: ['ALL_FUNCTIONS'],
        ...(options.twoFactorRequired ? { isTwoFactorAuthenticationRequired: true } : {}),
      }),
    });
  });

  // Only reached when a second factor is required: one channel, so the code field is what the
  // person is left looking at.
  await page.route('**/api/v1/twofactor**', async (route) => {
    const body =
      route.request().method() === 'POST'
        ? {
            requestTime: Date.now(),
            tokenLiveTimeInSec: 300,
            extendedAccessToken: false,
            deliveryMethod: { name: 'email', target: 'a***@example.org' },
          }
        : [{ name: 'email', target: 'a***@example.org' }];
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify(body),
    });
  });

  return { authenticationRequests };
}

/**
 * The password form's own button. `exact` matters here: the identity-provider button is called
 * "Sign in with your identity provider", which a plain `Sign In` name matches too.
 */
function passwordSignInButton(page: Page) {
  return page.getByRole('button', { name: 'Sign In', exact: true });
}

/** Fills in the password form and submits it. */
async function signIn(page: Page): Promise<void> {
  await page.locator('#tenantId').fill(TENANT);
  await page.locator('#username').fill(USER);
  await page.locator('#password').fill(PASSWORD);
  await passwordSignInButton(page).click();
}

test.describe('identity-provider route on the login page', () => {
  test('a deployment that never set the flag sees the screen it always saw', async ({ page }) => {
    // The regression that protects every existing installation: their config.json has no such key.
    await mockPlatform(page);
    await page.goto('/login');

    await expect(page.locator('#username')).toBeVisible();
    await expect(page.getByTestId(SSO_BUTTON)).toHaveCount(0);
  });

  // The flag is read strictly. A hand-edited config.json is exactly where "true" ends up quoted,
  // and a button that appears for a value nobody meant as on would be worse than one that does not.
  for (const value of [false, 'true', 1]) {
    test(`does not offer the route when the flag is ${JSON.stringify(value)}`, async ({ page }) => {
      await mockPlatform(page, { oidcLoginEnabled: value });
      await page.goto('/login');

      await expect(page.locator('#username')).toBeVisible();
      await expect(page.getByTestId(SSO_BUTTON)).toHaveCount(0);
    });
  }

  test('offers the route above the password form, which stays in place', async ({ page }) => {
    await mockPlatform(page, { oidcLoginEnabled: true });
    await page.goto('/login');

    const button = page.getByTestId(SSO_BUTTON);
    await expect(button).toBeVisible();
    await expect(button).toHaveText('Sign in with your identity provider');

    // Beside the form rather than instead of it.
    await expect(page.locator('#username')).toBeVisible();
    await expect(page.locator('#password')).toBeVisible();
    await expect(passwordSignInButton(page)).toBeVisible();

    const buttonBox = await button.boundingBox();
    const usernameBox = await page.locator('#username').boundingBox();
    expect(buttonBox).not.toBeNull();
    expect(usernameBox).not.toBeNull();
    expect(buttonBox!.y).toBeLessThan(usernameBox!.y);
  });

  test('says plainly that it is not available yet, and goes nowhere', async ({ page }) => {
    const { authenticationRequests } = await mockPlatform(page, { oidcLoginEnabled: true });
    await page.goto('/login');

    await page.getByTestId(SSO_BUTTON).click();

    // Not a silent no-op, and not a redirect this application could not complete.
    await expect(page.getByText(NOT_AVAILABLE)).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
    expect(authenticationRequests).toEqual([]);

    // The person is left where they can still sign in the ordinary way.
    await expect(page.locator('#username')).toBeVisible();
  });

  test('username and password still sign in when the route is offered', async ({ page }) => {
    await mockPlatform(page, { oidcLoginEnabled: true });
    await page.goto('/login');

    // After the notice, too: pressing the button must not leave the form in a worse state.
    await page.getByTestId(SSO_BUTTON).click();
    await expect(page.getByText(NOT_AVAILABLE)).toBeVisible();

    await signIn(page);

    await expect(page).toHaveURL('/dashboard');
  });

  test('is not offered while a second factor is being asked for', async ({ page }) => {
    await mockPlatform(page, { oidcLoginEnabled: true, twoFactorRequired: true });
    await page.goto('/login');
    await expect(page.getByTestId(SSO_BUTTON)).toBeVisible();

    await signIn(page);

    // The password was accepted, so this is the second step of that sign-in. A route to a
    // different sign-in here would abandon a half-finished one.
    await expect(page.getByTestId('two-factor-code')).toBeVisible();
    await expect(page.getByTestId(SSO_BUTTON)).toHaveCount(0);
  });
});
