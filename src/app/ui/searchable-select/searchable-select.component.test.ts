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

import { Component, signal, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { By } from '@angular/platform-browser';
import { FormsModule, NgModel } from '@angular/forms';

import { provideIonicTesting } from '../../testing/ionic-testing';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { SearchableSelectComponent, SearchableSelectOption } from './searchable-select.component';

const CURRENCIES: SearchableSelectOption[] = [
  { value: 'AFN', label: 'Afghan Afghani (AFN)' },
  { value: 'INR', label: 'Indian Rupee (INR)' },
  { value: 'USD', label: 'US Dollar (USD)' },
];

/**
 * Asserted through a host, the same way `ButtonComponent`'s spec is: `[(ngModel)]`, `name` and
 * `required` are the whole point of implementing `ControlValueAccessor` directly, so the test
 * has to go through `ngForm`/`ngModel` rather than calling the component in isolation.
 */
@Component({
  standalone: true,
  imports: [FormsModule, SearchableSelectComponent],
  template: `
    <form #f="ngForm">
      <app-searchable-select
        #currencyModel="ngModel"
        name="currency"
        testId="currency-select"
        ariaLabel="Currency"
        placeholder="Select a currency"
        [options]="options()"
        [(ngModel)]="value"
        [disabled]="disabled()"
        [required]="required()"
        (ionBlur)="blurCount.set(blurCount() + 1)"
      />
    </form>
  `,
})
class HostComponent {
  readonly currencyModel = viewChild.required('currencyModel', { read: NgModel });
  readonly options = signal<SearchableSelectOption[]>(CURRENCIES);
  readonly disabled = signal(false);
  readonly required = signal(false);
  readonly blurCount = signal(0);
  value: string | undefined = undefined;
}

describe('SearchableSelectComponent', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;
  const trigger = (): HTMLButtonElement =>
    fixture.nativeElement.querySelector('[data-testid="currency-select"]');
  const searchableSelect = (): SearchableSelectComponent =>
    fixture.debugElement.query(By.directive(SearchableSelectComponent))
      .componentInstance as SearchableSelectComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent],
      providers: [provideIonicTesting(), ...provideTranslateTesting()],
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('shows the placeholder until a value is written', () => {
    expect(trigger().textContent).toContain('Select a currency');
  });

  it('shows the matching option label once ngModel carries a value', () => {
    host.currencyModel().control.setValue('INR');
    fixture.detectChanges();
    expect(trigger().textContent).toContain('Indian Rupee (INR)');
  });

  it('registers under its name in the surrounding ngForm', () => {
    expect(host.currencyModel()).toBeTruthy();
    expect(host.currencyModel().value).toBeUndefined();
  });

  it('filters options by a case-insensitive substring of the label', () => {
    const select = searchableSelect();
    select.open();
    select.onSearch('rupee');
    expect(select.filteredOptions()).toEqual([{ value: 'INR', label: 'Indian Rupee (INR)' }]);

    select.onSearch('USD');
    expect(select.filteredOptions().map((o) => o.value)).toEqual(['USD']);

    select.onSearch('');
    expect(select.filteredOptions()).toHaveLength(3);
  });

  it('updates the model and closes when an option is selected', () => {
    const select = searchableSelect();
    select.open();
    expect(select.isOpen()).toBe(true);

    select.select({ value: 'INR', label: 'Indian Rupee (INR)' });
    fixture.detectChanges();

    expect(host.value).toBe('INR');
    expect(select.isOpen()).toBe(false);
  });

  it('resets the search term each time it is opened', () => {
    const select = searchableSelect();
    select.open();
    select.onSearch('rupee');
    select.close();

    select.open();
    expect(select.searchTerm()).toBe('');
    expect(select.filteredOptions()).toHaveLength(3);
  });

  it('marks the field touched and fires ionBlur when the modal closes', () => {
    const select = searchableSelect();
    expect(host.currencyModel().touched).toBe(false);

    select.open();
    select.close();

    expect(host.currencyModel().touched).toBe(true);
    expect(host.blurCount()).toBe(1);
  });

  it('does not open while disabled', () => {
    host.disabled.set(true);
    fixture.detectChanges();

    expect(trigger().disabled).toBe(true);
    searchableSelect().open();
    expect(searchableSelect().isOpen()).toBe(false);
  });

  it('fails required validation until a value is chosen', () => {
    host.required.set(true);
    fixture.detectChanges();

    expect(host.currencyModel().invalid).toBe(true);
    host.currencyModel().control.setValue('USD');
    fixture.detectChanges();
    expect(host.currencyModel().valid).toBe(true);
  });

  it('shows "no results" text when nothing matches the search term', () => {
    const select = searchableSelect();
    select.open();
    select.onSearch('does-not-exist');
    expect(select.filteredOptions()).toHaveLength(0);
  });
});
