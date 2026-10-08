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

import { computed, inject, input, signal, Component, OnInit } from '@angular/core';
import { TranslatePipe } from '../../../core/adapters';
import { TabsComponent, UiTab } from '../../../ui/tabs/tabs.component';
import { ButtonComponent } from '../../../ui/button/button.component';
import { SpinnerComponent } from '../../../ui/spinner/spinner.component';
import { DataTablesService, GetDataTablesResponse } from '../../../api';
import { DialogService } from '../../../core/services/dialog.service';
import { DataTableComponent, ColumnDef } from '../data-table/data-table.component';
import { DatatableEntryDialogComponent } from '../datatable-entry-dialog/datatable-entry-dialog.component';

const AUDIT_COLUMN_NAMES = new Set(['id', 'created_at', 'updated_at']);

@Component({
  selector: 'app-entity-datatables',
  standalone: true,
  imports: [TranslatePipe, TabsComponent, ButtonComponent, SpinnerComponent, DataTableComponent],
  template: `
    <div class="entity-datatables-container">
      @if (isLoading()) {
        <div class="loading-overlay">
          <app-spinner [label]="'COMMON.LOADING' | appTranslate" />
        </div>
      }

      @if (tableTabs().length > 0) {
        <app-tabs
          #tabs
          data-testid="entity-datatables-tabs"
          [tabs]="tableTabs()"
          [label]="'SYSTEM.DATA_TABLES' | appTranslate"
          [idPrefix]="'entity-datatables-' + apptableName() + '-' + entityId()"
          [value]="activeTable()?.registeredTableName"
          (valueChange)="onTabChange($event)"
        />

        @if (activeTable(); as dt) {
          <div
            class="tab-content"
            role="tabpanel"
            tabindex="0"
            [id]="tabs.panelId()"
            [attr.aria-labelledby]="tabs.tabId(dt.registeredTableName!)"
          >
            <app-data-table
              [columns]="getColumnDefs(dt)"
              [data]="tableData()"
              [isLoading]="isTableLoading()"
              [localLogic]="true"
            >
              <app-button
                headerActions
                data-testid="entity-datatables-add"
                type="button"
                icon="add-outline"
                (click)="onAddEntry(dt)"
              >
                {{ 'SYSTEM.ADD_ENTRY' | appTranslate }}
              </app-button>
            </app-data-table>
          </div>
        }
      } @else if (!isLoading()) {
        <p class="no-data">{{ 'SYSTEM.NO_DATA_TABLES_REGISTERED' | appTranslate }}</p>
      }
    </div>
  `,
  styles: [
    `
      .entity-datatables-container {
        position: relative;
        min-height: 200px;
      }
      .loading-overlay {
        display: flex;
        justify-content: center;
        padding: 40px;
      }
      .tab-content {
        padding: 16px 0;
      }
      .no-data {
        padding: 24px;
        text-align: center;
        color: var(--text-muted, rgba(0, 0, 0, 0.6));
      }
    `,
  ],
})
export class EntityDatatablesComponent implements OnInit {
  readonly apptableName = input.required<string>();
  readonly entityId = input.required<number>();

  private readonly datatablesService = inject(DataTablesService);
  private readonly dialogService = inject(DialogService);

  readonly datatables = signal<GetDataTablesResponse[]>([]);
  readonly tableTabs = computed<UiTab[]>(() =>
    this.datatables()
      .filter((table) => !!table.registeredTableName)
      .map((table) => ({ value: table.registeredTableName!, label: table.registeredTableName! })),
  );
  readonly isLoading = signal<boolean>(false);

  readonly tableData = signal<Record<string, unknown>[]>([]);
  readonly isTableLoading = signal<boolean>(false);
  readonly activeTable = signal<GetDataTablesResponse | undefined>(undefined);

  ngOnInit(): void {
    this.loadDatatables();
  }

