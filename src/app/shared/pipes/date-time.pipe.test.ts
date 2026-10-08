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

import { TestBed } from '@angular/core/testing';
import { signal } from '@angular/core';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { DateTimePipe } from './date-time.pipe';
import { I18N } from '../../core/adapters/i18n/i18n.adapter';

describe('DateTimePipe', () => {
  const SAMPLE_ISO = '2026-09-15T12:00:00Z';

  let pipe: DateTimePipe;
  let lang: ReturnType<typeof signal<string>>;

  beforeEach(() => {
    lang = signal('en');
    TestBed.configureTestingModule({
      providers: [DateTimePipe, { provide: I18N, useValue: { currentLang: lang } }],
    });
    pipe = TestBed.inject(DateTimePipe);
  });

  it('creates an instance', () => {
    expect(pipe).toBeTruthy();
  });

  describe('input handling', () => {
    it('formats a Date object', () => {
      expect(pipe.transform(new Date(SAMPLE_ISO))).toContain('2026');
    });

    it('formats an ISO string', () => {
      expect(pipe.transform(SAMPLE_ISO)).toContain('2026');
    });

    it('formats an epoch number', () => {
      expect(pipe.transform(new Date(SAMPLE_ISO).getTime())).toContain('2026');
    });

    it('returns "" for null', () => {
      expect(pipe.transform(null)).toBe('');
    });

    it('returns "" for undefined', () => {
      expect(pipe.transform(undefined)).toBe('');
    });

    it('returns "" for an empty string', () => {
      expect(pipe.transform('')).toBe('');
    });

    it('returns "" for an unparseable string', () => {
      expect(pipe.transform('not-a-date')).toBe('');
    });

    it('formats epoch 0 rather than treating it as empty', () => {
      expect(pipe.transform(0)).not.toBe('');
    });
  });

  describe('format', () => {
    it('includes month name, year, time and a timezone label', () => {
      const result = pipe.transform(SAMPLE_ISO);
      expect(result).toContain('Sep');
      expect(result).toContain('2026');
      expect(result).toMatch(/\d{1,2}:\d{2}:\d{2}/);
      expect(result).toMatch(/AM|PM/);
      expect(result).toMatch(/GMT|UTC|[A-Z]{2,5}/);
    });
  });

  describe('locale mapping', () => {
    it('uses en-US for "en"', () => {
      lang.set('en');
      expect(pipe.transform(SAMPLE_ISO)).toContain('Sep');
    });

    it('formats differently for "hi" than for "en"', () => {
      lang.set('en');
      const en = pipe.transform(SAMPLE_ISO);
      lang.set('hi');
      const hi = pipe.transform(SAMPLE_ISO);
      expect(hi).not.toBe(en);
    });

    it('formats differently for "ko" than for "en"', () => {
      lang.set('en');
      const en = pipe.transform(SAMPLE_ISO);
      lang.set('ko');
      const ko = pipe.transform(SAMPLE_ISO);
      expect(ko).not.toBe(en);
    });

    it('passes an unmapped language straight through to Intl', () => {
      lang.set('fr');
      const fr = pipe.transform(SAMPLE_ISO);
      lang.set('en');
      const en = pipe.transform(SAMPLE_ISO);
      expect(fr).not.toBe('');
      expect(fr).not.toBe(en);
    });

    it('falls back to en-US when the language is empty', () => {
      lang.set('');
      expect(pipe.transform(SAMPLE_ISO)).toContain('Sep');
    });
  });

  describe('memoization', () => {
    const RealDTF = Intl.DateTimeFormat;
    let spy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      spy = vi.spyOn(Intl, 'DateTimeFormat').mockImplementation(function (
        this: unknown,
        ...args: ConstructorParameters<typeof Intl.DateTimeFormat>
      ) {
        return new RealDTF(...args);
      } as unknown as typeof Intl.DateTimeFormat);
    });

    afterEach(() => {
      vi.restoreAllMocks();
    });

    it('does not rebuild the formatter for identical repeated calls', () => {
      pipe.transform(SAMPLE_ISO);
      pipe.transform(SAMPLE_ISO);
      pipe.transform(SAMPLE_ISO);
      expect(spy).toHaveBeenCalledTimes(1);
    });

    it('rebuilds when the language changes', () => {
      pipe.transform(SAMPLE_ISO);
      lang.set('hi');
      pipe.transform(SAMPLE_ISO);
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('rebuilds when the date changes', () => {
      pipe.transform(SAMPLE_ISO);
      pipe.transform('2026-09-16T12:00:00Z');
      expect(spy).toHaveBeenCalledTimes(2);
    });

    it('returns the cached value unchanged on a repeat call', () => {
      const first = pipe.transform(SAMPLE_ISO);
      const second = pipe.transform(SAMPLE_ISO);
      expect(second).toBe(first);
    });
  });
});
