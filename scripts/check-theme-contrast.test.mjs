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
import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { checkTheme, contrast, resolveSlot, MIN_RATIO } from './check-theme-contrast.mjs';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const THEME = readFileSync(join(ROOT_DIR, 'src/styles/_ionic-theme.scss'), 'utf8');
const COMMON = readFileSync(join(ROOT_DIR, 'src/styles/_common.scss'), 'utf8');

test('the shipped theme clears the floor in both modes', () => {
  assert.deepEqual(checkTheme(THEME, COMMON), []);
});

test('contrast matches the WCAG worked examples', () => {
  assert.equal(contrast('#ffffff', '#000000').toFixed(0), '21');
  assert.equal(contrast('#3498db', '#ffffff').toFixed(2), '3.15');
  assert.equal(contrast('#2471a3', '#ffffff').toFixed(2), '5.30');
});

test('a var() resolves to its token, not its fallback, when the token is defined', () => {
  // The trap the old `var(--primary-dark, #1b4f72)` fell into: --primary-dark is #2980b9, so
  // the accessible-looking fallback beside it never applied.
  const scope = '--primary-dark: #2980b9;';
  assert.equal(resolveSlot('var(--primary-dark, #1b4f72)', [scope]), '#2980b9');
  assert.ok(contrast('#2980b9', '#ffffff') < MIN_RATIO);
});

test('a var() falls back only when the token is undefined', () => {
  assert.equal(resolveSlot('var(--nope, #1b4f72)', ['']), '#1b4f72');
});

test('rejects the exact regression from #613', () => {
  const regressed = THEME.replace(
    /--ion-color-primary:\s*[^;]+;/,
    '--ion-color-primary: var(--primary-color, #3498db);',
  );
  const failures = checkTheme(regressed, COMMON);
  assert.ok(
    failures.some((f) => f.includes('--ion-color-primary (light)') && f.includes('3.15')),
    `expected a light-mode primary failure, got: ${JSON.stringify(failures)}`,
  );
});

test('rejects a deleted slot rather than crashing', () => {
  const stripped = THEME.replace(/--ion-color-tertiary:\s*[^;]+;/, '');
  const failures = checkTheme(stripped, COMMON);
  assert.ok(failures.some((f) => f.includes('--ion-color-tertiary')));
});

test('rejects the dark-mode secondary that rendered white on #ecf0f1', () => {
  // Drop the dark-mode override and the slot follows --secondary-color again, which is
  // near-white under [data-theme='dark'].
  const withoutOverride = THEME.replace(/--ion-color-secondary:\s*#5d6d7e;/, '');
  const failures = checkTheme(withoutOverride, COMMON);
  assert.ok(
    failures.some((f) => f.includes('--ion-color-secondary (dark)') && f.includes('1.15')),
    `expected a dark-mode secondary failure, got: ${JSON.stringify(failures)}`,
  );
});
