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

/** Fineract's superuser code: holding it satisfies every check. */
export const ALL_FUNCTIONS = 'ALL_FUNCTIONS';

/** Read-only superuser code: satisfies a request made up entirely of `READ_*` codes. */
export const ALL_FUNCTIONS_READ = 'ALL_FUNCTIONS_READ';

/**
 * Decides whether a set of granted permission codes satisfies a requirement.
 *
 * Extracted from `AuthService.hasPermission` so the same rule can be applied to a permission
 * set that is not the signed-in user's — the role editor previews what a role *would* see, and
 * a preview computed by a second, subtly different implementation of this rule is worse than no
 * preview at all.
 *
 * @param granted  Permission codes held, already trimmed of the trailing spaces Fineract's seed
 *                 data carries (see `AuthService.normalizePermissions`).
 * @param required A single code, or several.
 * @param matchAll AND semantics for `required`. Default is OR — any one code is enough.
 */
export function permissionsSatisfy(
  granted: readonly string[] | ReadonlySet<string>,
  required: string | readonly string[],
  matchAll = false,
): boolean {
  const held = granted instanceof Set ? granted : new Set(granted as readonly string[]);

  if (held.has(ALL_FUNCTIONS)) {
    return true;
  }

  const codes = Array.isArray(required) ? required : [required as string];

  // Read-only superuser shortcut: grants any request made up entirely of READ_* permissions,
  // but never write/approve actions. A mixed request falls through to the plain check below.
  if (held.has(ALL_FUNCTIONS_READ) && codes.every((code) => code.startsWith('READ_'))) {
    return true;
  }

  return matchAll ? codes.every((code) => held.has(code)) : codes.some((code) => held.has(code));
}