  loadDatatables(): void {
    this.isLoading.set(true);
    this.datatablesService.getDatatables(this.apptableName()).subscribe({
      next: (data) => {
        this.datatables.set(data);
        this.isLoading.set(false);
        // Only named tables get a tab, so select the first one that can be selected.
        const first = data.find((table) => !!table.registeredTableName);
        if (first) {
          this.activeTable.set(first);
          this.loadTableData(first.registeredTableName!);
        }
      },
      error: (err) => {
        console.error('Failed to load entity datatables', err);
        this.isLoading.set(false);
      },
    });
  }

  loadTableData(tableName: string): void {
    this.isTableLoading.set(true);
    // The columns come from `activeTable()` and switch synchronously, while the rows arrive
    // later. Holding the previous table's rows would render them under the new table's headers
    // until the response lands, so drop them as the request goes out.
    this.tableData.set([]);
    this.datatablesService.getDatatablesDatatableApptableId(tableName, this.entityId()).subscribe({
      next: (data: unknown) => {
        // Nothing cancels the previous request, so switching A -> B -> A leaves two in flight
        // and the slower one can land last. Without this guard its rows would be shown under
        // whichever tab is selected by then, and stay there.
        if (this.isStale(tableName)) return;
        const parsed = typeof data === 'string' ? JSON.parse(data) : data;

        // GET /datatables/{datatable}/{apptableId} returns entries as a plain
        // array of row objects (one object per row, columns as keys) — NOT
        // the legacy `{ columnHeaders, data }` resultset shape used by some
        // other Fineract report/query endpoints. Support both defensively.
        let formattedData: Record<string, unknown>[];
        if (Array.isArray(parsed)) {
          formattedData = parsed as Record<string, unknown>[];
        } else {
          const result = parsed as Record<string, unknown>;
          const headers = (result['columnHeaders'] as Record<string, unknown>[]) || [];
          const rows = (result['data'] as unknown[][]) || [];
          formattedData = rows.map((row: unknown[]) => {
            const entry: Record<string, unknown> = {};
            headers.forEach((header: Record<string, unknown>, index: number) => {
              const colName = header['columnName'] as string;
              entry[colName] = row[index];
            });
            return entry;
          });
        }

        this.tableData.set(formattedData);
        this.isTableLoading.set(false);
      },
      error: (err) => {
        console.error(`Failed to load data for table ${tableName}`, err);
        if (this.isStale(tableName)) return;
        this.isTableLoading.set(false);
      },
    });
  }

  /** True once a later tab change has made this response's table no longer the selected one. */
  private isStale(tableName: string): boolean {
    return this.activeTable()?.registeredTableName !== tableName;
  }

  getColumnDefs(dt: GetDataTablesResponse): ColumnDef[] {
    // The primary key column is the entity's own FK (e.g. "loan_id"), not
    // "<apptableName>_id" (apptableName is "m_loan", not "loan") — filtering
    // by isColumnPrimaryKey works regardless of the entity's naming.
    return (dt.columnHeaderData || [])
      .filter((col) => !col.isColumnPrimaryKey && !AUDIT_COLUMN_NAMES.has(col.columnName ?? ''))
      .map((col) => ({
        key: col.columnName!,
        label: col.columnName!, // Ideally we'd have a way to translate these
        sortable: true,
      }));
  }

  onTabChange(tableName: string): void {
    const table = this.datatables().find((dt) => dt.registeredTableName === tableName);
    if (!table || table === this.activeTable()) return;
    this.activeTable.set(table);
    this.loadTableData(tableName);
  }

  onAddEntry(dt: GetDataTablesResponse): Promise<void> {
    return this.dialogService
      .open<boolean>(DatatableEntryDialogComponent, {
        data: {
          datatableName: dt.registeredTableName!,
          apptableId: this.entityId(),
          columns: dt.columnHeaderData || [],
        },
      })
      .then((saved) => {
        if (saved) {
          this.loadTableData(dt.registeredTableName!);
        }
      });
  }
}
