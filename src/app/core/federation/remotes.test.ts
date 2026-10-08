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

import { DEV_REMOTE_ENTRY, resolveRemotes } from './remotes';

const DEV_LOCATION = {
  protocol: 'https:',
  port: '4200',
  hostname: 'localhost',
};

describe('resolveRemotes', () => {
  it('does not probe a production container that happens to use a local hostname', async () => {
    const probe = vi.fn();

    await expect(
      resolveRemotes({ protocol: 'http:', port: '8080', hostname: '127.0.0.1' }, probe),
    ).resolves.toEqual({});
    expect(probe).not.toHaveBeenCalled();
  });

  it('uses the remote when the HTTPS development server is running', async () => {
    const probe = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'application/json' }),
    });

    await expect(resolveRemotes(DEV_LOCATION, probe)).resolves.toEqual({
      'fineract-mfe': DEV_REMOTE_ENTRY,
    });
    expect(probe).toHaveBeenCalledWith(DEV_REMOTE_ENTRY, {
      method: 'HEAD',
      cache: 'no-store',
    });
  });

  it('does not treat the SPA shell as a remote', async () => {
    const probe = vi.fn().mockResolvedValue({
      ok: true,
      headers: new Headers({ 'content-type': 'text/html' }),
    });

    await expect(resolveRemotes(DEV_LOCATION, probe)).resolves.toEqual({});
  });

  it('stays quiet when the development remote is unavailable', async () => {
    const probe = vi.fn().mockRejectedValue(new Error('connection refused'));

    await expect(resolveRemotes(DEV_LOCATION, probe)).resolves.toEqual({});
  });
});
