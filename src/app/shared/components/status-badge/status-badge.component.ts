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

import { computed, input, Component } from '@angular/core';
import { NgClass } from '@angular/common';

/**
 * What Fineract hands back for a status.
 *
 * Most endpoints return an `EnumOptionData`-shaped object, a few return the bare code string,
 * and the generated client types several of them only as `Record<string, unknown>` — so the
 * badge accepts all three rather than forcing every caller to narrow.
 */
export type StatusLike =
  | string
  | {
      code?: string;
      value?: string;
      id?: number;
      active?: boolean;
      closed?: boolean;
      pending?: boolean;
    }
  | Record<string, unknown>;

/** Substrings of a status code or value that map to each badge colour. */
const ACTIVE_KEYWORDS: readonly string[] = ['active', 'approved'];
const PENDING_KEYWORDS: readonly string[] = ['pending', 'submitted'];
const CLOSED_KEYWORDS: readonly string[] = ['closed', 'rejected', 'deleted'];

/** Whole-word processing outcomes (audit log results). */
const SUCCESS_OUTCOMES: ReadonlySet<string> = new Set(['processed', 'success']);
const FAILURE_OUTCOMES: ReadonlySet<string> = new Set(['failure', 'failed', 'error']);

@Component({
  selector: 'app-status-badge',
  standalone: true,
  imports: [NgClass],
  template: `
    <span class="status-badge" [ngClass]="colorClass()">
      {{ statusName() }}
    </span>
  `,
  styles: [
    `
      .status-badge {
        display: inline-flex;
        align-items: center;
        padding: 4px 12px;
        border-radius: 16px;
        font-size: 12px;
        font-weight: 600;
        letter-spacing: 0.5px;
        text-transform: uppercase;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
      }

      .status-active {
        background-color: #e6f4ea;
        color: #126330;
        border: 1px solid #ceead6;
      }

      .status-pending {
        background-color: #fef7e0;
        color: #8a5300;
        border: 1px solid #feefc3;
      }

      .status-closed,
      .status-rejected {
        background-color: #fce8e6;
        color: #d93025;
        border: 1px solid #fad2cf;
      }

      .status-default {
        background-color: #f1f3f4;
        color: #5f6368;
        border: 1px solid #e8eaed;
      }

      /* Dark mode: the light-only pastel chips above are unreadable on a dark card, so
         re-theme each status against the app's semantic tokens (--success/--warning/--error-color)
         instead of the Google-Material-style palette used for light mode. */
      :host-context([data-theme='dark']) .status-active {
        background-color: rgba(46, 204, 113, 0.16);
        color: var(--success-color);
        border-color: rgba(46, 204, 113, 0.4);
      }

      :host-context([data-theme='dark']) .status-pending {
        background-color: rgba(243, 156, 18, 0.16);
        color: var(--warning-color);
        border-color: rgba(243, 156, 18, 0.4);
      }

      :host-context([data-theme='dark']) .status-closed,
      :host-context([data-theme='dark']) .status-rejected {
        background-color: rgba(231, 76, 60, 0.16);
        color: var(--error-color);
        border-color: rgba(231, 76, 60, 0.4);
      }

      :host-context([data-theme='dark']) .status-default {
        background-color: var(--surface-sunken);
        color: var(--text-muted);
        border-color: var(--border-color);
      }
    `,
  ],
})
export class StatusBadgeComponent {
  /** The full status object or just the code string from Fineract. */
  readonly status = input<StatusLike | undefined>(undefined);

  readonly statusName = computed<string>(() => {
    const status = this.status();
    if (!status) return 'UNKNOWN';
    if (typeof status === 'string') return status;
    const statusObj = status as Record<string, unknown>;
    return (statusObj['value'] as string) || (statusObj['code'] as string) || 'UNKNOWN';
  });

  readonly colorClass = computed<string>(() => {
    const status = this.status();
    if (!status) return 'status-default';

    const statusObj = status as Record<string, unknown>;
    const code =
      typeof status === 'string'
        ? status.toLowerCase()
        : (statusObj['code'] as string)?.toLowerCase() || '';
    const value =
      typeof status === 'string'
        ? status.toLowerCase()
        : (statusObj['value'] as string)?.toLowerCase() || '';

    const matchesAny = (keywords: readonly string[]): boolean =>
      keywords.some((keyword) => code.includes(keyword) || value.includes(keyword));
    // Outcomes rather than lifecycle states — the audit log's processing result. Matched whole,
    // so "unprocessed" is not read as success.
    const outcome = value || code;

    if (matchesAny(ACTIVE_KEYWORDS) || SUCCESS_OUTCOMES.has(outcome)) {
      return 'status-active';
    }
    if (matchesAny(PENDING_KEYWORDS)) {
      return 'status-pending';
    }
    if (matchesAny(CLOSED_KEYWORDS) || FAILURE_OUTCOMES.has(outcome)) {
      return 'status-closed';
    }

    return 'status-default';
  });
}
