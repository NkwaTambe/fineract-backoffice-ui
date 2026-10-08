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
 * The login screen must explain every involuntary return to it — see issue #612.
 *
 * `IdleService` sends `reason=inactivity` and `errorInterceptor` sends `reason=session-expired`.
 * For a while only the latter was compared against, so the idle path — the common one, on a
 * 15-minute timer — dropped the user at a login screen that said nothing about why.
 *
 *   npx playwright test e2e/logout-reason-notice.spec.ts --project=mocked
 */

import { expect, test, type Page } from './fixtures';

async function stubConfig(page: Page): Promise<void> {
  await page.route('**/config.json*', (route) =>
    route.fulfill({
      status: 200,
      contentType: 'application/json',
      body: JSON.stringify({ fineractApiUrl: '/api/v1', defaultTenant: 'default' }),
    }),
  );
}

const NOTICE = 'login-logout-notice';

test('explains an inactivity sign-out', async ({ page }, testInfo) => {
  await stubConfig(page);

  await page.goto('/login?reason=inactivity');

  const notice = page.getByTestId(NOTICE);
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(/inactivity/i);

  const shot = testInfo.outputPath('login-inactivity-notice.png');
  await page.screenshot({ path: shot, fullPage: true });
  await testInfo.attach('inactivity notice', { path: shot, contentType: 'image/png' });
});

test('explains an expired session, with different wording', async ({ page }) => {
  await stubConfig(page);

  await page.goto('/login?reason=session-expired');

  const notice = page.getByTestId(NOTICE);
  await expect(notice).toBeVisible();
  await expect(notice).toContainText(/expired/i);
  // The two reasons tell the user different things and must not collapse into one message.
  await expect(notice).not.toContainText(/inactivity/i);
});

test('stays silent when the user came to sign in of their own accord', async ({ page }) => {
  await stubConfig(page);

  await page.goto('/login');

  await expect(page.getByTestId(NOTICE)).toHaveCount(0);
});

test('stays silent for a reason it does not recognise, rather than showing a blank notice', async ({
  page,
}) => {
  await stubConfig(page);

  await page.goto('/login?reason=not-a-real-reason');

  await expect(page.getByTestId(NOTICE)).toHaveCount(0);
});
