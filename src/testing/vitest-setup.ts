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
 * Browser APIs jsdom does not implement, stubbed for the Vitest runner.
 *
 * Vitest's default environment is jsdom, which is a DOM *implementation* rather than a browser:
 * it has no layout, so anything measuring or scrolling is absent, and a handful of newer globals
 * are simply not there. Each stub below exists because a real spec failed without it, and each is
 * written to be honest about what it does not do.
 *
 * The alternative to stubbing is Vitest's browser mode, which runs the suite in a real Chrome
 * via Playwright and needs none of this. That is the better long-run answer and is recorded as
 * the open question in DOCS/adr/0004-vitest-migration.md — it is a slower, heavier runner, and
 * choosing it should be a decision made against a migrated suite rather than a precondition for
 * migrating.
 */

// `CSS.escape` — used by specs to build `[data-testid="..."]` selectors safely. jsdom has no
// `CSS` object at all. The polyfill covers the identifier characters those selectors contain;
// it is not a complete CSSOM `escape` implementation and is not used by application code.
if (globalThis.CSS === undefined) {
  (globalThis as { CSS?: unknown }).CSS = {};
}
const cssObject = globalThis.CSS as unknown as { escape?: (value: string) => string };
cssObject.escape ??= (value: string) => String(value).replaceAll(/[^\w-]/g, (ch) => `\\${ch}`);

// `Element.prototype.scrollTo` — Ionic's `ion-segment` scrolls the active button into view on
// render. jsdom has no layout and no scrolling, so the method is absent and the call throws
// during change detection, failing specs that never mention scrolling. A no-op is correct here:
// there is no viewport for the result to be observable in.
const noop = () => {
  /* jsdom has no viewport, so there is nothing for a scroll to do. */
};
Element.prototype.scrollTo ??= noop;
Element.prototype.scrollIntoView ??= noop;

// `IntersectionObserver` — Ionic's `ion-datetime` waits for its calendar to become visible before
// it marks itself ready and installs interaction listeners. jsdom has no layout and does not
// implement the API, so observed elements are reported as intersecting immediately. This matches
// the visible component state our tests render without leaving Ionic permanently half-initialized.
if (globalThis.IntersectionObserver === undefined) {
  class IntersectionObserverStub implements IntersectionObserver {
    readonly root = null;
    readonly rootMargin = '0px 0px 0px 0px';
    readonly scrollMargin = '0px 0px 0px 0px';
    readonly thresholds = [0];

    constructor(private readonly callback: IntersectionObserverCallback) {}

    disconnect = noop;
    takeRecords = (): IntersectionObserverEntry[] => [];
    unobserve = noop;

    observe(target: Element): void {
      const bounds = target.getBoundingClientRect();
      this.callback(
        [
          {
            boundingClientRect: bounds,
            intersectionRatio: 1,
            intersectionRect: bounds,
            isIntersecting: true,
            rootBounds: null,
            target,
            time: performance.now(),
          },
        ],
        this,
      );
    }
  }

  Object.defineProperty(globalThis, 'IntersectionObserver', {
    configurable: true,
    value: IntersectionObserverStub,
  });
}

// `window.matchMedia` — read by `ThemeService` to follow the OS colour-scheme preference.
// jsdom's implementation lacks the `EventTarget` half, so a listener registration throws.
// Defaulting `matches` to `false` means "no preference expressed", which is what a spec that
// does not stub it should see.
if (window !== undefined && typeof window.matchMedia !== 'function') {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: noop,
    removeEventListener: noop,
    addListener: noop,
    removeListener: noop,
    dispatchEvent: () => false,
  })) as typeof window.matchMedia;
}
