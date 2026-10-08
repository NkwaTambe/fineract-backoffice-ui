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
 * Cover for the Working Capital gaps that had backend endpoints but no UI: delinquency actions,
 * breach actions, near-breach actions, per-loan loan-originator attach/detach, charge add/waive,
 * the read-only rate-change/amortization-schedule/delinquency-range-tag views, and mark-as-fraud
 * / discount / payment-rate change. Mocked throughout — these endpoints are Fineract
 * 1.15.0-only and unreachable on the public community sandbox.
 */

import { test, expect, Page } from './fixtures';
import { selectTab } from './utils/ionic-locators';
import { selectOption } from './utils/select-option';

const TENANT = 'default';
const USER = 'mifos';
const PASSWORD = 'password';
const LOAN_ID = 1;

async function mockLoanView(page: Page) {
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

  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        id: LOAN_ID,
        accountNo: '000001',
        client: { id: 7, displayName: 'Acme Ltd' },
        product: { name: 'WC Revolver' },
        currency: { displaySymbol: '$' },
        proposedPrincipal: 10_000,
        status: { value: 'Active', active: true },
      }),
    });
  });
  for (const resource of ['transactions', 'delinquency-range-schedule', 'breach-schedule']) {
    await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/${resource}`, async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: resource === 'transactions' ? JSON.stringify({ content: [] }) : JSON.stringify([]),
      });
    });
  }

  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/charges`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([{ id: 1, name: 'Processing Fee', amount: 100, paid: false }]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ resourceId: 9 }),
    });
  });
  // Registered before the /charges/template route below: Playwright checks routes in reverse
  // registration order, so the more specific template route must be added last to win over
  // this wildcard for that one URL.
  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/charges/*`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/charges/template`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({
        chargeOptions: [
          { id: 10, name: 'Processing Fee' },
          { id: 11, name: 'Late Fee' },
        ],
      }),
    });
  });

  await page.route(
    `**/api/v1/working-capital-loans/${LOAN_ID}/delinquency-actions`,
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            { id: 1, action: 'PAUSE', startDate: '01 January 2026', endDate: '01 February 2026' },
          ]),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ resourceId: 4 }),
      });
    },
  );

  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/breach-actions`, async (route) => {
    if (route.request().method() === 'GET') {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          { id: 1, action: 'PAUSE', startDate: '01 January 2026', endDate: '01 February 2026' },
        ]),
      });
      return;
    }
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ resourceId: 2 }),
    });
  });

  await page.route(
    `**/api/v1/working-capital-loans/${LOAN_ID}/near-breach-actions`,
    async (route) => {
      if (route.request().method() === 'GET') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify([
            {
              id: 1,
              action: 'RESCHEDULE',
              frequency: 2,
              frequencyType: 'WEEKS',
              threshold: 80,
              createdDate: '01 January 2026',
            },
          ]),
        });
        return;
      }
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ resourceId: 3 }),
      });
    },
  );

  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/originators`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ originators: [{ id: 5, name: 'Acme Originator' }] }),
    });
  });
  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/originators/*`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route('**/api/v1/loan-originators', async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 5, name: 'Acme Originator' },
        { id: 6, name: 'Other Originator' },
      ]),
    });
  });

  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/rate-changes`, async (route) => {
    await route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify([
        { id: 1, effectiveDate: '01 January 2026', previousRate: 5, newRate: 8 },
      ]),
    });
  });

  await page.route(
    `**/api/v1/working-capital-loans/${LOAN_ID}/amortization-schedule`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({
          periodPaymentRate: 5,
          netDisbursementAmount: 9800,
          totalPaymentVolume: 12_000,
          payments: [{ paymentNo: 1, paymentDate: '01 February 2026', expectedPaymentAmount: 500 }],
        }),
      });
    },
  );

  await page.route(
    `**/api/v1/working-capital-loans/${LOAN_ID}/delinquencyrangetags`,
    async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify([
          {
            id: 1,
            periodNumber: 1,
            delinquencyRange: { classification: '1-30 Days' },
            delinquentDays: 5,
            delinquentAmount: 25,
            addedOnDate: '01 January 2026',
          },
        ]),
      });
    },
  );

  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/mark-as-fraud`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/discount`, async (route) => {
    await route.fulfill({ status: 200, contentType: 'application/json', body: '{}' });
  });
  await page.route(`**/api/v1/working-capital-loans/${LOAN_ID}/payment-rate`, async (route) => {
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

test.describe('Working Capital loan delinquency, breach and near-breach actions, and originators', () => {
  test.beforeEach(async ({ page }) => {
    await mockLoanView(page);
    await login(page);
    await page.goto(`/working-capital/loans/view/${LOAN_ID}`);
    await expect(page.locator('h2')).toContainText('000001');
  });

  test('shows delinquency action history and submits a new one', async ({ page }) => {
    await selectTab(page, /^Delinquency Actions$/);
    await expect(page.getByRole('cell', { name: 'PAUSE' })).toBeVisible();

    await page.getByRole('button', { name: 'New Action' }).click();
    await expect(page).toHaveURL(`/working-capital/loans/${LOAN_ID}/delinquency-action`);

    await selectOption(page, 'Action', 'RESET');
    const checkbox = page.locator('ion-checkbox[name="startNewPeriod"]');
    await checkbox.click();

    const postRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/working-capital-loans/${LOAN_ID}/delinquency-actions`) &&
        req.method() === 'POST',
    );
    await page.getByRole('button', { name: 'Submit' }).click();
    const request = await postRequest;
    expect(request.postDataJSON()).toMatchObject({
      action: 'RESET',
      startNewPeriod: true,
    });

    await expect(page).toHaveURL(`/working-capital/loans/view/${LOAN_ID}?tab=delinquencyActions`);
  });

  test('shows breach action history and submits a new one', async ({ page }) => {
    // Anchored: an unanchored 'Breach Actions' also substring-matches the "Near-Breach
    // Actions" tab.
    await selectTab(page, /^Breach Actions$/);
    await expect(page.getByRole('cell', { name: 'PAUSE' })).toBeVisible();

    await page.getByRole('button', { name: 'New Action' }).click();
    await expect(page).toHaveURL(`/working-capital/loans/${LOAN_ID}/breach-action`);

    // RESCHEDULE needs no date picker, unlike PAUSE/RESUME/DISABLE/ENABLE — kept simple to
    // fill deterministically, consistent with how this suite avoids ion-datetime interaction
    // where a test's assertion does not actually depend on the date.
    await selectOption(page, 'Action', 'RESCHEDULE');
    await page.locator('input[name="frequency"]').fill('2');
    await selectOption(page, 'Frequency Type', 'WEEKS');

    const postRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/working-capital-loans/${LOAN_ID}/breach-actions`) &&
        req.method() === 'POST',
    );
    await page.getByRole('button', { name: 'Submit' }).click();
    const request = await postRequest;
    expect(request.postDataJSON()).toMatchObject({
      action: 'RESCHEDULE',
      frequency: 2,
      frequencyType: 'WEEKS',
    });

    await expect(page).toHaveURL(`/working-capital/loans/view/${LOAN_ID}?tab=breachActions`);
  });

  test('shows near-breach action history and submits a new one', async ({ page }) => {
    await selectTab(page, 'Near-Breach Actions');
    await expect(page.getByRole('cell', { name: '80%' })).toBeVisible();

    await page.getByRole('button', { name: 'New Action' }).click();
    await expect(page).toHaveURL(`/working-capital/loans/${LOAN_ID}/near-breach-action`);

    await page.locator('input[name="nearBreachFrequency"]').fill('4');
    await selectOption(page, 'Frequency Type', 'DAYS');
    await page.locator('input[name="nearBreachThreshold"]').fill('90');

    const postRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/working-capital-loans/${LOAN_ID}/near-breach-actions`) &&
        req.method() === 'POST',
    );
    await page.getByRole('button', { name: 'Submit' }).click();
    const request = await postRequest;
    expect(request.postDataJSON()).toMatchObject({
      action: 'RESCHEDULE',
      nearBreachFrequency: 4,
      nearBreachFrequencyType: 'DAYS',
      nearBreachThreshold: 90,
    });

    await expect(page).toHaveURL(`/working-capital/loans/view/${LOAN_ID}?tab=nearBreachActions`);
  });

  test('attaches and detaches a loan originator', async ({ page }) => {
    await selectTab(page, 'Originators');
    await expect(page.getByRole('cell', { name: 'Acme Originator' })).toBeVisible();
    // The already-attached originator must not be offered again.
    await expect(page.getByRole('cell', { name: 'Other Originator' })).not.toBeVisible();

    // Not the shared selectOption() helper: it synchronises by asserting no ion-alert/
    // popover/action-sheet is on screen, but this page's header Actions menu is its own
    // ion-popover that stays mounted (hidden, not removed) for the page's whole lifetime, so
    // that assertion can never see a count of 0 here.
    const originatorSelect = page
      .locator('ion-item')
      .filter({ has: page.getByText('Select Originator', { exact: true }) })
      .locator('ion-select');
    await originatorSelect.click();
    const openPopover = page.locator('ion-popover:visible');
    await openPopover.getByRole('radio', { name: 'Other Originator', exact: true }).click();

    const attachRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/working-capital-loans/${LOAN_ID}/originators/6`) &&
        req.method() === 'POST',
    );
    await page.getByRole('button', { name: 'Attach Originator' }).click();
    await attachRequest;

    page.on('dialog', (dialog) => dialog.accept());
    const detachRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/working-capital-loans/${LOAN_ID}/originators/5`) &&
        req.method() === 'DELETE',
    );
    await page
      .getByRole('row', { name: /Acme Originator/ })
      .getByRole('button', { name: 'Detach' })
      .click();
    await detachRequest;
  });

  test('adds a new charge and waives an existing one', async ({ page }) => {
    await selectTab(page, 'Charges');
    await expect(page.getByRole('cell', { name: 'Processing Fee' })).toBeVisible();

    await page.getByRole('button', { name: 'Add Charge' }).click();
    await expect(page).toHaveURL(`/working-capital/loans/${LOAN_ID}/charge`);

    await selectOption(page, 'Select Charge', 'Late Fee');
    await page.locator('input[name="amount"]').fill('25');

    const postRequest = page.waitForRequest(
      (req) =>
        req.url().endsWith(`/working-capital-loans/${LOAN_ID}/charges`) && req.method() === 'POST',
    );
    await page.getByRole('button', { name: 'Submit' }).click();
    const request = await postRequest;
    expect(request.postDataJSON()).toMatchObject({ chargeId: 11, amount: 25 });
    await expect(page).toHaveURL(`/working-capital/loans/view/${LOAN_ID}?tab=charges`);

    page.on('dialog', (dialog) => dialog.accept());
    const waiveRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/working-capital-loans/${LOAN_ID}/charges/1`) &&
        req.url().includes('command=waive') &&
        req.method() === 'POST',
    );
    await page
      .getByRole('row', { name: /Processing Fee/ })
      .getByRole('button', { name: 'Waive Charge' })
      .click();
    await waiveRequest;
  });

  test('shows rate-change history, amortization schedule, and delinquency range tags', async ({
    page,
  }) => {
    await selectTab(page, 'Rate Changes');
    await expect(page.getByRole('cell', { name: '8', exact: true })).toBeVisible();

    await selectTab(page, 'Amortization Schedule');
    await expect(page.getByText('500', { exact: false })).toBeVisible();

    await selectTab(page, 'Delinquency Range Tags');
    await expect(page.getByRole('cell', { name: '5', exact: true })).toBeVisible();
  });

  test('marks the loan as fraud, applies a discount, and changes the payment rate', async ({
    page,
  }) => {
    await page.locator('#loanMenu-trigger').click();
    await page.locator('ion-popover:visible').getByText('Mark as Fraud').click();
    await expect(page).toHaveURL(`/working-capital/loans/${LOAN_ID}/action/markasfraud`);

    const fraudRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/working-capital-loans/${LOAN_ID}/mark-as-fraud`) &&
        req.method() === 'PUT',
    );
    await page.locator('ion-checkbox[name="fraud"]').click();
    await page.getByRole('button', { name: 'Submit' }).click();
    const request = await fraudRequest;
    expect(request.postDataJSON()).toEqual({ fraud: true });
    await expect(page).toHaveURL(`/working-capital/loans/view/${LOAN_ID}`);

    await page.locator('#loanMenu-trigger').click();
    await page.locator('ion-popover:visible').getByText('Apply Discount').click();
    await expect(page).toHaveURL(`/working-capital/loans/${LOAN_ID}/action/discount`);

    const discountRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/working-capital-loans/${LOAN_ID}/discount`) && req.method() === 'PUT',
    );
    await page.locator('input[name="discountAmount"]').fill('50');
    await page.getByRole('button', { name: 'Submit' }).click();
    const discountReq = await discountRequest;
    expect(discountReq.postDataJSON()).toMatchObject({ discountAmount: 50 });

    await page.locator('#loanMenu-trigger').click();
    await page.locator('ion-popover:visible').getByText('Change Payment Rate').click();
    await expect(page).toHaveURL(`/working-capital/loans/${LOAN_ID}/action/paymentrate`);

    const rateRequest = page.waitForRequest(
      (req) =>
        req.url().includes(`/working-capital-loans/${LOAN_ID}/payment-rate`) &&
        req.method() === 'PUT',
    );
    await page.locator('input[name="periodPaymentRate"]').fill('8');
    await page.getByRole('button', { name: 'Submit' }).click();
    const rateReq = await rateRequest;
    expect(rateReq.postDataJSON()).toMatchObject({ periodPaymentRate: 8 });
    await expect(page).toHaveURL(`/working-capital/loans/view/${LOAN_ID}?tab=rateChanges`);
  });
});
