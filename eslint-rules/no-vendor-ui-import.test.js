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

'use strict';

/**
 * Tests for the local no-vendor-ui-import rule.
 *
 *   node --test eslint-rules/
 *
 * The rule exists to hold a migration ratchet, so what matters is that it counts the same
 * violations `no-restricted-imports` used to count — no more (which would seed a wrong
 * baseline) and no fewer (which would let the backlog grow unseen). The cases below pin the
 * glob semantics and every syntax that can pull a module in.
 */

const test = require('node:test');
const { RuleTester } = require('eslint');
const tseslint = require('typescript-eslint');
const rule = require('./no-vendor-ui-import.js');

// The TypeScript parser, because the rule runs over .ts files and `import type` has to count
// the same as a value import — it still names the vendor in the file.
const ruleTester = new RuleTester({
  languageOptions: { parser: tseslint.parser, ecmaVersion: 2022, sourceType: 'module' },
});

const CONTROLLERS = ['ModalController', 'ToastController'];
const options = [
  {
    patterns: ['@ionic/angular', '@ionic/angular/*'],
    ignoreNames: CONTROLLERS,
    message: 'Use app/ui instead.',
  },
];
const restricted = [{ messageId: 'restricted' }];

test('no-vendor-ui-import', () => {
  ruleTester.run('no-vendor-ui-import', rule, {
    valid: [
      // The boundary is about the vendor, not about UI generally: CDK stays allowed.
      { code: "import { FocusKeyManager } from '@angular/cdk/a11y';", options },
      { code: "import { TabsComponent } from '../../ui/tabs/tabs.component';", options },
      // `*` must not match a sibling package whose name merely starts the same way.
      { code: "import x from '@ionic/angular-extras'; export default x;", options },
      { code: "import { Component } from '@angular/core';", options },
      // A re-export with no source has nothing to check and must not throw.
      { code: 'const IonButton = 1; export { IonButton };', options },
      // Not a module specifier, and not the `require` we mean.
      { code: "const path = require.resolve('@ionic/angular');", options },
      { code: "foo.require('@ionic/angular');", options },
      // Controllers alone are ADR 0003's boundary, reported by no-restricted-imports under its
      // own rule id. Counting them here too would cost two suppressions for one import.
      { code: "import { ModalController } from '@ionic/angular/standalone';", options },
      {
        code: "import { ModalController, ToastController } from '@ionic/angular/standalone';",
        options,
      },
      // An alias does not change which name was imported.
      { code: "import { ModalController as MC } from '@ionic/angular/standalone';", options },
      // Without the option configured, nothing is exempt — the default must not silently
      // forgive names.
      {
        code: "import { IonButton } from '@ionic/angular';",
        options: [{ patterns: ['@angular/material'] }],
      },
    ],
    invalid: [
      {
        code: "import { IonButton } from '@ionic/angular/standalone';",
        options,
        errors: restricted,
      },
      // The bare package, matched by the pattern without the trailing `/*`.
      { code: "import { IonButton } from '@ionic/angular';", options, errors: restricted },
      // Depth beyond one segment: `*` spans `/`, as it does in no-restricted-imports.
      {
        code: "import x from '@ionic/angular/standalone/directives'; export default x;",
        options,
        errors: restricted,
      },
      {
        code: "export { IonButton } from '@ionic/angular/standalone';",
        options,
        errors: restricted,
      },
      { code: "export * from '@ionic/angular/standalone';", options, errors: restricted },
      {
        code: "const m = await import('@ionic/angular/standalone'); export default m;",
        options,
        errors: restricted,
      },
      {
        code: "const m = require('@ionic/angular'); module.exports = m;",
        options,
        errors: restricted,
      },
      // Type-only imports still name the vendor in the file, and still count.
      {
        code: "import type { IonButton } from '@ionic/angular/standalone';",
        options,
        errors: restricted,
      },
      // One report per import, so the suppression counts are per statement.
      {
        code: "import { IonButton } from '@ionic/angular';\nimport { IonIcon } from '@ionic/angular/standalone';",
        options,
        errors: [{ messageId: 'restricted' }, { messageId: 'restricted' }],
      },
      // Mixed: the statement still brings a component across the boundary.
      {
        code: "import { IonButton, ModalController } from '@ionic/angular/standalone';",
        options,
        errors: restricted,
      },
      // A namespace or default import names nothing specific, so it cannot be exempt.
      {
        code: "import * as ionic from '@ionic/angular/standalone'; export default ionic;",
        options,
        errors: restricted,
      },
      // Re-exporting the vendor from outside the boundary is the leak, not an exemption.
      {
        code: "export { ModalController } from '@ionic/angular/standalone';",
        options,
        errors: restricted,
      },
    ],
  });
});
