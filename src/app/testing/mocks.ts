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
 * Typed Vitest mocks for partially mocked services.
 *
 * Vitest ships `MockedObject<T>`, but it describes an object where *every* member is already a
 * mock. That does not fit a spec that lists four methods of a fifty-method generated API
 * service.
 *
 * ## The soundness this deliberately preserves
 *
 * `SpyObj<T>` claims every member of `T` while {@link createSpyObj} only creates the ones it
 * was given. This is intentionally unsound: reaching for an unlisted method returns `undefined`.
 * Tightening the type would surface existing gaps in specs and should be an independent change.
 *
 * Tightening this is worth doing — as its own change, against a suite that is already green on
 * the new runner, where every error it surfaces is unambiguously a spec that was lying.
 */

import type { Mock } from 'vitest';

/**
 * `T` with every method replaced by a Vitest mock of the same signature.
 *
 * Non-method members are left as declared, so a mocked service's plain fields still typecheck
 * against their real types.
 */
export type SpyObj<T> = {
  [K in keyof T]: T[K] extends (...args: infer A) => infer R ? Mock<(...args: A) => R> : T[K];
};

/**
 * Builds a mock of `T` exposing the named methods, each a `vi.fn()`.
 *
 * The factory takes no name string because Vitest reports the variable the mock is bound to.
 *
 * ```ts
 * let clients: SpyObj<ClientsService>;
 * clients = createSpyObj<ClientsService>(['getClients', 'postClients']);
 * clients.getClients.mockReturnValue(of([]));
 * ```
 */
export function createSpyObj<T>(methods: readonly (keyof T)[]): SpyObj<T> {
  const mock = {} as Record<keyof T, unknown>;
  for (const method of methods) {
    mock[method] = vi.fn();
  }
  return mock as SpyObj<T>;
}
