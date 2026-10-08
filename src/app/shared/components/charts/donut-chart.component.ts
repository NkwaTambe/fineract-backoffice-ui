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
import { TranslatePipe } from '../../../core/adapters';

export interface ChartData {
  label: string;
  value: number;
  color: string;
}

@Component({
  selector: 'app-donut-chart',
  standalone: true,
  imports: [TranslatePipe],
  template: `
    <div class="chart-container">
      <svg viewBox="0 0 100 100" width="100%" height="100%">
        @for (slice of segments(); track slice.label) {
          <circle
            cx="50"
            cy="50"
            r="40"
            fill="transparent"
            [attr.stroke]="slice.color"
            stroke-width="15"
            [attr.stroke-dasharray]="slice.dashArray"
            [attr.stroke-dashoffset]="slice.dashOffset"
            transform="rotate(-90 50 50)"
          >
            <title>
              {{ labelsAreTranslationKeys() ? (slice.label | appTranslate) : slice.label }}:
              {{ slice.value }}
            </title>
          </circle>
        }
        <circle cx="50" cy="50" r="30" class="inner-circle"></circle>
        <text
          x="50"
          y="55"
          text-anchor="middle"
          font-size="10"
          font-weight="bold"
          class="chart-text"
        >
          {{ total() }}
        </text>
      </svg>
      <div class="legend">
        @for (item of data(); track item.label) {
          <div class="legend-item">
            <span class="dot" [style.background-color]="item.color"></span>
            <span class="label">{{
              labelsAreTranslationKeys() ? (item.label | appTranslate) : item.label
            }}</span>
            <span class="value">{{ item.value }}</span>
          </div>
        }
      </div>
    </div>
  `,
  styles: [
    `
      .chart-container {
        display: flex;
        flex-direction: column;
        align-items: center;
        gap: 16px;
        width: 100%;
        max-width: 250px;
      }
      svg {
        max-width: 150px;
      }
      .inner-circle {
        fill: var(--card-bg, white);
        transition: fill 0.2s;
      }
      .chart-text {
        fill: var(--text-color, #333);
        transition: fill 0.2s;
      }
      .legend {
        width: 100%;
        display: flex;
        flex-direction: column;
        gap: 8px;
      }
      .legend-item {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 12px;
      }
      .dot {
        width: 10px;
        height: 10px;
        border-radius: 50%;
      }
      .label {
        flex: 1;
        color: var(--text-muted, #666);
      }
      .value {
        font-weight: 600;
        color: var(--text-color, #333);
      }
    `,
  ],
})
export class DonutChartComponent {
  /** Translate labels supplied as application keys; report-derived labels remain literal by default. */
  readonly labelsAreTranslationKeys = input(false);

  /**
   * `transform` replaces the setter-into-private-signal pair this used to carry: callers still
   * pass a possibly-null array, and the null-coalescing that used to live in the setter body now
   * runs as part of the input itself.
   */
  readonly data = input<ChartData[], ChartData[] | null | undefined>([], {
    transform: (value) => value ?? [],
  });

  readonly total = computed(() =>
    this.data().reduce((acc: number, item: ChartData) => acc + item.value, 0),
  );

  readonly segments = computed(() => {
    let cumulativeValue = 0;
    const total = this.total();
    if (total === 0) return [];

    const circumference = 2 * Math.PI * 40;

    return this.data().map((item: ChartData) => {
      const percentage = (item.value / total) * 100;
      const dashArray = `${(percentage * circumference) / 100} ${circumference}`;
      const dashOffset = `${(-cumulativeValue * circumference) / 100}`;
      cumulativeValue += percentage;

      return {
        ...item,
        dashArray,
        dashOffset,
      };
    });
  });
}
