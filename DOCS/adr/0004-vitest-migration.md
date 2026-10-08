<!--
Licensed to the Apache Software Foundation (ASF) under one
or more contributor license agreements.  See the NOTICE file
distributed with this work for additional information
regarding copyright ownership.  The ASF licenses this file
to you under the Apache License, Version 2.0 (the
"License"); you may not use this file except in compliance
with the License.  You may obtain a copy of the License at

  http://www.apache.org/licenses/LICENSE-2.0

Unless required by applicable law or agreed to in writing,
software distributed under the License is distributed on an
"AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
KIND, either express or implied.  See the License for the
specific language governing permissions and limitations
under the License.
-->

# ADR 0004: Migrating the unit suite from Karma to Vitest

## Context

Both projects run their unit suites on `@angular/build:karma`. Karma is deprecated upstream, and
the builder that wraps it will not outlive it. This is not speculative future-proofing against a
dependency that _might_ break: it is a scheduled removal on someone else's calendar.

The repository is already half-committed to the replacement without benefiting from it —
`vitest@4` has been in `devDependencies` for some time with nothing wired to it. Carrying both
runners while using only the deprecated one is the worst available position.

The size of the move, measured rather than estimated:

|                                         | Count                  |
| --------------------------------------- | ---------------------- |
| Spec files                              | 219                    |
| Files using `jasmine.*`                 | 182 (886 sites)        |
| `jasmine.createSpyObj`                  | 413 sites in 176 files |
| `jasmine.SpyObj<T>` annotations         | 358 sites in 172 files |
| `.and.returnValue`                      | 554 sites in 171 files |
| `toBeTrue` / `toBeFalse` / `toHaveSize` | 544 sites              |
| `fakeAsync` / `tick` / `flush`          | 5 / 6 / 9 files        |

Nearly all of that is dialect: a different spelling for the same intent. A small, identifiable
remainder is not.

## Decision

Migrate incrementally, with both runners live until the old one is empty. Four parts:

### 1. The runners select by filename

- `*.spec.ts` — Jasmine dialect, run by Karma (`npm test`). Legacy, shrinking.
- `*.test.ts` — Vitest dialect, run by Vitest (`npm run test:unit`). Everything new.

The `test` target's `include` is narrowed to `**/*.spec.ts` and the new `unit-test` target takes
`**/*.test.ts`. A migration is therefore a rename plus a dialect swap, both mechanical, and
progress is countable without a tracking document that drifts.

The alternative — one glob, and a manifest naming which files run where — was rejected because
it puts the two runners in a position to disagree about ownership of a file, and the symptom of
that disagreement is a spec that silently runs in neither.

### 2. A ratchet, not a deadline

`scripts/check-test-runner.mjs` records the remaining Karma specs in `karma-baseline.json`.
Files may leave the set; nothing may join it. `--write` re-records after a batch moves, and
**refuses to write a baseline that grew**, so the ratchet cannot be released by running the
command that documents it.

This is deliberately the same mechanism as `eslint-suppressions.json` (ADR 0003). A migration
without it does not stall — it regresses, because new specs land on the deprecated runner faster
than old ones leave it, and the finish line recedes while everyone believes the work is
progressing.

Specs already in flight in an open pull request when this landed are listed under
`grandfathered` and admitted. Failing somebody's open PR for not following a convention
introduced after they started it is a reliable way to make a migration unpopular. They are kept
in a separate key from `specs` so the exception stays visible and finite, and so `--write`
cannot quietly reclassify one as normal. At the time of writing there is exactly one, from
PR #325.

### 3. A codemod for the dialect, and honesty about its limits

`scripts/codemod-jasmine-to-vitest.mjs` rewrites the mechanical part and performs the rename. It
converts 187 of the 215 remaining specs. It **skips whole files** using `fakeAsync`, `tick`,
`flush`, `done()` callbacks, `jasmine.clock` or the object form of `createSpyObj`, and reports
them, because those carry zone or callback semantics rather than a spelling.

Skipping whole files rather than converting them partially is the important half of that rule. A
half-converted spec that still compiles is the bad outcome: it reads as finished in review.

`src/app/testing/mocks.ts` supplies `SpyObj<T>` and `createSpyObj<T>()`, reproducing Jasmine's
typing **including its unsoundness** — `SpyObj<T>` claims every member of `T` while the factory
creates only the listed ones, exactly as `jasmine.SpyObj<T>` did. Tightening that is worth doing
as its own change, against a green suite, where each error it surfaces is unambiguously a spec
that was lying rather than migration fallout.

### 4. jsdom is not Chrome

Karma ran a real browser, so every DOM API simply existed. Vitest's default environment is jsdom,
which has no layout. Three gaps surfaced immediately and are stubbed in
`src/testing/vitest-setup.ts`: `CSS.escape` (absent entirely), `Element.prototype.scrollTo`
(Ionic's `ion-segment` scrolls the active button into view during change detection) and
`window.matchMedia` (read by `ThemeService`).

Separately, `@ionic/angular` reaches `@ionic/core/components` as a _directory_ import, which
Node's ESM resolver rejects. Under Karma the bundler resolved it; under Vitest the package is
externalised and handed to Node, so every Ionic-touching spec fails to load. `vitest.config.ts`
inlines the package, putting resolution back in Vite's hands.

## Consequences

**Positive**

- New tests land on the supported runner from the moment this is merged.
- The deprecated surface can only shrink, and the remaining count is one command away.
- Vitest runs the migrated 30 files in ~15s against Karma's whole-suite ~16s, without a browser.
- Specs stop depending on a real browser, which is what makes them runnable in more places.

**Negative**

- Two runners, two configs and two dialects coexist until the baseline reaches zero. This is a
  real cost paid for the ability to migrate in reviewable batches.
- `@angular/build:unit-test` is marked `[EXPERIMENTAL]` upstream. It is nonetheless Angular's
  sanctioned path off Karma, and the alternative is staying on something already deprecated.
- The jsdom stubs are a standing approximation of a browser. Each is narrow and commented, but
  they are fidelity that Karma did not have to fake.

**Open question — browser mode**

Vitest can run in a real Chrome via Playwright, which would delete `vitest-setup.ts` entirely and
restore Karma's fidelity. It is slower and heavier. That trade should be decided against a fully
migrated suite rather than made a precondition for migrating, so it is deliberately left open.

## Completion

The final Karma specs migrated in PR #476. The temporary Karma runner configuration, migration
ratchet and codemod were removed afterwards; Vitest is now the sole unit-test runner.

## Original migration state

At the time this ADR was written: **30 migrated, 192 remaining**. Karma ran 921 tests and Vitest
270 — 1,191 in total, the same as before the split, so nothing was lost in the move. The Vitest
half included Ionic component rendering.
