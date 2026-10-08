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

import { Component, input } from '@angular/core';
import { IonIcon } from '@ionic/angular/standalone';
import { TranslatePipe } from '../../../core/adapters';

/**
 * Step indicator for a paced, multi-step form — Ionic ships nothing equivalent to Material's
 * `mat-stepper`. Presentational only: a consumer owns which step is active and what renders
 * for it (typically behind `@if (currentIndex() === n)` blocks of its own), this component
 * just draws the numbered trail above them.
 */
@Component({
  selector: 'app-stepper',
  standalone: true,
  imports: [IonIcon, TranslatePipe],
  template: `
    <ol class="stepper" role="list">
      @for (label of labels(); track label; let i = $index) {
        <li
          class="step"
          [class.step-done]="i < currentIndex()"
          [class.step-active]="i === currentIndex()"
          [attr.aria-label]="label | appTranslate"
          [attr.aria-current]="i === currentIndex() ? 'step' : null"
        >
          <span class="step-marker">
            @if (i < currentIndex()) {
              <ion-icon name="checkmark-outline"></ion-icon>
            } @else {
              {{ i + 1 }}
            }
          </span>
          <span class="step-label">{{ label | appTranslate }}</span>
          @if (i < labels().length - 1) {
            <span class="step-connector"></span>
          }
        </li>
      }
    </ol>
  `,
  styles: [
    `
      .stepper {
        display: flex;
        list-style: none;
        margin: 0 0 24px;
        padding: 0;
      }
      .step {
        display: flex;
        align-items: center;
        flex: 1;
      }
      .step:last-child {
        flex: 0 0 auto;
      }
      .step-marker {
        display: flex;
        align-items: center;
        justify-content: center;
        width: 28px;
        height: 28px;
        border-radius: 50%;
        border: 2px solid var(--border-color, #ccc);
        color: var(--text-muted, #757575);
        font-size: 0.85rem;
        flex-shrink: 0;
      }
      .step-active .step-marker {
        border-color: var(--primary-text, #1f6391);
        color: var(--primary-text, #1f6391);
        font-weight: 600;
      }
      .step-done .step-marker {
        border-color: var(--primary-color, #1976d2);
        background: var(--primary-color, #1976d2);
        color: #fff;
      }
      .step-label {
        margin-left: 8px;
        font-size: 0.9rem;
        color: var(--text-muted, #757575);
        white-space: nowrap;
      }
      .step-active .step-label {
        color: var(--text-color);
        font-weight: 600;
      }
      .step-connector {
        flex: 1;
        height: 2px;
        margin: 0 12px;
        background: var(--border-color, #ccc);
      }
      @media (max-width: 768px) {
        .step {
          min-width: 0;
        }
        .step:last-child {
          flex: 1;
        }
        .step-label {
          display: none;
        }
        .step-active .step-label {
          display: block;
          min-width: 0;
          white-space: normal;
          overflow-wrap: anywhere;
        }
        .step-connector {
          margin: 0 6px;
        }
      }
    `,
  ],
})
export class StepperComponent {
  /** Translation keys, one per step, in order. */
  readonly labels = input.required<string[]>();
  /** 0-based index of the active step; steps before it render as done. */
  readonly currentIndex = input.required<number>();
}
