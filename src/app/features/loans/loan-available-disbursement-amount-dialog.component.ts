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

import { Component, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { OVERLAY, TranslatePipe } from '../../core/adapters';
import { ButtonComponent } from '../../ui/button/button.component';

export interface LoanAvailableDisbursementAmountResult {
  amount: number;
}

/**
 * Collects the new undrawn-balance limit for `PUT .../available-disbursement-amount` — #284.
 *
 * The platform does not return the current value on `GET /loans/{id}` (there is nowhere to read
 * it from to show as context, unlike the approved amount), so this is a bare amount field. As
 * with {@link LoanApprovedAmountDialogComponent}, the tranche and status rules — whether a
 * decrease or a drop to zero is allowed — are the platform's to enforce, not this dialog's.
 */
@Component({
  selector: 'app-loan-available-disbursement-amount-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, ButtonComponent],
  template: `
    <h2 class="dialog-title">
      {{ 'LOANS.ACTIONS.REVISE_AVAILABLE_DISBURSEMENT_AMOUNT' | appTranslate }}
    </h2>
    <div class="dialog-content">
      <p class="dialog-message">
        {{ 'LOANS.AVAILABLE_DISBURSEMENT_AMOUNT_HINT' | appTranslate }}
      </p>
      <div class="form-field">
        <label for="loan-available-disbursement-amount-input">
          {{ 'LOANS.NEW_AVAILABLE_DISBURSEMENT_AMOUNT' | appTranslate }}
        </label>
        <input
          id="loan-available-disbursement-amount-input"
          type="number"
          name="amount"
          data-testid="loan-available-disbursement-amount-input"
          [ngModel]="amount()"
          (ngModelChange)="amount.set($event)"
          required
        />
      </div>
    </div>
    <div class="dialog-actions">
      <app-button type="button" intent="neutral" emphasis="quiet" (click)="onCancel()">
        {{ 'COMMON.CANCEL' | appTranslate }}
      </app-button>
      <app-button type="button" intent="primary" [disabled]="!isValid()" (click)="onConfirm()">
        {{ 'COMMON.CONFIRM' | appTranslate }}
      </app-button>
    </div>
  `,
  styles: [
    `
      :host {
        display: block;
        padding: var(--space-5);
      }
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 16px;
        padding-top: 8px;
        min-width: 350px;
      }
      .dialog-message {
        margin: 0;
        font-size: 0.8125rem;
        color: var(--text-muted);
      }
      .form-field {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
      }
      .form-field label {
        font-weight: 500;
        font-size: 0.75rem;
        color: var(--text-muted);
      }
      .form-field input {
        padding: var(--space-3) var(--space-4);
        border: 1px solid var(--border-color);
        border-radius: var(--border-radius);
        background: var(--card-bg);
        color: var(--text-color);
        font-family: inherit;
        font-size: 0.9rem;
      }
      .form-field input:focus {
        outline: none;
        border-color: var(--primary-color);
        box-shadow: var(--focus-ring);
      }
      .dialog-actions {
        display: flex;
        justify-content: flex-end;
        gap: 8px;
        margin-top: 8px;
      }
    `,
  ],
})
export class LoanAvailableDisbursementAmountDialogComponent {
  private readonly overlay = inject(OVERLAY);

  readonly amount = signal<number | null>(null);

  isValid(): boolean {
    const amount = this.amount();
    return amount !== null && Number(amount) >= 0;
  }

  onCancel(): void {
    void this.overlay.dismissModal();
  }

  onConfirm(): void {
    if (!this.isValid()) return;
    void this.overlay.dismissModal<LoanAvailableDisbursementAmountResult>({
      amount: Number(this.amount()),
    });
  }
}
