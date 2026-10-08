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

import { resolveAccountActionType, resolveAccountRoutePrefix } from './account-type-resolver';

describe('account-type-resolver', () => {
  describe('resolveAccountActionType', () => {
    it('should return savings if account is null or undefined', () => {
      expect(resolveAccountActionType(null)).toBe('savings');
      expect(resolveAccountActionType(undefined)).toBe('savings');
    });

    it('should resolve based on nested depositType.id', () => {
      expect(resolveAccountActionType({ depositType: { id: 200 } })).toBe('fixed');
      expect(resolveAccountActionType({ depositType: { id: 300 } })).toBe('recurring');
      expect(resolveAccountActionType({ depositType: { id: 100 } })).toBe('savings');
    });

    it('should resolve based on root depositTypeId if depositType is not present', () => {
      expect(resolveAccountActionType({ depositTypeId: 200 })).toBe('fixed');
      expect(resolveAccountActionType({ depositTypeId: 300 })).toBe('recurring');
      expect(resolveAccountActionType({ depositTypeId: 100 })).toBe('savings');
    });

    it('should resolve based on productName if depositTypeId/depositType is not present', () => {
      expect(resolveAccountActionType({ productName: 'Fixed Deposit Product' })).toBe('fixed');
      expect(resolveAccountActionType({ productName: 'Recurring Deposit Product' })).toBe(
        'recurring',
      );
      expect(resolveAccountActionType({ productName: 'Ordinary Savings' })).toBe('savings');
    });

    it('should fallback to savings if productName does not match deposit keywords', () => {
      expect(resolveAccountActionType({ productName: 'Some other product' })).toBe('savings');
    });
  });

  describe('resolveAccountRoutePrefix', () => {
    it('should return fixed-deposits for fixed action type', () => {
      expect(resolveAccountRoutePrefix({ depositTypeId: 200 })).toBe('fixed-deposits');
    });

    it('should return recurring-deposits for recurring action type', () => {
      expect(resolveAccountRoutePrefix({ depositTypeId: 300 })).toBe('recurring-deposits');
    });

    it('should return savings-accounts for savings action type', () => {
      expect(resolveAccountRoutePrefix({ depositTypeId: 100 })).toBe('savings-accounts');
    });
  });
});
