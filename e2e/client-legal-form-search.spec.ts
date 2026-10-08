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
 * Regression coverage for #534: the main /clients list hardcoded legalForm 1 (Person) when
 * calling getClients, which silently excluded Entity clients from the list. Seeded through the
 * API against a real Fineract, because the bug was in what the app asks the backend for — a
 * page.route() mock would echo back whatever list we hand it and could never have caught this.
 *
 * npx playwright test e2e/client-legal-form-search.spec.ts --project=backend --workers=1
 */

import { test, expect } from './fixtures';
import { login } from './utils/fineract-login';
import { createApiContext, seedEntityClient } from './utils/seed-api';

test.describe('Client list: legal form filtering', () => {
  test('an entity client appears in the main client list', async ({ page }) => {
    await login(page);
    const api = await createApiContext();
    let entity;
    try {
      entity = await seedEntityClient(api);
    } finally {
      await api.dispose();
    }

    await page.goto('/clients');
    await expect(page.getByText(entity.displayName)).toBeVisible({ timeout: 10_000 });
  });
});
