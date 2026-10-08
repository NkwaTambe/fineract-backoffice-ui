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

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { BrandingService, BRANDABLE_TOKENS } from './branding.service';
import { ConfigService, type BrandingConfig } from './config.service';

/**
 * What `BrandingService` writes into the document, and what it refuses to.
 *
 * The interesting property here is a security one. This service builds a stylesheet by string
 * concatenation and assigns it to `style.textContent`, and every value in it arrives from a
 * `branding/config.json` the application fetched. That is a CSS-injection sink, and the only
 * thing between it and an attacker-controlled file is the token allow-list and the two value
 * validators. Those are asserted directly here rather than left as a claim in a review comment.
 *
 * The file is not attacker-controlled in a correct deployment — it is mounted into the image
 * alongside the application. But "the input is trusted" is exactly the assumption that stops
 * being true when someone later makes the overlay writable, so the guard is tested as if it
 * were not.
 */
describe('BrandingService', () => {
  function serviceFor(branding: BrandingConfig) {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({
      providers: [{ provide: ConfigService, useValue: { config: () => ({ branding }) } }],
    });
    return TestBed.inject(BrandingService);
  }

  function stylesheetFor(branding: BrandingConfig): { css: string; defects: string[] } {
    const doc = document.implementation.createHTMLDocument('test');
    const service = serviceFor(branding);
    service.apply(doc);
    return {
      css: doc.getElementById('fineract-branding')?.textContent ?? '',
      defects: service.brandingDefects().map((d) => `${d.code}:${d.key}`),
    };
  }

  beforeEach(() => {
    // The service reports every rejection through console.warn; silence it so a deliberately
    // hostile fixture does not look like a failing test.
    vi.spyOn(console, 'warn').mockImplementation(() => undefined);
  });

  it('writes only the tokens it was given, as custom properties', () => {
    const { css, defects } = stylesheetFor({
      tokens: { light: { 'primary-color': '#0b5f8a', 'border-radius': '4px' } },
    });

    expect(defects).toEqual([]);
    expect(css).toContain('--primary-color: #0b5f8a;');
    expect(css).toContain('--border-radius: 4px;');
  });

  describe('refuses to be used as a CSS injection vector', () => {
    it.each([
      ['closing the rule and opening another', '#fff; } body { display: none } .x {'],
      ['an expression', 'expression(alert(1))'],
      ['a url() callback', 'url(https://evil.test/x)'],
      ['an @import', '#fff; } @import url(//evil.test/x); .y {'],
      ['a bare identifier', 'red'],
      ['an empty value', ''],
    ])('rejects a colour value %s', (_label, value) => {
      const { css, defects } = stylesheetFor({
        tokens: { light: { 'primary-color': value } },
      });

      expect(defects).toContain('invalid-value:primary-color');
      expect(css).not.toContain('display');
      expect(css).not.toContain('@import');
      expect(css).not.toContain('expression');
      expect(css).not.toContain('url(');
      // Nothing was emitted for it at all, so the shipped colour stands.
      expect(css).not.toContain('--primary-color');
    });

    it.each([
      ['a closing brace', '4px; } body { display: none } .x {'],
      ['a url() callback', 'url(https://evil.test/x)'],
      ['a calc with a semicolon', '1px; color: red'],
      ['something that is not a length', 'auto'],
    ])('rejects a length value with %s', (_label, value) => {
      const { css, defects } = stylesheetFor({
        tokens: { light: { 'border-radius': value } },
      });

      expect(defects).toContain('invalid-value:border-radius');
      expect(css).not.toContain('--border-radius');
      expect(css).not.toContain('display');
    });

    it('rejects a token name that tries to smuggle a declaration', () => {
      const { css, defects } = stylesheetFor({
        tokens: { light: { 'primary-color: red; --x': '#0b5f8a' } },
      });

      expect(defects).toEqual(['unknown-token:primary-color: red; --x']);
      expect(css).toBe('');
    });

    it('rejects any name outside the published allow-list', () => {
      const { css, defects } = stylesheetFor({
        tokens: { light: { 'shadow-md': '0 0 0 red' } },
      });

      expect(defects).toEqual(['unknown-token:shadow-md']);
      expect(css).toBe('');
    });

    it('emits nothing but allow-listed custom properties, whatever it is handed', () => {
      // Belt and braces: whatever survives validation, every property name in the finished
      // stylesheet has to be one this project published or one of Ionic's derived companions.
      const { css } = stylesheetFor({
        tokens: {
          light: Object.fromEntries(BRANDABLE_TOKENS.map((t) => [t, '#123456'])),
          dark: { 'primary-color': '#5fb3e0' },
        },
      });

      const emitted = [...css.matchAll(/^\s+(--[\w-]+):/gm)].map((m) => m[1]);
      expect(emitted.length).toBeGreaterThan(0);
      for (const property of emitted) {
        const isBrandable = BRANDABLE_TOKENS.includes(property.slice(2));
        // The bare `--ion-color-<name>` is the fill itself, emitted so a branded colour and the
        // label derived from it stay together (#613); the suffixed ones are its companions.
        const isIonicCompanion =
          /^--ion-color-[a-z]+(-(rgb|shade|tint|contrast|contrast-rgb))?$/.test(property);
        expect(isBrandable || isIonicCompanion, `unexpected property ${property}`).toBe(true);
      }
    });

    it('rejects primary-text overrides that fail WCAG AA contrast against white in light mode', () => {
      const { css, defects } = stylesheetFor({
        tokens: { light: { 'primary-text': '#3498db' } }, // 3.15:1 contrast on white (fails AA)
      });

      expect(defects).toContain('low-contrast:primary-text');
      expect(css).not.toContain('--primary-text');
    });

    it('accepts primary-text overrides that pass WCAG AA contrast against white in light mode', () => {
      const { css, defects } = stylesheetFor({
        tokens: { light: { 'primary-text': '#1f6391' } }, // 6.54:1 contrast on white (passes AA)
      });

      expect(defects).toEqual([]);
      expect(css).toContain('--primary-text: #1f6391;');
    });

    it('rejects primary-text overrides in dark mode that fail contrast against dark backgrounds', () => {
      const { css, defects } = stylesheetFor({
        tokens: { dark: { 'primary-text': '#1f6391' } }, // ~2.45:1 against black (fails dark AA)
      });

      expect(defects).toContain('low-contrast:primary-text');
      expect(css).not.toContain('--primary-text');
    });

    it('accepts primary-text overrides in dark mode that pass contrast against dark backgrounds', () => {
      const { css, defects } = stylesheetFor({
        tokens: { dark: { 'primary-text': '#5dade2' } }, // ~8.90:1 against black (passes dark AA)
      });

      expect(defects).toEqual([]);
      expect(css).toContain('--primary-text: #5dade2;');
    });
  });

  describe('the Ionic primary fill (#613)', () => {
    /**
     * `_ionic-theme.scss` defaults `--ion-color-primary` to `--primary-strong`, the token held
     * to a contrast floor against the white the shipped palette pins beside it. A branded
     * deployment has to override that default here rather than inherit it, and the fill has to
     * travel with the label derived from the same hex — otherwise a pale accent keeps the
     * default dark fill while its label turns black.
     */
    it('emits the fill next to the companions derived from it', () => {
      const { css } = stylesheetFor({ tokens: { light: { 'primary-color': '#0b5f8a' } } });

      expect(css).toContain('--ion-color-primary: #0b5f8a');
      expect(css).toContain('--ion-color-primary-rgb: 11, 95, 138');
      expect(css).toContain('--ion-color-primary-contrast: #ffffff');
    });

    it('keeps a pale accent usable by pairing it with a dark label', () => {
      const { css } = stylesheetFor({ tokens: { light: { 'primary-color': '#9fd8ff' } } });

      expect(css).toContain('--ion-color-primary: #9fd8ff');
      expect(css).toContain('--ion-color-primary-contrast: #000000');
    });

    it('leaves the slot alone when no primary colour is branded', () => {
      const { css } = stylesheetFor({ tokens: { light: { 'border-radius': '4px' } } });

      expect(css).not.toContain('--ion-color-primary');
    });
  });

  describe('asset paths', () => {
    it.each([
      ['an absolute URL', 'https://evil.test/logo.svg'],
      ['a protocol-relative URL', '//evil.test/logo.svg'],
      ['a javascript: URI', 'javascript:alert(1)'],
      ['a data: URI', 'data:image/svg+xml;base64,PHN2Zz48L3N2Zz4='],
    ])('refuses %s for the favicon', (_label, value) => {
      const doc = document.implementation.createHTMLDocument('test');
      const service = serviceFor({ faviconUrl: value });
      service.apply(doc);

      expect(service.brandingDefects().map((d) => d.code)).toContain('unsafe-asset-path');
      expect(doc.querySelector("link[rel='icon']")).toBeNull();
    });

    it('accepts a same-origin relative path', () => {
      const doc = document.implementation.createHTMLDocument('test');
      const service = serviceFor({ faviconUrl: 'branding/favicon.svg' });
      service.apply(doc);

      expect(service.brandingDefects()).toEqual([]);
      expect(doc.querySelector("link[rel='icon']")?.getAttribute('href')).toBe(
        'branding/favicon.svg',
      );
    });
  });
});
