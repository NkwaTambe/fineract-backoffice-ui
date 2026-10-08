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

import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { I18N, TranslatePipe } from '../../../core/adapters';
import { NotificationService } from '../../../core/services/notification.service';
import {
  IonButton,
  IonCard,
  IonCardContent,
  IonCardTitle,
  IonCheckbox,
  IonItem,
  IonList,
  IonSearchbar,
  IonSpinner,
} from '@ionic/angular/standalone';
import {
  CurrencyService,
  CurrencyConfigurationData,
  CurrencyData,
  CurrencyUpdateRequest,
} from '../../../api';

@Component({
  selector: 'app-currencies',
  standalone: true,
  imports: [
    TranslatePipe,
    IonButton,
    IonSpinner,
    IonCardContent,
    IonCardTitle,
    IonCard,
    IonItem,
    IonList,
    IonCheckbox,
    IonSearchbar,
  ],
  template: `
    <ion-card>
      <ion-card-title>{{ 'CURRENCIES.TITLE' | appTranslate }}</ion-card-title>
      <ion-card-content>
        @if (isLoading()) {
          <div class="form-container loading">
            <ion-spinner name="crescent"></ion-spinner>
          </div>
        } @else {
          <div class="form-container transfer">
            <div class="pane">
              <h3>{{ 'CURRENCIES.AVAILABLE' | appTranslate }}</h3>
              <ion-searchbar
                data-testid="currency-filter"
                [attr.aria-label]="'CURRENCIES.FILTER' | appTranslate"
                [placeholder]="'CURRENCIES.FILTER' | appTranslate"
                [value]="filter()"
                (ionInput)="onFilter($any($event).detail.value)"
              ></ion-searchbar>
              <ion-list class="scroll-area" data-testid="currency-available-list">
                @for (currency of visibleAvailable(); track currency.code) {
                  <ion-item>
                    <ion-checkbox
                      justify="start"
                      labelPlacement="end"
                      [checked]="availableSelection.has(currency.code!)"
                      (ionChange)="toggle(availableSelection, currency.code!, $event)"
                    >
                      {{ currency.displayLabel ?? currency.name }}
                    </ion-checkbox>
                  </ion-item>
                } @empty {
                  <ion-item lines="none">{{ 'CURRENCIES.NO_MATCH' | appTranslate }}</ion-item>
                }
              </ion-list>
            </div>

            <div class="transfer-buttons">
              <ion-button color="primary" (click)="addSelected()">
                {{ 'CURRENCIES.ADD' | appTranslate }} →
              </ion-button>
              <ion-button (click)="removeSelected()">
                ← {{ 'CURRENCIES.REMOVE' | appTranslate }}
              </ion-button>
            </div>

            <div class="pane">
              <h3>{{ 'CURRENCIES.SELECTED' | appTranslate }}</h3>
              <ion-list class="scroll-area" data-testid="currency-selected-list">
                @for (currency of selectedCurrencies(); track currency.code) {
                  <ion-item>
                    <ion-checkbox
                      justify="start"
                      labelPlacement="end"
                      [checked]="selectedSelection.has(currency.code!)"
                      (ionChange)="toggle(selectedSelection, currency.code!, $event)"
                    >
                      {{ currency.displayLabel ?? currency.name }}
                    </ion-checkbox>
                  </ion-item>
                }
              </ion-list>
            </div>
          </div>

          <div class="form-actions">
            <ion-button color="primary" (click)="save()">
              {{ 'CURRENCIES.SAVE' | appTranslate }}
            </ion-button>
          </div>
        }
      </ion-card-content>
    </ion-card>
  `,
  // The platform knows some 160 currencies, so each list scrolls inside its own box. Without
  // that the page grew to ~8000px and Save sat below all of it. The transfer buttons and Save
  // stay in view because the lists are bounded, not because they are pinned.
  styles: [
    `
      .loading {
        display: flex;
        justify-content: center;
        padding: 2rem;
      }
      .transfer {
        display: flex;
        gap: 1rem;
        align-items: flex-start;
      }
      .pane {
        flex: 1;
        min-width: 0;
      }
      .scroll-area {
        max-height: 50vh;
        overflow-y: auto;
        overscroll-behavior: contain;
      }
      .transfer-buttons {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        justify-content: center;
        align-self: center;
      }
      @media (max-width: 768px) {
        .transfer {
          flex-direction: column;
          align-items: stretch;
        }
        .transfer-buttons {
          flex-direction: row;
          justify-content: center;
        }
        .scroll-area {
          max-height: 35vh;
        }
      }
    `,
  ],
})
export class CurrenciesComponent implements OnInit {
  private currencyService = inject(CurrencyService);
  private notifications = inject(NotificationService);
  private i18n = inject(I18N);

