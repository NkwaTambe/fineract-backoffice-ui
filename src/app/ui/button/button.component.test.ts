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

import { Component, signal } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { provideRouter, RouterLink } from '@angular/router';
import { IonButton } from '@ionic/angular/standalone';
import { provideIonicTesting } from '../../testing/ionic-testing';
import { ButtonComponent } from './button.component';

/**
 * Asserted through a host so content projection and form participation match real use.
 *
 * Ionic's custom elements do not upgrade under jsdom, so there is no native `<button>` and no
 * reflected attributes; what the inputs resolved to is observable on the `IonButton` directive,
 * and that mapping is this component's job. Which colour an intent maps to is deliberately not
 * pinned — only that two intents stay distinguishable.
 *
 * Real form submission and real disabled-click suppression are browser facts, and live in e2e.
 */
@Component({
  standalone: true,
  imports: [ButtonComponent],
  template: `
    <form (ngSubmit)="submitted.set(submitted() + 1)">
      <app-button
        [type]="type()"
        [intent]="intent()"
        [disabled]="disabled()"
        [busy]="busy()"
        [icon]="icon()"
        [link]="link()"
        [label]="label()"
        (click)="clicked.set(clicked() + 1)"
      >
        {{ text() }}
      </app-button>
    </form>
  `,
})
class HostComponent {
  readonly type = signal<'button' | 'submit'>('button');
  readonly intent = signal<'primary' | 'danger'>('primary');
  readonly disabled = signal(false);
  readonly busy = signal(false);
  readonly icon = signal<string | undefined>(undefined);
  readonly link = signal<unknown[] | undefined>(undefined);
  readonly label = signal<string | undefined>(undefined);
  readonly text = signal('Add entry');
  readonly clicked = signal(0);
  readonly submitted = signal(0);
}

describe('ButtonComponent public contract', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const ionButton = (): HTMLElement => fixture.nativeElement.querySelector('ion-button');
  /** The vendor seam: what this component's app-level inputs actually resolved to. */
  const vendor = (): IonButton =>
    fixture.debugElement.query(By.directive(IonButton)).componentInstance as IonButton;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      // A catch-all, so a navigation that fires resolves instead of failing as an unmatched URL.
      providers: [provideIonicTesting(), provideRouter([{ path: '**', children: [] }])],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('projects its label and reports presses', () => {
    expect(fixture.nativeElement.textContent).toContain('Add entry');
    ionButton().click();
    expect(host.clicked()).toBe(1);
  });

  it('does not submit the surrounding form unless the caller asked for it', () => {
    // The regression this guards: ion-button defaults to type="submit", so an ordinary action
    // inside a form submits it. `type` is required precisely so that cannot be inherited.
    expect(vendor().type).toBe('button');
    host.type.set('submit');
    fixture.detectChanges();
    expect(vendor().type).toBe('submit');
  });

  it('keeps intents distinguishable without exposing the vendor palette', () => {
    const primary = vendor().color;
    host.intent.set('danger');
    fixture.detectChanges();
    expect(vendor().color).not.toBe(primary);
  });

  it('blocks presses while disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();
    expect(vendor().disabled).toBe(true);
  });

  it('shows a spinner instead of the icon while busy, and says so', () => {
    host.icon.set('add-outline');
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('app-icon')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-spinner')).toBeNull();

    host.busy.set(true);
    fixture.detectChanges();
    // Busy is not the same state as disabled to a reader, but it does block a second press.
    expect(ionButton().getAttribute('aria-busy')).toBe('true');
    expect(vendor().disabled).toBe(true);
    expect(fixture.nativeElement.querySelector('app-spinner')).not.toBeNull();
    expect(fixture.nativeElement.querySelector('app-icon')).toBeNull();
  });

  it('carries an accessible name when there is an icon and no text', () => {
    host.text.set('');
    host.icon.set('add-outline');
    host.label.set('Add entry');
    fixture.detectChanges();
    expect(ionButton().getAttribute('aria-label')).toBe('Add entry');
    // The icon beside a name must not be announced a second time.
    expect(
      fixture.nativeElement.querySelector('app-icon ion-icon').getAttribute('aria-hidden'),
    ).toBe('true');
  });

  it('is an ordinary button, with no router directive, when no link was given', () => {
    expect(fixture.debugElement.query(By.directive(RouterLink))).toBeNull();
    ionButton().click();
    expect(host.clicked()).toBe(1);
  });

  it('becomes a real link when given one, rather than a button that routes', async () => {
    // Navigating from a click handler instead would look equivalent, but leaves the control a
    // button: no href, no middle-click, and announced as a button rather than a link.
    host.link.set(['/clients', 7, 'notes']);
    fixture.detectChanges();
    await fixture.whenStable();

    const routed = fixture.debugElement.query(By.directive(RouterLink));
    expect(routed).not.toBeNull();
    expect(routed.nativeElement.tagName.toLowerCase()).toBe('ion-button');
    expect(ionButton().getAttribute('href')).toBe('/clients/7/notes');
  });

  it('projects its content exactly once across the two branches', () => {
    host.link.set(['/clients', 7, 'notes']);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('ion-button')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Add entry');
    host.link.set(undefined);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelectorAll('ion-button')).toHaveLength(1);
    expect(fixture.nativeElement.textContent).toContain('Add entry');
  });

  it('leaves aria-label off a button that already reads its own text', () => {
    expect(ionButton().hasAttribute('aria-label')).toBe(false);
    expect(ionButton().hasAttribute('aria-busy')).toBe(false);
  });
});

/**
 * No router in the injector at all: a base primitive whose call sites mostly never navigate
 * must not drag `ActivatedRoute` into every one of their injectors.
 */
describe('ButtonComponent without a router', () => {
  it('renders and reports presses with no router provided', async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideIonicTesting()],
    }).compileComponents();
    const fixture = TestBed.createComponent(HostComponent);
    fixture.detectChanges();

    const button = fixture.nativeElement.querySelector('ion-button') as HTMLElement;
    expect(button).not.toBeNull();
    button.click();
    expect(fixture.componentInstance.clicked()).toBe(1);
  });
});
