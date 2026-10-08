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
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { TranslatePipe } from '../../../core/adapters';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardHeader,
  IonCardTitle,
  IonInput,
  IonItem,
  IonLabel,
  IonSelect,
  IonSelectOption,
  IonSpinner,
} from '@ionic/angular/standalone';
import {
  WorkingCapitalLoanNearBreachActionsService,
  PostWorkingCapitalLoansLoanIdNearBreachActionsRequest,
} from '../../../api';

const FREQUENCY_TYPES =
  PostWorkingCapitalLoansLoanIdNearBreachActionsRequest.NearBreachFrequencyTypeEnum;

/**
 * Submits a near-breach reschedule action for a single Working Capital loan.
 * `action` is fixed to RESCHEDULE — the only value the API accepts — so the form does not
 * expose a one-option select for it.
 */
@Component({
  selector: 'app-wc-near-breach-action-form',
  standalone: true,
  imports: [
    FormsModule,
    TranslatePipe,
    IonButton,
    IonSpinner,
    IonInput,
    IonItem,
    IonLabel,
    IonCardContent,
    IonCardHeader,
    IonCardTitle,
    IonCard,
    IonSelectOption,
    IonSelect,
  ],
  template: `
    <div class="form-container">
      <ion-card>
        <ion-card-header>
          <ion-card-title>{{ 'WC_LOANS.NEAR_BREACH_ACTION.TITLE' | appTranslate }}</ion-card-title>
        </ion-card-header>

        <ion-card-content>
          <form #actionForm="ngForm" (ngSubmit)="onSubmit()" class="wc-form">
            <ion-item fill="outline">
              <ion-label position="stacked">{{
                'WC_LOANS.NEAR_BREACH_ACTION.FREQUENCY' | appTranslate
              }}</ion-label>
              <ion-input
                [attr.aria-label]="'WC_LOANS.NEAR_BREACH_ACTION.FREQUENCY' | appTranslate"
                type="number"
                name="nearBreachFrequency"
                [(ngModel)]="request.nearBreachFrequency"
                min="1"
                required
              ></ion-input>
            </ion-item>

            <ion-item fill="outline">
              <ion-label position="stacked">{{
                'WC_LOANS.NEAR_BREACH_ACTION.FREQUENCY_TYPE' | appTranslate
              }}</ion-label>
              <ion-select
                [attr.aria-label]="'WC_LOANS.NEAR_BREACH_ACTION.FREQUENCY_TYPE' | appTranslate"
                interface="popover"
                name="nearBreachFrequencyType"
                [(ngModel)]="request.nearBreachFrequencyType"
                required
              >
                @for (opt of frequencyTypeOptions; track opt) {
                  <ion-select-option [value]="opt">{{ opt }}</ion-select-option>
                }
              </ion-select>
            </ion-item>

            <ion-item fill="outline">
              <ion-label position="stacked">{{
                'WC_LOANS.NEAR_BREACH_ACTION.THRESHOLD' | appTranslate
              }}</ion-label>
              <ion-input
                [attr.aria-label]="'WC_LOANS.NEAR_BREACH_ACTION.THRESHOLD' | appTranslate"
                type="number"
                name="nearBreachThreshold"
                [(ngModel)]="request.nearBreachThreshold"
                min="0.01"
                max="100"
                required
              ></ion-input>
            </ion-item>

            <div class="form-actions">
              <ion-button fill="clear" type="button" (click)="onCancel()" [disabled]="isSaving()">
                {{ 'COMMON.CANCEL' | appTranslate }}
              </ion-button>
              <ion-button
                color="primary"
                type="submit"
                [disabled]="actionForm.invalid || isSaving()"
              >
                @if (isSaving()) {
                  <ion-spinner name="crescent"></ion-spinner>
                  {{ 'COMMON.SAVING' | appTranslate }}
                } @else {
                  {{ 'COMMON.SUBMIT' | appTranslate }}
                }
              </ion-button>
            </div>
          </form>
        </ion-card-content>
      </ion-card>
    </div>
  `,
  styles: [
    `
      .form-container {
        padding: 24px;
        max-width: 600px;
        margin: 0 auto;
      }
      .wc-form {
        display: flex;
        flex-direction: column;
        gap: 16px;
      }
    `,
  ],
})
export class WcNearBreachActionFormComponent implements OnInit {
  private readonly nearBreachActionsService = inject(WorkingCapitalLoanNearBreachActionsService);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);

  readonly frequencyTypeOptions = Object.values(FREQUENCY_TYPES);

  loanId = 0;
  readonly isSaving = signal(false);

  request: PostWorkingCapitalLoansLoanIdNearBreachActionsRequest = {
    action: PostWorkingCapitalLoansLoanIdNearBreachActionsRequest.ActionEnum.Reschedule,
    nearBreachFrequency: 0,
    nearBreachFrequencyType: FREQUENCY_TYPES.Days,
    nearBreachThreshold: 0,
  };

  ngOnInit(): void {
    const id = this.route.snapshot.paramMap.get('id');
    if (id) this.loanId = +id;
  }

  onSubmit(): void {
    this.isSaving.set(true);
    this.nearBreachActionsService
      .postWorkingCapitalLoansLoanIdNearBreachActions(this.loanId, this.request)
      .subscribe({
        next: () => this.onCancel(),
        error: () => this.isSaving.set(false),
      });
  }

  onCancel(): void {
    this.router.navigate([`/working-capital/loans/view/${this.loanId}`], {
      queryParams: { tab: 'nearBreachActions' },
    });
  }
}