  readonly isLoading = signal(true);
  readonly availableCurrencies = signal<CurrencyData[]>([]);
  readonly selectedCurrencies = signal<CurrencyData[]>([]);
  readonly filter = signal('');

  /** The Available list narrowed by what was typed, matching the label or the currency code. */
  readonly visibleAvailable = computed(() => {
    const term = this.filter().trim().toLowerCase();
    if (!term) return this.availableCurrencies();
    return this.availableCurrencies().filter((c) =>
      `${c.displayLabel ?? c.name ?? ''} ${c.code ?? ''}`.toLowerCase().includes(term),
    );
  });

  ngOnInit(): void {
    this.currencyService.getCurrencies().subscribe({
      next: (data: CurrencyConfigurationData) => {
        const selectedCodes = new Set((data.selectedCurrencyOptions ?? []).map((c) => c.code));
        this.selectedCurrencies.set(data.selectedCurrencyOptions ?? []);
        this.availableCurrencies.set(
          (data.currencyOptions ?? []).filter((c) => !selectedCodes.has(c.code)),
        );
        this.isLoading.set(false);
      },
      error: () => {
        this.isLoading.set(false);
      },
    });
  }

  /**
   * Checked codes on each side. mat-selection-list tracked this itself; ion-list does not,
   * so the two panes hold their own selection.
   */
  readonly availableSelection = new Set<string>();
  readonly selectedSelection = new Set<string>();

  toggle(selection: Set<string>, code: string, event: Event): void {
    const checked = (event as CustomEvent<{ checked?: boolean }>).detail?.checked;
    if (checked) selection.add(code);
    else selection.delete(code);
  }

  onFilter(value: string | null | undefined): void {
    this.filter.set(value ?? '');
  }

  addSelected(): void {
    // Only what is on screen: a currency ticked and then filtered out of view is not added
    // behind the user's back, and stays ticked for when it comes back into view.
    const toAdd = this.visibleAvailable().filter((c) => this.availableSelection.has(c.code!));
    const addCodes = new Set(toAdd.map((c) => c.code));
    this.selectedCurrencies.set([...this.selectedCurrencies(), ...toAdd]);
    this.availableCurrencies.set(this.availableCurrencies().filter((c) => !addCodes.has(c.code)));
    toAdd.forEach((c) => this.availableSelection.delete(c.code!));
  }

  removeSelected(): void {
    const toRemove = this.selectedCurrencies().filter((c) => this.selectedSelection.has(c.code!));
    const removeCodes = new Set(toRemove.map((c) => c.code));
    this.availableCurrencies.set([...this.availableCurrencies(), ...toRemove]);
    this.selectedCurrencies.set(this.selectedCurrencies().filter((c) => !removeCodes.has(c.code)));
    this.selectedSelection.clear();
  }

  save(): void {
    const body: CurrencyUpdateRequest = {
      currencies: this.selectedCurrencies().map((c) => c.code as string),
    };
    this.currencyService.putCurrencies(body).subscribe({
      next: () => {
        this.notifications.success(this.i18n.translate('CURRENCIES.SAVED_SUCCESS'));
      },
      error: () => {
        this.notifications.error('Save failed');
      },
    });
  }
}
