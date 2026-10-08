#!/usr/bin/env node
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
 * Fails the build when an Ionic colour slot cannot carry the contrast colour pinned beside it.
 *
 * `--ion-color-primary-contrast` is the literal `#ffffff`, so whatever fills
 * `--ion-color-primary` has to reach 4.5:1 against white. Issue #587 fixed that by pointing the
 * slot at `--primary-strong`; a later commit on the same branch pointed it back at
 * `--primary-color` (#3498db, 3.15:1) and shipped, because nothing asserted the ratio — every
 * primary call-to-action in the app regressed at once. See issue #613.
 *
 *   node scripts/check-theme-contrast.mjs
 */

import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT_DIR = join(dirname(fileURLToPath(import.meta.url)), '..');

/** The slots whose contrast colour is a literal, so the fill is the only free variable. */
export const GUARDED_SLOTS = ['primary', 'secondary', 'tertiary'];

/** WCAG 2.1 AA for normal-size text. Button and badge labels are 14px. */
export const MIN_RATIO = 4.5;

function luminance(hex) {
  const h = hex.replace('#', '');
  const full =
    h.length === 3
      ? h
          .split('')
          .map((c) => c + c)
          .join('')
      : h;
  const linear = [0, 2, 4]
    .map((i) => parseInt(full.slice(i, i + 2), 16) / 255)
    .map((c) => (c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4));
  return 0.2126 * linear[0] + 0.7152 * linear[1] + 0.0722 * linear[2];
}

export function contrast(a, b) {
  const [l1, l2] = [luminance(a), luminance(b)];
  const [hi, lo] = l1 >= l2 ? [l1, l2] : [l2, l1];
  return (hi + 0.05) / (lo + 0.05);
}

/**
 * Resolves a declaration to the hex it actually paints.
 *
 * A `var(--token, #fallback)` renders the *token*, not the fallback, whenever the token is
 * defined — which is the trap the old `var(--primary-dark, #1b4f72)` fell into, since
 * `--primary-dark` is #2980b9 (4.30:1) and the accessible fallback never applied.
 */
export function resolveSlot(declaration, tokenScopes) {
  const varMatch = /var\(\s*(--[\w-]+)\s*(?:,\s*(#[0-9a-fA-F]{3,6}))?\s*\)/.exec(declaration);
  if (!varMatch) {
    const literal = /#[0-9a-fA-F]{3,6}/.exec(declaration);
    if (!literal) throw new Error(`neither a literal nor a var(): ${declaration.trim()}`);
    return literal[0];
  }
  const [, token, fallback] = varMatch;
  for (const scope of tokenScopes) {
    const defined = new RegExp(`${token}:\\s*(#[0-9a-fA-F]{3,6})`).exec(scope);
    if (defined) return defined[1];
  }
  if (!fallback) throw new Error(`${token} is undefined and has no fallback`);
  return fallback;
}

function declaration(scope, name) {
  const found = new RegExp(`${name}:\\s*([^;]+);`).exec(scope);
  if (!found) throw new Error(`${name} is not declared`);
  return found[1].trim();
}

/**
 * The declaration in effect for a theme.
 *
 * A slot may be redeclared inside the theme's own `[data-theme='dark']` block to stop following
 * a brand token that flips light in dark mode; that override wins over the `:root` one.
 */
function declarationFor(name, themeDark, root) {
  const override = new RegExp(`${name}:\\s*([^;]+);`).exec(themeDark);
  return override ? override[1].trim() : declaration(root, name);
}

export function checkTheme(themeScss, commonScss) {
  const root = /:root\s*\{([\s\S]*?)\n\}/.exec(themeScss)?.[1] ?? '';
  const themeDark = /\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/.exec(themeScss)?.[1] ?? '';
  const commonRoot = /:root\s*\{([\s\S]*?)\n\}/.exec(commonScss)?.[1] ?? '';
  const commonDark = /\[data-theme='dark'\]\s*\{([\s\S]*?)\n\}/.exec(commonScss)?.[1] ?? '';
  const failures = [];

  for (const slot of GUARDED_SLOTS) {
    // Light and dark are checked separately: _common.scss redefines the brand tokens under the
    // dark attribute, so a slot can pass in one theme and fail in the other.
    for (const [theme, scopes, darkScope] of [
      ['light', [root, commonRoot], ''],
      ['dark', [root, commonDark, commonRoot], themeDark],
    ]) {
      // A slot that has been deleted outright is a failure to report, not a crash: removing
      // `--ion-color-tertiary` is exactly what happened alongside the #613 regression.
      try {
        const fill = resolveSlot(declarationFor(`--ion-color-${slot}`, darkScope, root), scopes);
        const text = resolveSlot(
          declarationFor(`--ion-color-${slot}-contrast`, darkScope, root),
          scopes,
        );
        const ratio = contrast(fill, text);
        if (ratio < MIN_RATIO) {
          failures.push(
            `--ion-color-${slot} (${theme}): ${fill} on ${text} is ${ratio.toFixed(2)}:1, ` +
              `below the ${MIN_RATIO}:1 AA floor.`,
          );
        }
      } catch (err) {
        failures.push(`--ion-color-${slot} (${theme}): ${err.message}`);
      }
    }
  }

  // The pressed state of a solid button keeps the same white label as its resting state.
  for (const [theme, scopes, darkScope] of [
    ['light', [root, commonRoot], ''],
    ['dark', [root, commonDark, commonRoot], themeDark],
  ]) {
    try {
      const shade = resolveSlot(
        declarationFor('--ion-color-primary-shade', darkScope, root),
        scopes,
      );
      const ratio = contrast(
        shade,
        resolveSlot(declarationFor('--ion-color-primary-contrast', darkScope, root), scopes),
      );
      if (ratio < MIN_RATIO) {
        failures.push(
          `--ion-color-primary-shade (${theme}): ${shade} is ${ratio.toFixed(2)}:1 against the ` +
            `button label, below the ${MIN_RATIO}:1 AA floor.`,
        );
      }
    } catch (err) {
      failures.push(`--ion-color-primary-shade (${theme}): ${err.message}`);
    }
  }

  return failures;
}

function main() {
  const failures = checkTheme(
    readFileSync(join(ROOT_DIR, 'src/styles/_ionic-theme.scss'), 'utf8'),
    readFileSync(join(ROOT_DIR, 'src/styles/_common.scss'), 'utf8'),
  );

  if (failures.length > 0) {
    console.error('Ionic colour slots below the WCAG AA contrast floor:\n');
    for (const f of failures) console.error(`  ${f}`);
    console.error(
      '\nThese slots pin their contrast colour to a literal, so the fill must be a token that ' +
        'guarantees it. Use --primary-strong (floored at 4.5:1 by branding.service.ts), not ' +
        '--primary-color, which is deliberately exempt from that floor.',
    );
    process.exit(1);
  }

  console.log(
    `Theme contrast OK — ${GUARDED_SLOTS.length} slots clear ${MIN_RATIO}:1 in both themes.`,
  );
}

if (process.argv[1] === fileURLToPath(import.meta.url)) main();
