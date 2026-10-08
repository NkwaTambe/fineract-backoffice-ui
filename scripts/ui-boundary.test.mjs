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

import assert from 'node:assert/strict';
import test from 'node:test';
import { ESLint } from 'eslint';

/**
 * The two boundaries are deliberately on separate rule ids, because `eslint-suppressions.json`
 * counts per rule: sharing one counter let an Ionic violation be traded for a Material or i18n
 * one without the ratchet moving. These tests therefore assert *which* rule fires, not merely
 * that something did — a regression that merged the two back together would otherwise pass.
 */
const BOUNDARY_RULES = new Set(['no-restricted-imports', 'local/no-vendor-ui-import']);

const eslint = new ESLint();

/** Lint a one-line probe file at `filePath` and return its boundary reports by rule id. */
async function importErrors(filePath, module, symbol) {
  const [result] = await eslint.lintText(
    `import { ${symbol} } from '${module}'; export const imported = ${symbol};`,
    { filePath },
  );
  const reported = result.messages.filter((message) => BOUNDARY_RULES.has(message.ruleId));
  return {
    total: reported.length,
    rules: reported.map((message) => message.ruleId),
  };
}

test('new feature Ionic imports are rejected, on the component boundary rule', async () => {
  const { total, rules } = await importErrors(
    'src/app/features/probe.ts',
    '@ionic/angular/standalone',
    'IonButton',
  );
  assert.equal(total, 1);
  assert.deepEqual(rules, ['local/no-vendor-ui-import']);
});

test('a component import never lands on the ratchet the i18n backlog shares', async () => {
  // The regression this guards: seeding ~290 Ionic violations into `no-restricted-imports`
  // made a file's Material/i18n allowance spendable on an Ionic import and vice versa.
  const ionic = await importErrors(
    'src/app/features/probe.ts',
    '@ionic/angular/standalone',
    'IonButton',
  );
  assert.ok(!ionic.rules.includes('no-restricted-imports'));

  const i18n = await importErrors(
    'src/app/features/probe.ts',
    '@ngx-translate/core',
    'TranslateService',
  );
  assert.deepEqual(i18n.rules, ['no-restricted-imports']);
});

test('an import of controllers alone stays on the ADR 0003 boundary only', async () => {
  // One import statement, one counter: otherwise migrating it to OVERLAY would have to
  // decrement two suppressions, and neither count would mean what it says.
  for (const module of ['@ionic/angular', '@ionic/angular/standalone']) {
    const { rules } = await importErrors('src/app/features/probe.ts', module, 'ModalController');
    assert.deepEqual(rules, ['no-restricted-imports']);
  }
});

test('UI implementations may use Ionic but cannot bypass other adapter boundaries', async () => {
  assert.equal(
    (await importErrors('src/app/ui/probe.ts', '@ionic/angular/standalone', 'IonButton')).total,
    0,
  );
  assert.deepEqual(
    (await importErrors('src/app/ui/probe.ts', '@angular/material/button', 'MatButton')).rules,
    ['no-restricted-imports'],
  );
  assert.deepEqual(
    (await importErrors('src/app/ui/probe.ts', '@ngx-translate/core', 'TranslateService')).rules,
    ['no-restricted-imports'],
  );
  for (const module of ['@ionic/angular', '@ionic/angular/standalone']) {
    assert.deepEqual((await importErrors('src/app/ui/probe.ts', module, 'ModalController')).rules, [
      'no-restricted-imports',
    ]);
  }
});

test('the existing composition roots and imperative adapter remain allowed', async () => {
  for (const file of [
    'src/app/app.config.ts',
    'src/app/testing/ionic-testing.ts',
    'src/app/core/adapters/overlay/ionic-overlay.adapter.ts',
  ]) {
    assert.equal(
      (await importErrors(file, '@ionic/angular/standalone', 'IonButton')).total,
      0,
      `${file} should be allowed to name Ionic directly`,
    );
  }
});
