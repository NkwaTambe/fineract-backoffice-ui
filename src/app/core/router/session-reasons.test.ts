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

import { describe, expect, it } from 'vitest';
import {
  INACTIVITY_REASON,
  LOGOUT_REASONS,
  LOGOUT_REASON_MESSAGE,
  SESSION_EXPIRED_REASON,
  toLogoutReason,
  type LogoutReason,
} from './session-reasons';

describe('logout reasons', () => {
  /**
   * The regression in #612: `IdleService` sent `inactivity` and the login screen compared only
   * against `session-expired`, so the common logout path explained nothing.
   */
  it('recognises every reason the app can send', () => {
    expect(toLogoutReason('session-expired')).toBe(SESSION_EXPIRED_REASON);
    expect(toLogoutReason('inactivity')).toBe(INACTIVITY_REASON);
  });

  it('gives every reason its own message, so none can be silently unhandled', () => {
    for (const reason of LOGOUT_REASONS) {
      expect(LOGOUT_REASON_MESSAGE[reason]).toBeTruthy();
    }
    // Distinct copy: "expired" and "signed out for inactivity" are different facts.
    const messages = Object.values(LOGOUT_REASON_MESSAGE);
    expect(new Set(messages).size).toBe(messages.length);
  });

  it('ignores a reason it does not know, rather than showing a blank notice', () => {
    expect(toLogoutReason('something-else')).toBeNull();
    expect(toLogoutReason('')).toBeNull();
    expect(toLogoutReason(null)).toBeNull();
  });

  it('maps the reason IdleService sends to the inactivity copy, not the 401 copy', () => {
    const reason = toLogoutReason('inactivity') as LogoutReason;
    expect(LOGOUT_REASON_MESSAGE[reason]).toBe('login.signedOutForInactivity');
    expect(LOGOUT_REASON_MESSAGE[reason]).not.toBe('login.sessionExpired');
  });
});
