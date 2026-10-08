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
import { IonButton, IonItem, IonLabel, IonTextarea } from '@ionic/angular/standalone';

import { OVERLAY, TranslatePipe } from '../../core/adapters';

/** What the dialog was dismissed with. `note` is absent when the user left the field empty. */
export interface SavingsUndoApprovalResult {
  note?: string;
}

/**
 * Confirms undoing a savings account approval, and collects the optional reason the platform
 * records against the command.
 *
 * Mirrors `LoanUndoApprovalDialogComponent` — same reasoning applies: `undoapproval` takes an
 * empty body (it rejects `dateFormat`/`locale`, the fields the shared simple-command helper
 * always sends, so this bypasses that helper entirely), and the note is worth asking for
 * because reversing an approval is exactly the kind of action an auditor asks "why" about
 * afterwards. The platform keeps it on the command's audit entry, not as an account note.
 */
@Component({
  selector: 'app-savings-undo-approval-dialog',
  standalone: true,
  imports: [FormsModule, TranslatePipe, IonButton, IonItem, IonLabel, IonTextarea],
  template: `
    <h2 class="dialog-title">{{ 'SAVINGS.UNDOAPPROVAL' | appTranslate }}</h2>
    <div class="dialog-content">
      <p class="dialog-message">{{ 'SAVINGS.CONFIRM_UNDOAPPROVAL' | appTranslate }}</p>
      <ion-item fill="outline" class="full-width">
        <ion-label position="stacked">{{ 'SAVINGS.UNDOAPPROVAL_REASON' | appTranslate }}</ion-label>
        <ion-textarea
          name="note"
          data-testid="savings-undo-approval-note"
          rows="3"
          [autoGrow]="true"
          [ngModel]="note()"
          (ngModelChange)="note.set($event)"
        ></ion-textarea>
      </ion-item>
    </div>
    <div class="dialog-actions">
      <ion-button fill="clear" color="medium" (click)="onCancel()">
        {{ 'COMMON.CANCEL' | appTranslate }}
      </ion-button>
      <ion-button color="danger" data-testid="savings-undo-approval-confirm" (click)="onConfirm()">
        {{ 'COMMON.CONFIRM' | appTranslate }}
      </ion-button>
    </div>
  `,
  styles: [
    `
      .dialog-content {
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding-top: 8px;
        min-width: 350px;
      }
      .dialog-message {
        margin: 0;
      }
      .full-width {
        width: 100%;
      }
    `,
  ],
})
export class SavingsUndoApprovalDialogComponent {
  private readonly overlay = inject(OVERLAY);

  readonly note = signal('');

  onCancel(): void {
    void this.overlay.dismissModal();
  }

  onConfirm(): void {
    const note = this.note().trim();
    void this.overlay.dismissModal<SavingsUndoApprovalResult>(note ? { note } : {});
  }
}
