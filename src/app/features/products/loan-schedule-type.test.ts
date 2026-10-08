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

import {
  ADVANCED_PAYMENT_ALLOCATION_STRATEGY,
  DEFAULT_TRANSACTION_PROCESSING_STRATEGY,
  LOAN_SCHEDULE_TYPE,
  isAdvancedPaymentAllocationStrategy,
  isProgressiveScheduleType,
  readScheduleTypeCode,
  readScheduleTypeLabel,
  requiredStrategyFor,
} from './loan-schedule-type';

describe('loan schedule type', () => {
  describe('requiredStrategyFor', () => {
    /**
     * The pairing is not a preference. Progressive *is* the advanced payment allocation engine,
     * and Fineract rejects a progressive product carrying any other strategy — so anything that
     * has to choose a strategy without one to copy must not reach for the standard one.
     */
    it('demands advanced payment allocation for a progressive product', () => {
      expect(requiredStrategyFor(LOAN_SCHEDULE_TYPE.PROGRESSIVE)).toBe(
        ADVANCED_PAYMENT_ALLOCATION_STRATEGY,
      );
    });

    it('uses the standard strategy for a cumulative product', () => {
      expect(requiredStrategyFor(LOAN_SCHEDULE_TYPE.CUMULATIVE)).toBe(
        DEFAULT_TRANSACTION_PROCESSING_STRATEGY,
      );
    });

    it('treats an unknown schedule type as cumulative rather than guessing progressive', () => {
      expect(requiredStrategyFor(undefined)).toBe(DEFAULT_TRANSACTION_PROCESSING_STRATEGY);
      expect(requiredStrategyFor(null)).toBe(DEFAULT_TRANSACTION_PROCESSING_STRATEGY);
    });
  });

  describe('isProgressiveScheduleType', () => {
    it('recognises only the progressive code', () => {
      expect(isProgressiveScheduleType(LOAN_SCHEDULE_TYPE.PROGRESSIVE)).toBe(true);
      expect(isProgressiveScheduleType(LOAN_SCHEDULE_TYPE.CUMULATIVE)).toBe(false);
      expect(isProgressiveScheduleType('progressive')).toBe(false);
      expect(isProgressiveScheduleType(undefined)).toBe(false);
    });
  });

  describe('isAdvancedPaymentAllocationStrategy', () => {
    it('recognises only the advanced allocation code', () => {
      expect(isAdvancedPaymentAllocationStrategy(ADVANCED_PAYMENT_ALLOCATION_STRATEGY)).toBe(true);
      expect(isAdvancedPaymentAllocationStrategy(DEFAULT_TRANSACTION_PROCESSING_STRATEGY)).toBe(
        false,
      );
      expect(isAdvancedPaymentAllocationStrategy(null)).toBe(false);
    });
  });

  describe('reading the type off a product', () => {
    /**
     * `GET /loanproducts` returns `loanScheduleType`, but the generated list model omits it, so
     * it is only reachable through a cast. These cover that the cast survives the shapes the two
     * endpoints actually return, and degrades safely when it is absent.
     */
    it('reads the code from a list row', () => {
      expect(readScheduleTypeCode({ loanScheduleType: { code: 'PROGRESSIVE' } })).toBe(
        'PROGRESSIVE',
      );
    });

    it('returns undefined when the product does not carry one', () => {
      expect(readScheduleTypeCode({ id: 1 })).toBeUndefined();
      expect(readScheduleTypeCode(undefined)).toBeUndefined();
      expect(readScheduleTypeCode(null)).toBeUndefined();
    });

    it('prefers the label the server supplied', () => {
      expect(
        readScheduleTypeLabel({ loanScheduleType: { code: 'PROGRESSIVE', value: 'Progressive' } }),
      ).toBe('Progressive');
    });

    it('falls back to a readable label when the server sent only a code', () => {
      expect(readScheduleTypeLabel({ loanScheduleType: { code: 'PROGRESSIVE' } })).toBe(
        'Progressive',
      );
      expect(readScheduleTypeLabel({ loanScheduleType: { code: 'CUMULATIVE' } })).toBe(
        'Cumulative',
      );
    });

    it('describes a product with no schedule type as cumulative', () => {
      expect(readScheduleTypeLabel({ id: 1 })).toBe('Cumulative');
    });
  });
});
