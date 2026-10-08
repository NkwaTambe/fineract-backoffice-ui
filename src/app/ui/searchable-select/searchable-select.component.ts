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

import { Component, ElementRef, computed, forwardRef, inject, input, signal } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import {
  IonButtons,
  IonButton,
  IonContent,
  IonHeader,
  IonIcon,
  IonItem,
  IonList,
  IonModal,
  IonSearchbar,
  IonToolbar,
} from '@ionic/angular/standalone';

import { I18N, TranslatePipe } from '../../core/adapters';

/** An option's identifier, kept as the caller's own primitive rather than coerced to a string. */
export type SearchableSelectValue = string | number;

export interface SearchableSelectOption {
  readonly value: SearchableSelectValue;
  readonly label: string;
}

/**
 * A drop-in replacement for a plain `ion-select` when the option list is long or data-driven —
 * #626. `ion-select`'s own interfaces (`popover`, `alert`, and Ionic's default) have no filter
 * field, so a select backed by a hundred-plus currencies, offices or GL accounts makes the user
 * scroll and read every entry to find one.
 *
 * Implements `ControlValueAccessor` directly rather than wrapping `ion-select`, so `[(ngModel)]`,
 * `name` and `required` on the host tag work exactly as they do on the element it replaces —
 * Angular's own `NgModel` and `RequiredValidator` directives match by attribute presence, not by
 * element type. `disabled` and `placeholder` are plain inputs, matching `ion-select`'s own API.
 *
 * The trigger dispatches a real `ionBlur` DOM event on close, so the
 * `(ionBlur)="xModel.control.markAsTouched()"` line every existing select carries needs no
 * change at a call site that swaps in this component.
 */
@Component({
  selector: 'app-searchable-select',
  standalone: true,
  imports: [
    TranslatePipe,
    IonButtons,
    IonButton,
    IonContent,
    IonHeader,
    IonIcon,
    IonItem,
    IonList,
    IonModal,
    IonSearchbar,
    IonToolbar,
  ],
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => SearchableSelectComponent),
      multi: true,
    },
  ],
  template: `
    <button
      type="button"
      class="trigger"
      [attr.id]="triggerId() || null"
      [attr.data-testid]="testId() || null"
      [attr.aria-label]="ariaLabel() || null"
      aria-haspopup="dialog"
      [attr.aria-expanded]="isOpen()"
      [disabled]="isDisabled()"
      (click)="open()"
    >
      <span class="value" [class.placeholder]="!selectedLabel()">
        {{ selectedLabel() || placeholder() }}
      </span>
      <ion-icon name="caret-down-outline" aria-hidden="true"></ion-icon>
    </button>

    <ion-modal
      [isOpen]="isOpen()"
      [attr.data-testid]="testId() ? testId() + '-modal' : null"
      (didDismiss)="close()"
    >
      <ng-template>
        <ion-header>
          <ion-toolbar>
            <ion-searchbar
              data-testid="searchable-select-search"
              [attr.aria-label]="searchAriaLabel() || ('COMMON.SEARCH' | appTranslate)"
              [placeholder]="'COMMON.SEARCH_PLACEHOLDER' | appTranslate"
              [debounce]="0"
              [value]="searchTerm()"
              (ionInput)="onSearch($any($event).detail.value)"
            ></ion-searchbar>
            <ion-buttons slot="end">
              <ion-button data-testid="searchable-select-cancel" (click)="cancel()">
                {{ 'COMMON.CANCEL' | appTranslate }}
              </ion-button>
            </ion-buttons>
          </ion-toolbar>
        </ion-header>
        <ion-content>
          <p class="result-count" aria-live="polite" data-testid="searchable-select-count">
            {{ resultCountLabel() }}
          </p>
          <ion-list>
            @for (option of filteredOptions(); track option.value) {
              <ion-item
                button
                [attr.data-testid]="'searchable-select-option-' + option.value"
                [attr.aria-selected]="option.value === selectedValue()"
                (click)="select(option)"
              >
                {{ option.label }}
              </ion-item>
            } @empty {
              <ion-item lines="none" data-testid="searchable-select-empty">
                {{ 'COMMON.NO_RESULTS_FOUND' | appTranslate }}
              </ion-item>
            }
          </ion-list>
        </ion-content>
      </ng-template>
    </ion-modal>
  `,
  styles: [
    `
      :host {
        display: block;
        width: 100%;
      }
      .trigger {
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 8px;
        width: 100%;
        min-height: 44px;
        padding: 0 4px;
        border: 0;
        background: transparent;
        font: inherit;
        color: inherit;
        cursor: pointer;
      }
      .trigger:disabled {
        opacity: 0.5;
        cursor: default;
      }
      .trigger:focus-visible {
        outline: 2px solid var(--ion-color-primary, #3880ff);
        outline-offset: 2px;
      }
      .value {
        flex: 1;
        text-align: start;
        overflow: hidden;
        text-overflow: ellipsis;
        white-space: nowrap;
      }
      .value.placeholder {
        color: var(--ion-color-medium, #92949c);
      }
      .result-count {
        margin: 8px 16px;
        color: var(--ion-color-medium, #92949c);
        font-size: 0.8125rem;
      }
    `,
  ],
})
export class SearchableSelectComponent implements ControlValueAccessor {
  readonly options = input.required<readonly SearchableSelectOption[]>();
  readonly ariaLabel = input<string>('');
  readonly searchAriaLabel = input<string>('');
  readonly placeholder = input<string>('');
  readonly testId = input<string>();
  /** Element id for a caller that still needs to target the trigger directly. */
  readonly triggerId = input<string>();
  /**
   * Matches `ion-select`'s own `[disabled]` input — a plain binding, not a reactive-forms
   * disable. `formDisabled` below exists only to satisfy `ControlValueAccessor`; this app's
   * forms are template-driven and disable a control by binding this input, the same as every
   * existing `ion-select` call site does.
   */
  readonly disabled = input(false);

  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  readonly isOpen = signal(false);
  private readonly formDisabled = signal(false);
  readonly isDisabled = computed(() => this.disabled() || this.formDisabled());
  readonly searchTerm = signal('');
  readonly selectedValue = signal<SearchableSelectValue | undefined>(undefined);

