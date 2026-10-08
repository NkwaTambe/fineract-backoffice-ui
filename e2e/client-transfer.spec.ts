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
 * Transferring a client between offices, against a real Fineract.
 *
 * Everything is driven through the UI — the destination branch and the client are both created
 * on screen. Nothing is seeded through the API, because the prerequisites *are* part of what an
 * operator has to do.
 *
 * The companion `client-servicing-gaps.spec.ts` covers the same screen against mocks, where the
 * request body can be inspected. This one answers the question mocks cannot: whether the
 * platform accepts what the screen sends, and whether the client actually ends up somewhere
 * different. The office name in the header is the assertion that matters — a transfer that
 * reports success but leaves the client where they were would pass every mocked test.
 *
 *   npx playwright test e2e/client-transfer.spec.ts --project=backend --workers=1
 */

import { test, expect, Page } from './fixtures';
import { login, uniqueSuffix } from './utils/fineract-login';
import { selectInDialog } from './utils/select-in-dialog';
import { selectOption } from './utils/select-option';

const HEAD_OFFICE = 'Head Office';
const MENU_TRIGGER = '#clientActionsMenu-trigger';
const OFFICE_NAME_SELECTOR = 'app-client-view .office-name';

/** Creates a branch under Head Office and returns its name. */
async function createBranchOffice(page: Page, suffix: string): Promise<string> {
  const officeName = `E2ETransferBranch ${suffix}`;
  await page.goto('/organization/offices/create');
  await page.getByRole('textbox', { name: 'Office Name' }).fill(officeName);
  await selectOption(page, 'Parent Office', HEAD_OFFICE);
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page).toHaveURL(/\/organization\/offices$/, { timeout: 20000 });
  return officeName;
}

/**
 * Creates an active client in Head Office and opens its detail view.
 *
 * The form ticks "Active" by default. That matters here: `proposeTransfer` is offered only
 * while the client is active, which is the state a transfer is actually requested from.
 */
async function createAndOpenClient(page: Page, suffix: string): Promise<string> {
  const firstName = `E2ETransfer${suffix}`;
  await page.goto('/clients/create');
  await selectOption(page, 'Office', HEAD_OFFICE);
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('textbox', { name: 'First Name' }).fill(firstName);
  await page.getByRole('textbox', { name: 'Last Name' }).fill('Tester');
  await page.getByRole('button', { name: 'Next' }).click();
  await page.getByRole('button', { name: /^save$/i }).click();
  await expect(page).toHaveURL(/\/clients$/, { timeout: 20000 });

  // The list paginates at ten rows and this suite adds one per run, so the new client is not
  // necessarily on the first page. `localLogic` filters rows the table already holds.
  await page.locator('ion-searchbar[data-testid="search-filter-input"] input').fill(firstName);
  const row = page.getByRole('row', { name: new RegExp(firstName) }).first();
  await expect(row).toBeVisible({ timeout: 20000 });
  // The row itself is inert — the name cell carries the `routerLink`, so clicking the row does
  // nothing and the test sits on /clients until it times out.
  await row.getByRole('link').first().click();
  await expect(page).toHaveURL(/\/clients\/view\/\d+$/, { timeout: 20000 });
  return `${firstName} Tester`;
}

/** Opens the actions menu and picks one of the new items. */
async function runAction(page: Page, testId: string): Promise<void> {
  await page.locator(MENU_TRIGGER).click();
  await page.getByTestId(testId).click();
}

/** The status badge on the client header. */
function status(page: Page) {
  return page.locator('app-client-view app-status-badge').first();
}

