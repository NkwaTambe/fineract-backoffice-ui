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

import { Component, OnInit, inject, signal } from '@angular/core';

import { Router } from '@angular/router';
import { of } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { TranslatePipe } from '../../core/adapters';
import { AccountingRulesService } from '../../api/api/accountingRules.service';
import { AccountingRuleData } from '../../api/model/models';
import {
  DataTableComponent,
  ColumnDef,
} from '../../shared/components/data-table/data-table.component';
import { CellTemplateDirective } from '../../shared/components/data-table/cell-template.directive';
import { ButtonComponent } from '../../ui/button/button.component';

@Component({
  selector: 'app-accounting-rules-list',
  standalone: true,
  imports: [DataTableComponent, CellTemplateDirective, TranslatePipe, ButtonComponent],
  template: `
    <div class="container">
      <app-data-table
        [hasError]="hasError()"
        (retry)="onRetry()"
        title="nav.accountingRules"
        [data]="rules()"
        [columns]="columns"
        [localLogic]="true"
        createButtonLabel="ACCOUNTING_RULES.CREATE"
        createPermission="CREATE_ACCOUNTINGRULE"
        (create)="onCreate()"
      >
        <ng-template appCellTemplate="debitAccounts" let-row>
          {{ row.debitAccounts?.[0]?.name || '' }}
        </ng-template>
        <ng-template appCellTemplate="creditAccounts" let-row>
          {{ row.creditAccounts?.[0]?.name || '' }}
        </ng-template>
        <ng-template appCellTemplate="actions" let-row>
          <app-button
            type="button"
            intent="primary"
            emphasis="quiet"
            [label]="'COMMON.EDIT' | appTranslate"
            icon="create-outline"
            (click)="onEdit(row)"
          />
          <app-button
            type="button"
            intent="danger"
            emphasis="quiet"
            [label]="'COMMON.DELETE' | appTranslate"
            icon="trash-outline"
            (click)="onDelete(row)"
          />
        </ng-template>
      </app-data-table>
    </div>
  `,
  styles: [
    `
      .container {
        padding: 20px;
      }
    `,
  ],
})
export class AccountingRulesListComponent implements OnInit {
  private readonly accountingRulesService = inject(AccountingRulesService);
  private readonly router = inject(Router);

  readonly rules = signal<AccountingRuleData[]>([]);
  /** True when the last load failed, so the table offers a retry instead of an empty list. */
  readonly hasError = signal(false);
  columns: ColumnDef[] = [
    { key: 'name', label: 'COMMON.NAME', sortable: true },
    { key: 'officeName', label: 'COMMON.OFFICE', sortable: true },
    { key: 'debitAccounts', label: 'JOURNAL_ENTRIES.DEBITS' },
    { key: 'creditAccounts', label: 'JOURNAL_ENTRIES.CREDITS' },
    { key: 'actions', label: 'COMMON.ACTIONS' },
  ];

  ngOnInit() {
    this.loadRules();
  }

  loadRules() {
    this.accountingRulesService
      .getAccountingrules()
      .pipe(
        tap(() => this.hasError.set(false)),
        catchError(() => {
          this.hasError.set(true);
          return of([] as AccountingRuleData[]);
        }),
      )
      .subscribe((rules) => this.rules.set(rules ?? []));
  }

  onRetry(): void {
    this.loadRules();
  }

  onCreate() {
    this.router.navigate(['/accounting/rules/create']);
  }

  onEdit(rule: AccountingRuleData) {
    this.router.navigate(['/accounting/rules/edit', rule.id]);
  }

  onDelete(rule: AccountingRuleData) {
    if (confirm('Are you sure you want to delete this accounting rule?')) {
      this.accountingRulesService.deleteAccountingrulesAccountingRuleId(rule.id!).subscribe(() => {
        this.loadRules();
      });
    }
  }
}
