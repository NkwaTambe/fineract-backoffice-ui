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
  canTerminateLoanContract,
  isLoanContractTerminated,
  loanContractTerminationPayload,
} from './loan-contract-termination';
import { LOAN_SCHEDULE_TYPE } from '../products/loan-schedule-type';

function loan(overrides: Record<string, unknown> = {}) {
  return {
    loanScheduleType: { code: LOAN_SCHEDULE_TYPE.PROGRESSIVE, value: 'Progressive' },
    status: { value: 'Active', active: true },
    chargedOff: false,
    subStatus: { id: 0, code: 'loanSubStatus.none', value: 'None' },
    ...overrides,
  };
}

describe('loan contract termination', () => {
  it('allows termination only for an active, non-charged-off progressive contract', () => {
    expect(canTerminateLoanContract(loan())).toBe(true);
    expect(
      canTerminateLoanContract(
        loan({ loanScheduleType: { code: LOAN_SCHEDULE_TYPE.CUMULATIVE, value: 'Cumulative' } }),
      ),
    ).toBe(false);
    expect(canTerminateLoanContract(loan({ status: { value: 'Closed', active: false } }))).toBe(
      false,
    );
    expect(canTerminateLoanContract(loan({ chargedOff: true }))).toBe(false);
  });

  it('recognises the contract-termination sub-status by id or descriptor', () => {
    expect(isLoanContractTerminated(loan({ subStatus: { id: 900 } }))).toBe(true);
    expect(
      isLoanContractTerminated(loan({ subStatus: { code: 'loanSubStatus.contractTermination' } })),
    ).toBe(true);
    expect(isLoanContractTerminated(loan())).toBe(false);
  });

  it('does not offer termination again once the contract is terminated', () => {
    expect(canTerminateLoanContract(loan({ subStatus: { id: 900 } }))).toBe(false);
  });

  it('sends only a trimmed note when one is present', () => {
    expect(loanContractTerminationPayload('  Approved by risk  ')).toEqual({
      note: 'Approved by risk',
    });
    expect(loanContractTerminationPayload(' '.repeat(3))).toEqual({});
    expect(loanContractTerminationPayload()).toEqual({});
  });
});
