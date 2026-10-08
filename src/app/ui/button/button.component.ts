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

import { NgTemplateOutlet } from '@angular/common';
import { Component, computed, input } from '@angular/core';
import { RouterLink } from '@angular/router';
import { IonButton, IonRouterLink } from '@ionic/angular/standalone';
import { IconComponent } from '../icon/icon.component';
import { SpinnerComponent } from '../spinner/spinner.component';

/** What the action means, not what it looks like. */
export type UiButtonIntent = 'primary' | 'secondary' | 'danger' | 'neutral';
/** How much visual weight it carries among its neighbours. */
export type UiButtonEmphasis = 'solid' | 'outline' | 'quiet';

const INTENT_COLOR: Record<UiButtonIntent, string> = {
  primary: 'primary',
  secondary: 'secondary',
  danger: 'danger',
  neutral: 'medium',
};

const EMPHASIS_FILL: Record<UiButtonEmphasis, 'solid' | 'outline' | 'clear'> = {
  solid: 'solid',
  outline: 'outline',
  quiet: 'clear',
};

/**
 * A button.
 *
 * `type` is required. `ion-button` defaults to `type="submit"`, so an ordinary action anywhere
 * inside a `<form>` submits it; 82 call sites pass `type="button"` to work around that default.
 * Requiring it means neither behaviour is inherited by accident.
 *
 * `intent` says what the action means and `emphasis` how loudly; the mapping onto the vendor's
 * `color`/`fill` is private, so replacing the renderer is not also a redesign.
 *
 * `label` is the accessible name, needed when there is an icon and no text.
 * `scripts/check-a11y-names.mjs` fails the build without one.
 *
 * `busy` is separate from `disabled`: "working on it" and "not available to you" are different
 * statements to a screen reader.
 *
 * `link` must produce a real link, not a button that routes. `ion-button[routerLink]` takes an
 * `href` from Ionic's router-link delegate and renders an `<a>` in its shadow root, so the
 * control is announced as a link and supports middle-click and open-in-new-tab. Navigating
 * imperatively from a click handler looks equivalent and is not.
 */
@Component({
  selector: 'app-button',
  standalone: true,
  imports: [
    IonButton,
    IonRouterLink,
    RouterLink,
    NgTemplateOutlet,
    IconComponent,
    SpinnerComponent,
  ],
  template: `
    <ng-template #content>
      @if (busy()) {
        <app-spinner slot="start" />
      } @else if (icon(); as iconName) {
        <app-icon slot="start" [name]="iconName" />
      }
      <ng-content />
    </ng-template>

    <!--
      Two branches, not one [routerLink] binding: a single binding instantiates the directive
      even with no commands, and it injects ActivatedRoute — which would make a router
      mandatory for every button, including the majority that never navigate. The content sits
      in one <ng-template> so <ng-content> is consumed exactly once whichever branch renders.
    -->
    @if (link(); as commands) {
      <ion-button
        data-testid="ui-button"
        [type]="type()"
        [routerLink]="commands"
        [color]="color()"
        [fill]="fill()"
        [size]="size() === 'small' ? 'small' : undefined"
        [disabled]="disabled() || busy()"
        [attr.aria-label]="label() ?? null"
        [attr.aria-busy]="busy() ? 'true' : null"
      >
        <ng-container [ngTemplateOutlet]="content" />
      </ion-button>
    } @else {
      <ion-button
        data-testid="ui-button"
        [type]="type()"
        [color]="color()"
        [fill]="fill()"
        [size]="size() === 'small' ? 'small' : undefined"
        [disabled]="disabled() || busy()"
        [attr.aria-label]="label() ?? null"
        [attr.aria-busy]="busy() ? 'true' : null"
      >
        <ng-container [ngTemplateOutlet]="content" />
      </ion-button>
    }
  `,
  styles: [
    `
      :host {
        display: inline-flex;
      }
      /* The vendor owns the control's own metrics; the host must not add a second box. */
      ion-button {
        margin: 0;
      }
    `,
  ],
})
export class ButtonComponent {
  /**
   * Submit the surrounding form, or perform an ordinary action. No default: see the class
   * comment for why inheriting one is the bug this replaces.
   */
  readonly type = input.required<'button' | 'submit'>();
  readonly intent = input<UiButtonIntent>('primary');
  readonly emphasis = input<UiButtonEmphasis>('solid');
  readonly size = input<'small' | 'medium'>('medium');
  readonly disabled = input(false);
  /** Working on it, as distinct from unavailable: shows a spinner and blocks further presses. */
  readonly busy = input(false);
  /** A name registered in `src/app/core/icons.ts`, shown before the content. */
  readonly icon = input<string>();
  /** Router commands for a button that navigates. Omit for one that performs an action. */
  readonly link = input<unknown[] | string>();
  /** Already-translated accessible name. Required when there is an icon and no text. */
  readonly label = input<string>();

  protected readonly color = computed(() => INTENT_COLOR[this.intent()]);
  protected readonly fill = computed(() => EMPHASIS_FILL[this.emphasis()]);
}