test.describe('Client transfer between offices', () => {
  test('a proposed transfer is held until the destination accepts, and then the client moves', async ({
    page,
  }) => {
    await login(page);
    const suffix = uniqueSuffix();
    const branch = await createBranchOffice(page, suffix);
    await createAndOpenClient(page, suffix);

    await expect(page.locator(OFFICE_NAME_SELECTOR)).toHaveText(HEAD_OFFICE);

    await runAction(page, 'client-propose-transfer-action');
    const dialog = page.locator('app-client-transfer-dialog');
    await selectInDialog(page, dialog, 'destinationOfficeId', branch);
    await page.getByTestId('client-transfer-confirm').click();

    // The client is *not* at the destination yet. This is the whole point of the handshake:
    // the source office has asked, and the destination has not answered.
    await expect(status(page)).toContainText('Transfer in progress', { timeout: 20000 });
    await expect(page.locator(OFFICE_NAME_SELECTOR)).toHaveText(HEAD_OFFICE);

    await runAction(page, 'client-accept-transfer-action');
    await page.getByTestId('client-transfer-response-confirm').click();

    // Only now does the office change. A transfer that reported success without moving the
    // client would satisfy every mocked assertion and fail here.
    await expect(page.locator(OFFICE_NAME_SELECTOR)).toHaveText(branch, { timeout: 20000 });
    await expect(status(page)).toContainText('Active');
  });

  test('a rejected transfer leaves the client on hold, and withdrawing is the way back', async ({
    page,
  }) => {
    await login(page);
    const suffix = uniqueSuffix();
    const branch = await createBranchOffice(page, suffix);
    await createAndOpenClient(page, suffix);

    await runAction(page, 'client-propose-transfer-action');
    await selectInDialog(
      page,
      page.locator('app-client-transfer-dialog'),
      'destinationOfficeId',
      branch,
    );
    await page.getByTestId('client-transfer-confirm').click();
    await expect(status(page)).toContainText('Transfer in progress', { timeout: 20000 });

    await runAction(page, 'client-reject-transfer-action');
    await page.getByTestId('client-transfer-response-confirm').click();

    // Rejection does not return the client to Active — it parks them, still at the source
    // office. Without `withdrawTransfer` in the menu this state has no exit from the UI.
    await expect(status(page)).toContainText('Transfer on hold', { timeout: 20000 });
    await expect(page.locator(OFFICE_NAME_SELECTOR)).toHaveText(HEAD_OFFICE);

    await page.locator(MENU_TRIGGER).click();
    await expect(page.getByTestId('client-accept-transfer-action')).toHaveCount(0);
    await page.getByTestId('client-withdraw-transfer-action').click();
    await page.getByTestId('client-transfer-response-confirm').click();

    await expect(status(page)).toContainText('Active', { timeout: 20000 });
    await expect(page.locator(OFFICE_NAME_SELECTOR)).toHaveText(HEAD_OFFICE);
  });

  test('a client can be transferred in one step when the user may act for both offices', async ({
    page,
  }) => {
    await login(page);
    const suffix = uniqueSuffix();
    const branch = await createBranchOffice(page, suffix);
    await createAndOpenClient(page, suffix);

    await runAction(page, 'client-propose-and-accept-transfer-action');
    await selectInDialog(
      page,
      page.locator('app-client-transfer-dialog'),
      'destinationOfficeId',
      branch,
    );
    await page.getByTestId('client-transfer-confirm').click();

    // No intermediate state: the platform refuses `transferDate` on this command, and the
    // client lands active at the destination straight away.
    await expect(page.locator(OFFICE_NAME_SELECTOR)).toHaveText(branch, { timeout: 20000 });
    await expect(status(page)).toContainText('Active');
  });
});

test.describe('Client staff assignment', () => {
  test('an officer can be assigned and then removed', async ({ page }) => {
    await login(page);
    const suffix = uniqueSuffix();

    const lastName = `TransferOfficer${suffix}`;
    await page.goto('/organization/staff/create');
    await selectOption(page, 'Office', HEAD_OFFICE);
    await page.locator('input[name="firstname"]').fill('E2E');
    await page.locator('input[name="lastname"]').fill(lastName);
    await page.getByRole('button', { name: /^save$/i }).click();
    await expect(page).toHaveURL(/\/organization\/staff$/, { timeout: 20000 });
    // Fineract renders a staff member as "lastname, firstname".
    const staffName = `${lastName}, E2E`;

    await createAndOpenClient(page, suffix);

    await runAction(page, 'client-assign-staff-action');
    await selectInDialog(page, page.locator('app-client-staff-dialog'), 'staffId', staffName);
    await page.getByTestId('client-staff-confirm').click();

    await expect(page.getByTestId('client-staff-name')).toHaveText(staffName, { timeout: 20000 });

    // Unassigning sends the id it is removing; an empty body is refused. That the platform
    // accepted it is what this half of the test establishes.
    await runAction(page, 'client-unassign-staff-action');
    await page.getByRole('button', { name: /^confirm$/i }).click();

    await expect(page.getByTestId('client-staff-name')).toHaveCount(0, { timeout: 20000 });
  });
});
