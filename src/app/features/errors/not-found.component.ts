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

import { Location } from '@angular/common';
import { AfterViewInit, Component, ElementRef, inject, viewChild } from '@angular/core';
import { TranslatePipe } from '../../core/adapters';
import { ButtonComponent } from '../../ui/button/button.component';
import { IconComponent } from '../../ui/icon/icon.component';

/** Explains an unmatched route without replacing the URL the user requested. */
@Component({
  selector: 'app-not-found',
  standalone: true,
  imports: [ButtonComponent, IconComponent, TranslatePipe],
  template: `
    <div class="not-found" role="alert" aria-live="polite">
      <app-icon name="compass-outline" class="not-found__icon" />
      <h1 #heading tabindex="-1">{{ 'NOT_FOUND_PAGE.TITLE' | appTranslate }}</h1>
      <p>
        {{ 'NOT_FOUND_PAGE.MESSAGE' | appTranslate: { path: requestedPath } }}
      </p>
      <p class="not-found__hint">{{ 'NOT_FOUND_PAGE.HINT' | appTranslate }}</p>
      <div class="not-found__actions">
        <app-button type="button" link="/dashboard" data-testid="not-found-dashboard">
          {{ 'NOT_FOUND_PAGE.BACK_TO_DASHBOARD' | appTranslate }}
        </app-button>
        <app-button type="button" link="/search" emphasis="outline" data-testid="not-found-search">
          {{ 'NOT_FOUND_PAGE.SEARCH' | appTranslate }}
        </app-button>
      </div>
    </div>
  `,
  styles: [
    `
      .not-found {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        gap: 12px;
        padding: 48px 24px;
        text-align: center;
      }
      .not-found__icon {
        font-size: 56px;
        color: var(--ion-color-medium);
      }
      h1,
      p {
        margin: 0;
      }
      h1:focus-visible {
        outline: 2px solid var(--ion-color-primary);
        outline-offset: 4px;
      }
      .not-found__hint {
        color: var(--ion-color-medium);
      }
      .not-found__actions {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 8px;
      }
    `,
  ],
})
export class NotFoundComponent implements AfterViewInit {
  private readonly heading = viewChild.required<ElementRef<HTMLHeadingElement>>('heading');
  private readonly location = inject(Location);

  get requestedPath(): string {
    return this.location.path(true);
  }

  ngAfterViewInit(): void {
    this.heading().nativeElement.focus();
  }
}
