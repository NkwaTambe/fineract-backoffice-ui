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

/** Query parameter values explaining why navigation returned to the login page. */
export const SESSION_EXPIRED_REASON = 'session-expired';
export const INACTIVITY_REASON = 'inactivity';

/** Every reason the application can send, so the login screen can be exhaustive about them. */
export const LOGOUT_REASONS = [SESSION_EXPIRED_REASON, INACTIVITY_REASON] as const;

export type LogoutReason = (typeof LOGOUT_REASONS)[number];

/**
 * Translation key explaining each reason.
 *
 * A `Record` keyed by the reason type rather than a chain of comparisons: adding a reason
 * without copy for it then fails to compile, which is the failure mode issue #612 described —
 * `inactivity` was being sent long before anything on the login screen recognised it.
 *
 * The two entries differ on purpose. "Your session expired" and "you were signed out after a
 * period of inactivity" tell the user different things about whether to expect it again.
 */
export const LOGOUT_REASON_MESSAGE: Record<LogoutReason, string> = {
  [SESSION_EXPIRED_REASON]: 'login.sessionExpired',
  [INACTIVITY_REASON]: 'login.signedOutForInactivity',
};

/** Narrows a raw query-parameter value to a reason the login screen can explain. */
export function toLogoutReason(value: string | null): LogoutReason | null {
  if (!value) return null;
  return (LOGOUT_REASONS as readonly string[]).includes(value) ? (value as LogoutReason) : null;
}
