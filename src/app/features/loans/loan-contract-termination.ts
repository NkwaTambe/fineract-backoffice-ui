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

import type { GetLoansLoanIdResponse, PostLoansLoanIdRequest } from '../../api';
import { LOAN_SCHEDULE_TYPE } from '../products/loan-schedule-type';

const CONTRACT_TERMINATION_SUB_STATUS_ID = 900;

/** Whether Fineract already records the contract-termination sub-status for this loan. */
export function isLoanContractTerminated(loan: GetLoansLoanIdResponse | null | undefined): boolean {
  const subStatus = loan?.subStatus;
  const descriptor = `${subStatus?.code ?? ''} ${subStatus?.value ?? ''}`
    .toLowerCase()
    .replaceAll(/[^a-z]/g, '');
  return (
    subStatus?.id === CONTRACT_TERMINATION_SUB_STATUS_ID ||
    descriptor.includes('contracttermination')
  );
}

/**
 * Fineract only terminates an active progressive contract that is neither charged off nor already
 * terminated. Encoding the same conditions here keeps the menu from offering commands that can
 * only fail.
 */
export function canTerminateLoanContract(loan: GetLoansLoanIdResponse | null | undefined): boolean {
  return (
    loan?.loanScheduleType?.code === LOAN_SCHEDULE_TYPE.PROGRESSIVE &&
    loan.status?.active === true &&
    loan.chargedOff !== true &&
    !isLoanContractTerminated(loan)
  );
}

/**
 * Both commands are loan-level state transitions. Their documented request body is only an
 * optional note; Fineract chooses the business date itself.
 */
export function loanContractTerminationPayload(note?: string): PostLoansLoanIdRequest {
  const trimmed = note?.trim();
  return trimmed ? { note: trimmed } : {};
}
