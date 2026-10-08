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

import { toCsv } from './csv';

describe('toCsv', () => {
  it('renders a header row followed by one row per record', () => {
    const csv = toCsv(
      [
        { key: 'id', label: 'ID' },
        { key: 'name', label: 'Name' },
      ],
      [
        { id: 1, name: 'Alice' },
        { id: 2, name: 'Bob' },
      ],
    );
    expect(csv).toBe('ID,Name\r\n1,Alice\r\n2,Bob');
  });

  it('renders just the header when there are no rows', () => {
    expect(toCsv([{ key: 'id', label: 'ID' }], [])).toBe('ID');
  });

  it('renders missing fields as empty', () => {
    expect(toCsv([{ key: 'missing', label: 'Missing' }], [{ id: 1 }])).toBe('Missing\r\n');
  });

  it('quotes a field containing a comma', () => {
    expect(toCsv([{ key: 'name', label: 'Name' }], [{ name: 'Doe, Jane' }])).toBe(
      'Name\r\n"Doe, Jane"',
    );
  });

  it('quotes and escapes a field containing a double quote', () => {
    expect(toCsv([{ key: 'name', label: 'Name' }], [{ name: 'She said "hi"' }])).toBe(
      'Name\r\n"She said ""hi"""',
    );
  });

  it('quotes a field containing a newline', () => {
    expect(toCsv([{ key: 'note', label: 'Note' }], [{ note: 'line one\nline two' }])).toBe(
      'Note\r\n"line one\nline two"',
    );
  });

  it('leaves a plain field unquoted', () => {
    expect(toCsv([{ key: 'name', label: 'Name' }], [{ name: 'Alice' }])).toBe('Name\r\nAlice');
  });
});
