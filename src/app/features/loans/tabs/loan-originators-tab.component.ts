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

import { Component, computed, input } from '@angular/core';

import { ColumnDef, DataTableComponent } from '../../../shared';
import { GetLoansLoanIdOriginatorData } from '../../../api';

/**
 * Who originated this loan, and through which channel.
 *
 * Matters wherever loans arrive through agents, brokers or a partner channel rather than over
 * the counter: commission, performance and responsibility all hang off it. The platform returns
 * `originators` on every loan and the screen discarded it.
 */
@Component({
  selector: 'app-loan-originators-tab',
  standalone: true,
  imports: [DataTableComponent],
  template: `
    <app-data-table [data]="rows()" [columns]="columns" [localLogic]="true"></app-data-table>
  `,
})
export class LoanOriginatorsTabComponent {
  readonly originators = input<GetLoansLoanIdOriginatorData[] | undefined>([]);

  readonly rows = computed(() => this.originators() ?? []);

  columns: ColumnDef[] = [
    { key: 'name', label: 'COMMON.NAME' },
    { key: 'originatorTypeName', label: 'LOANS.ORIGINATOR_TYPE' },
    { key: 'channelTypeName', label: 'LOANS.CHANNEL' },
    { key: 'externalId', label: 'COMMON.EXTERNAL_ID' },
    { key: 'status', label: 'COMMON.STATUS' },
  ];
}
