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

/** A single global keyboard shortcut: either a route to navigate to, or a named action. */
export interface KeyboardShortcut {
  key: string;
  altKey?: boolean;
  ctrlKey?: boolean;
  shiftKey?: boolean;
  route?: string;
  action?: 'help';
}

/**
 * Global navigation shortcuts, modelled on web-app's `keyboards-shortcut-config.ts`.
 *
 * All bindings use Alt rather than Ctrl: web-app's Ctrl+<letter> combinations (Ctrl+N, Ctrl+T,
 * Ctrl+F, ...) collide with browser/OS-reserved shortcuts (new window, new tab, find) that
 * page JavaScript never sees, so most of them are silently dead in every major browser. Alt+
 * combinations are not reserved for single letters and reach the page reliably.
 */
export const KEYBOARD_SHORTCUTS: KeyboardShortcut[] = [
  { key: 'd', altKey: true, route: '/dashboard' },
  { key: 'c', altKey: true, route: '/clients/create' },
  { key: 'g', altKey: true, route: '/groups/create' },
  { key: 'e', altKey: true, route: '/centers/create' },
  { key: 'a', altKey: true, route: '/accounting' },
  { key: 'r', altKey: true, route: '/reporting' },
  { key: 't', altKey: true, route: '/tasks' },
  { key: 's', altKey: true, route: '/search' },
  { key: 'h', altKey: true, action: 'help' },
];

/** Finds the shortcut matching a keydown event's modifier combination and key, if any. */
export function matchShortcut(
  event: Pick<KeyboardEvent, 'key' | 'altKey' | 'ctrlKey' | 'shiftKey'>,
  shortcuts: readonly KeyboardShortcut[] = KEYBOARD_SHORTCUTS,
): KeyboardShortcut | undefined {
  return shortcuts.find(
    (s) =>
      s.key.toLowerCase() === event.key.toLowerCase() &&
      !!s.altKey === event.altKey &&
      !!s.ctrlKey === event.ctrlKey &&
      !!s.shiftKey === event.shiftKey,
  );
}

/** True while the user is typing into a form control — shortcuts must not fire over that. */
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false;
  // Checked as an attribute rather than via `isContentEditable`: the latter is a computed,
  // inherited value that some DOM test environments never finish wiring up for a detached or
  // freshly-attached element, where the attribute itself is unambiguous either way.
  const editable = target.getAttribute('contenteditable');
  if (editable === 'true' || editable === '') return true;
  return ['INPUT', 'TEXTAREA', 'SELECT', 'ION-INPUT', 'ION-TEXTAREA', 'ION-SEARCHBAR'].includes(
    target.tagName,
  );
}