  readonly filteredOptions = computed(() => {
    const term = this.searchTerm().trim().toLowerCase();
    const all = this.options();
    if (!term) return all;
    return all.filter((option) => option.label.toLowerCase().includes(term));
  });

  readonly selectedLabel = computed(() => {
    const value = this.selectedValue();
    if (value === undefined || value === null) return '';
    return this.options().find((option) => option.value === value)?.label ?? '';
  });

  readonly resultCountLabel = computed(() => {
    const count = this.filteredOptions().length;
    return this.i18n.translate('COMMON.RESULTS_FOUND', { count });
  });

  private readonly i18n = inject(I18N);

  private onChange: (value: SearchableSelectValue | undefined) => void = () => undefined;
  private onTouched: () => void = () => undefined;

  writeValue(value: SearchableSelectValue | undefined): void {
    this.selectedValue.set(value ?? undefined);
  }

  registerOnChange(fn: (value: SearchableSelectValue | undefined) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.formDisabled.set(isDisabled);
  }

  open(): void {
    if (this.isDisabled()) return;
    this.searchTerm.set('');
    this.isOpen.set(true);
  }

  cancel(): void {
    this.isOpen.set(false);
  }

  select(option: SearchableSelectOption): void {
    this.selectedValue.set(option.value);
    this.onChange(option.value);
    this.isOpen.set(false);
  }

  onSearch(term: string | null | undefined): void {
    this.searchTerm.set(term ?? '');
  }

  /**
   * `ion-modal`'s `didDismiss` fires for every close path — backdrop, Cancel, and a selection —
   * so this is the single place that marks the field touched and fires the blur event, however
   * the modal closed.
   */
  close(): void {
    this.isOpen.set(false);
    this.onTouched();
    this.elementRef.nativeElement.dispatchEvent(new CustomEvent('ionBlur', { bubbles: true }));
  }
}
