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

import { KEYBOARD_SHORTCUTS, isTypingTarget, matchShortcut } from './keyboard-shortcuts';

describe('matchShortcut', () => {
  it('matches a shortcut by key and exact modifier combination', () => {
    const event = { key: 'c', altKey: true, ctrlKey: false, shiftKey: false };
    expect(matchShortcut(event)).toEqual({ key: 'c', altKey: true, route: '/clients/create' });
  });

  it('is case-insensitive on the key', () => {
    const event = { key: 'C', altKey: true, ctrlKey: false, shiftKey: false };
    expect(matchShortcut(event)?.route).toBe('/clients/create');
  });

  it('requires every modifier to match, not just the bound ones', () => {
    const withShift = { key: 'c', altKey: true, ctrlKey: false, shiftKey: true };
    expect(matchShortcut(withShift)).toBeUndefined();

    const withCtrl = { key: 'c', altKey: true, ctrlKey: true, shiftKey: false };
    expect(matchShortcut(withCtrl)).toBeUndefined();
  });

  it('returns undefined for a key with no binding', () => {
    const event = { key: 'z', altKey: true, ctrlKey: false, shiftKey: false };
    expect(matchShortcut(event)).toBeUndefined();
  });

  it('returns undefined for a bound key pressed with no modifiers', () => {
    const event = { key: 'c', altKey: false, ctrlKey: false, shiftKey: false };
    expect(matchShortcut(event)).toBeUndefined();
  });

  it('resolves the help action', () => {
    const event = { key: 'h', altKey: true, ctrlKey: false, shiftKey: false };
    expect(matchShortcut(event)).toEqual({ key: 'h', altKey: true, action: 'help' });
  });

  it('every configured shortcut is reachable through its own binding', () => {
    for (const shortcut of KEYBOARD_SHORTCUTS) {
      const event = {
        key: shortcut.key,
        altKey: !!shortcut.altKey,
        ctrlKey: !!shortcut.ctrlKey,
        shiftKey: !!shortcut.shiftKey,
      };
      expect(matchShortcut(event)).toBe(shortcut);
    }
  });
});

describe('isTypingTarget', () => {
  it('is false for null', () => {
    expect(isTypingTarget(null)).toBe(false);
  });

  it('is false for a plain element, like the document body', () => {
    expect(isTypingTarget(document.body)).toBe(false);
  });

  it.each(['INPUT', 'TEXTAREA', 'SELECT', 'ION-INPUT', 'ION-TEXTAREA', 'ION-SEARCHBAR'])(
    'is true for a %s element',
    (tagName) => {
      expect(isTypingTarget(document.createElement(tagName))).toBe(true);
    },
  );

  it('is true for a contenteditable element', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'true');
    expect(isTypingTarget(div)).toBe(true);
  });

  it('is true for the shorthand contenteditable attribute', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', '');
    expect(isTypingTarget(div)).toBe(true);
  });

  it('is false for an explicitly non-editable element', () => {
    const div = document.createElement('div');
    div.setAttribute('contenteditable', 'false');
    expect(isTypingTarget(div)).toBe(false);
  });
});
