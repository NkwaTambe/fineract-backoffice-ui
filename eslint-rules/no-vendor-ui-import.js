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
 * The UI-component boundary of ADR 0005, as a rule of its own.
 *
 * ## Why this is not `no-restricted-imports`
 *
 * It was, and that was the bug. `eslint-suppressions.json` counts violations per *rule id*, and
 * `no-restricted-imports` already carried the Material and `@ngx-translate` backlogs from
 * ADR 0003. Seeding the ~280 existing Ionic component imports into the same counter made the
 * three boundaries fungible: a file allowed two violations could drop its Ionic import, add a
 * second `@ngx-translate` import, and the ratchet would not move. The i18n boundary was
 * enforced in name while its backlog could silently grow.
 *
 * Separating the boundary onto its own rule id gives it its own counter. `no-restricted-imports`
 * goes back to guarding only what it guarded before — Material, Ionic's imperative controllers
 * and direct `@ngx-translate` — at the counts it had then, and an Ionic import can no longer pay
 * for an i18n one.
 *
 * ## What it reports
 *
 * Any module specifier matching one of `patterns`, from an `import`, `export ... from`, a
 * dynamic `import()` with a literal argument, or `require()`. Configure with:
 *
 *   ['error', { patterns: ['@ionic/angular', '@ionic/angular/*'], ignoreNames: [...], message: '…' }]
 *
 * `ignoreNames` keeps each import on exactly one boundary. An import that pulls nothing but
 * Ionic's imperative controllers is ADR 0003's business — `no-restricted-imports` already
 * reports it by name — so counting it here too would make one statement cost two suppressions
 * and two decrements to migrate. A *mixed* import still counts here, because it does bring a
 * component in.
 *
 * Turn it off — via a `files` override — for the directories that are allowed to name the
 * vendor: the UI implementations themselves, the imperative adapters and the composition roots.
 * That is deliberately a config decision rather than an option here, so the allowed set reads
 * in one place next to the other boundary overrides.
 *
 * `*` matches any run of characters including `/`, which is the same shape
 * `no-restricted-imports` uses, so patterns can be moved between the two without rewriting.
 *
 * @see DOCS/adr/0005-ui-boundary.md
 */

/**
 * Turn one `no-restricted-imports`-style pattern into an anchored regular expression.
 *
 * Split on `*` and escape the literal pieces, rather than escaping everything and putting the
 * wildcards back through a sentinel: the sentinel round-trip is what let a raw control
 * character into this file once already.
 */
function toMatcher(pattern) {
  const escaped = pattern
    .split('*')
    .map((part) => part.replaceAll(/[.+?^${}()|[\]\\]/g, (char) => `\\${char}`))
    .join('.*');
  return new RegExp(`^${escaped}$`);
}

module.exports = {
  meta: {
    type: 'problem',
    docs: {
      description:
        'Keep vendor UI component imports inside the app-owned UI boundary, on a rule id of their own so the migration ratchet cannot be spent on an unrelated boundary',
      recommended: true,
    },
    schema: [
      {
        type: 'object',
        properties: {
          patterns: { type: 'array', items: { type: 'string' }, minItems: 1 },
          ignoreNames: { type: 'array', items: { type: 'string' } },
          message: { type: 'string' },
        },
        required: ['patterns'],
        additionalProperties: false,
      },
    ],
    messages: {
      restricted: "'{{source}}' may not be imported here. {{message}}",
    },
  },

  create(context) {
    const { patterns, ignoreNames = [], message = '' } = context.options[0] ?? { patterns: [] };
    const matchers = patterns.map((pattern) => toMatcher(pattern));
    const ignored = new Set(ignoreNames);

    function check(node, source) {
      if (typeof source !== 'string') return;
      if (!matchers.some((matcher) => matcher.test(source))) return;
      context.report({ node, messageId: 'restricted', data: { source, message } });
    }

    /**
     * True when every name this clause brings in is one another boundary already owns.
     * A namespace or default import names nothing specific, so it never qualifies — and
     * neither does a re-export, whose specifiers are `ExportSpecifier`: handing the vendor
     * onward from outside the boundary is the leak this rule exists to catch.
     */
    function onlyIgnoredNames(node) {
      if (ignored.size === 0) return false;
      const specifiers = node.specifiers ?? [];
      if (specifiers.length === 0) return false;
      return specifiers.every(
        (specifier) =>
          specifier.type === 'ImportSpecifier' && ignored.has(specifier.imported?.name),
      );
    }

    /** `import x from 'y'`, `export * from 'y'`, `export { x } from 'y'`. */
    function fromClause(node) {
      // A bare `export { x }` re-exports a local binding and has no source.
      if (!node.source) return;
      if (onlyIgnoredNames(node)) return;
      check(node.source, node.source.value);
    }

    return {
      ImportDeclaration: fromClause,
      ExportAllDeclaration: fromClause,
      ExportNamedDeclaration: fromClause,

      ImportExpression(node) {
        if (node.source?.type === 'Literal') check(node.source, node.source.value);
      },

      CallExpression(node) {
        if (node.callee.type !== 'Identifier' || node.callee.name !== 'require') return;
        const [argument] = node.arguments;
        if (argument?.type === 'Literal') check(argument, argument.value);
      },
    };
  },
};
