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

import { LOANS_ROUTES } from './loans.routes';

describe('LOANS_ROUTES transaction permissions', () => {
  it('matches charge refund before the generic UPDATE_LOAN transaction route', () => {
    const chargeRefundIndex = LOANS_ROUTES.findIndex(
      (route) => route.path === ':loanId/transactions/chargeRefund',
    );
    const genericTransactionIndex = LOANS_ROUTES.findIndex(
      (route) => route.path === ':loanId/transactions/:type',
    );

    expect(chargeRefundIndex).toBeGreaterThanOrEqual(0);
    expect(chargeRefundIndex).toBeLessThan(genericTransactionIndex);
    expect(LOANS_ROUTES[chargeRefundIndex].data).toMatchObject({
      permissions: 'CHARGEREFUND_LOAN',
      transactionType: 'chargeRefund',
    });
  });
});
