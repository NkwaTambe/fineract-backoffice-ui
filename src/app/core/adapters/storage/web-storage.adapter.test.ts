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
import { STORAGE_KEYS } from './storage-keys';
import { WebStorageAdapter } from './web-storage.adapter';

describe('WebStorageAdapter', () => {
  let adapter: WebStorageAdapter;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    adapter = TestBed.inject(WebStorageAdapter);

    // Storage is shared by every spec in the run, so leaving entries behind would make later
    // specs depend on the order they ran in.
    for (const entry of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(entry.key);
      sessionStorage.removeItem(entry.key);
    }
  });

  afterEach(() => {
    for (const entry of Object.values(STORAGE_KEYS)) {
      localStorage.removeItem(entry.key);
      sessionStorage.removeItem(entry.key);
    }
  });

  it('round-trips a structured value', () => {
    adapter.write('session', { username: 'mifos' });

    expect(adapter.read('session', null)).toEqual({ username: 'mifos' } as never);
  });

  it('writes each key to the storage its scope names', () => {
    adapter.write('session', 1);
    adapter.write('tenant', 2);

    expect(sessionStorage.getItem(STORAGE_KEYS.session.key)).toBe('1');
    expect(localStorage.getItem(STORAGE_KEYS.tenant.key)).toBe('2');
  });

  it('returns the fallback for an absent key', () => {
    expect(adapter.read('tenant', 'default')).toBe('default');
  });

  /*
   * `AuthService.getStoredSession()` parsed this unguarded, so a single bad character in
   * `fineract_session` threw during bootstrap and left the app on a blank screen with no
   * route to the login page.
   */
  it('returns the fallback rather than throwing on an unparseable value', () => {
    sessionStorage.setItem(STORAGE_KEYS.session.key, '{not json');

    expect(() => adapter.read('session', null)).not.toThrow();
    expect(adapter.read('session', null)).toBeNull();
  });

  it('clears every key in a scope and leaves the other scope alone', () => {
    adapter.write('session', 1);
    adapter.write('tenant', 2);

    adapter.clearScope('session');

    expect(adapter.readRaw('session')).toBeNull();
    expect(adapter.readRaw('tenant')).toBe('2');
  });

  it('leaves keys belonging to other applications on the origin untouched', () => {
    localStorage.setItem('some_other_app_key', 'keep me');

    adapter.clearScope('device');

    expect(localStorage.getItem('some_other_app_key')).toBe('keep me');
    localStorage.removeItem('some_other_app_key');
  });

  it('degrades to no-op when storage is unavailable', () => {
    vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
      throw new Error('QuotaExceededError');
    });

    expect(() => adapter.write('tenant', 'x')).not.toThrow();
  });
});
