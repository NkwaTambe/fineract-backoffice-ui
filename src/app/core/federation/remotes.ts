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

/** The demo remote served by `ng serve` for `projects/fineract-mfe`. */
export const DEV_REMOTE_ENTRY = 'http://localhost:4201/remoteEntry.json';

type LocationIdentity = Pick<Location, 'hostname' | 'port' | 'protocol'>;
type RemoteProbe = (input: string, init?: RequestInit) => Promise<Pick<Response, 'headers' | 'ok'>>;

/**
 * Whether this page is the HTTPS dev server for the host application.
 *
 * The released image contains a `remoteEntry.json` of its own, so probing production could
 * mistake that metadata file for the demo remote and make native federation load a blob module
 * the production CSP deliberately refuses. Restricting federation discovery to the actual dev
 * server keeps the shipped application self-contained and keeps `script-src 'self'` strict.
 *
 * A future deployment that really ships a remote needs an explicit runtime/build-time manifest,
 * not a hostname heuristic that also matches someone opening the container on localhost.
 */
export function isLocalDevServer(location: LocationIdentity): boolean {
  return (
    location.protocol === 'https:' &&
    location.port === '4200' &&
    (location.hostname === 'localhost' || location.hostname === '127.0.0.1')
  );
}

/**
 * Returns the development remote map, or an empty map everywhere else.
 *
 * `HEAD` avoids downloading metadata when the remote is absent. A 200 carrying the SPA shell is
 * not a remote, so the response also has to declare JSON.
 */
export async function resolveRemotes(
  location: LocationIdentity = globalThis.location,
  probe: RemoteProbe = globalThis.fetch,
): Promise<Record<string, string>> {
  if (!isLocalDevServer(location)) return {};

  try {
    const response = await probe(DEV_REMOTE_ENTRY, { method: 'HEAD', cache: 'no-store' });
    const contentType = response.headers.get('content-type') ?? '';
    if (response.ok && contentType.includes('json')) {
      return { 'fineract-mfe': DEV_REMOTE_ENTRY };
    }
  } catch {
    // Nothing listening on 4201, or the probe was blocked: either way there is no remote.
  }
  return {};
}
