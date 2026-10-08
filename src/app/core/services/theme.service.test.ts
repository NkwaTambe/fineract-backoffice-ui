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

import type { Mock } from 'vitest';
import { TestBed } from '@angular/core/testing';
import { FakeStorageAdapter, provideFakeAdapters } from '../../testing/adapters';
import { ThemeService } from './theme.service';

describe('ThemeService', () => {
  const DARK_THEME = 'dark';
  const DATA_THEME = 'data-theme';

  let service: ThemeService;
  let storage: FakeStorageAdapter;
  let providers: ReturnType<typeof provideFakeAdapters>['providers'];

  beforeEach(() => {
    const fakes = provideFakeAdapters();
    storage = fakes.storage;
    providers = fakes.providers;

    vi.spyOn(document.documentElement, 'setAttribute');
    vi.spyOn(document.documentElement, 'removeAttribute');
    // With no saved theme the service falls back to the OS preference, so
    // without this stub these specs pass or fail depending on the machine
    // running them — dark-mode CI agents saw "expected true to be false".
    vi.spyOn(window, 'matchMedia').mockReturnValue({ matches: false } as MediaQueryList);
  });

  const createService = () => {
    TestBed.resetTestingModule();
    TestBed.configureTestingModule({ providers: [ThemeService, ...providers] });
    service = TestBed.inject(ThemeService);
  };

  it('should initialize to light mode when savedTheme is not dark', () => {
    createService();
    expect(service.isDarkMode()).toBe(false);
    expect(document.documentElement.removeAttribute).toHaveBeenCalledWith(DATA_THEME);
    expect(storage.readRaw('theme')).toBe('light');
  });

  it('should follow the OS preference when no theme is saved', () => {
    (window.matchMedia as Mock).mockReturnValue({ matches: true } as MediaQueryList);
    createService();
    expect(service.isDarkMode()).toBe(true);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(DATA_THEME, DARK_THEME);
  });

  it('should initialize to dark mode when savedTheme is dark', () => {
    storage.writeRaw('theme', DARK_THEME);
    createService();
    expect(service.isDarkMode()).toBe(true);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(DATA_THEME, DARK_THEME);
    expect(storage.readRaw('theme')).toBe(DARK_THEME);
  });

  it('should toggle dark mode state', () => {
    createService();
    expect(service.isDarkMode()).toBe(false);

    service.toggleDarkMode();
    expect(service.isDarkMode()).toBe(true);
    expect(document.documentElement.setAttribute).toHaveBeenCalledWith(DATA_THEME, DARK_THEME);
    expect(storage.readRaw('theme')).toBe(DARK_THEME);

    service.toggleDarkMode();
    expect(service.isDarkMode()).toBe(false);
    expect(storage.readRaw('theme')).toBe('light');
  });
});
