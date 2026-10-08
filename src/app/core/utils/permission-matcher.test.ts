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

import { permissionsSatisfy } from './permission-matcher';

describe('permissionsSatisfy', () => {
  it('grants a single code the set holds', () => {
    expect(permissionsSatisfy(['READ_CLIENT'], 'READ_CLIENT')).toBe(true);
  });

  it('refuses a single code the set does not hold', () => {
    expect(permissionsSatisfy(['READ_CLIENT'], 'READ_LOAN')).toBe(false);
  });

  it('refuses everything when nothing is held', () => {
    expect(permissionsSatisfy([], 'READ_CLIENT')).toBe(false);
  });

  describe('several required codes', () => {
    it('defaults to OR — one match is enough', () => {
      expect(permissionsSatisfy(['READ_LOAN'], ['READ_CLIENT', 'READ_LOAN'])).toBe(true);
    });

    it('requires every code when matchAll is set', () => {
      expect(permissionsSatisfy(['READ_LOAN'], ['READ_CLIENT', 'READ_LOAN'], true)).toBe(false);
      expect(
        permissionsSatisfy(['READ_LOAN', 'READ_CLIENT'], ['READ_CLIENT', 'READ_LOAN'], true),
      ).toBe(true);
    });
  });

  describe('superuser codes', () => {
    it('ALL_FUNCTIONS satisfies anything, matchAll included', () => {
      expect(permissionsSatisfy(['ALL_FUNCTIONS'], 'APPROVE_LOAN')).toBe(true);
      expect(permissionsSatisfy(['ALL_FUNCTIONS'], ['APPROVE_LOAN', 'DELETE_CLIENT'], true)).toBe(
        true,
      );
    });

    it('ALL_FUNCTIONS_READ satisfies an all-READ request', () => {
      expect(permissionsSatisfy(['ALL_FUNCTIONS_READ'], ['READ_CLIENT', 'READ_LOAN'])).toBe(true);
    });

    it('ALL_FUNCTIONS_READ does not satisfy a write', () => {
      expect(permissionsSatisfy(['ALL_FUNCTIONS_READ'], 'APPROVE_LOAN')).toBe(false);
    });

    it('a request mixing READ_ with a write falls through to the plain check', () => {
      expect(permissionsSatisfy(['ALL_FUNCTIONS_READ'], ['READ_CLIENT', 'APPROVE_LOAN'])).toBe(
        false,
      );
      expect(
        permissionsSatisfy(['ALL_FUNCTIONS_READ', 'APPROVE_LOAN'], ['READ_CLIENT', 'APPROVE_LOAN']),
      ).toBe(true);
    });
  });

  it('accepts a Set as well as an array', () => {
    expect(permissionsSatisfy(new Set(['READ_CLIENT']), 'READ_CLIENT')).toBe(true);
  });
});
