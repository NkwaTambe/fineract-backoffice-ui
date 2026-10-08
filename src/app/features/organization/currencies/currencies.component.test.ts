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

import { TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { CurrencyService } from '../../../api';
import { NotificationService } from '../../../core/services/notification.service';
import { provideFakeAdapters } from '../../../testing/adapters';
import { provideIonicTesting } from '../../../testing/ionic-testing';
import en from '../../../../assets/i18n/en.json';
import { CurrenciesComponent } from './currencies.component';

const CURRENCIES = [
  { code: 'CHF', name: 'Swiss Franc', displayLabel: 'Swiss Franc [CHF]' },
  { code: 'XOF', name: 'CFA Franc BCEAO', displayLabel: 'CFA Franc BCEAO [XOF]' },
  { code: 'SEK', name: 'Swedish Krona', displayLabel: 'Swedish Krona [SEK]' },
  { code: 'USD', name: 'US Dollar', displayLabel: 'US Dollar ($)' },
];

describe('CurrenciesComponent', () => {
  let component: CurrenciesComponent;
  let currencyService: {
    getCurrencies: ReturnType<typeof vi.fn>;
    putCurrencies: ReturnType<typeof vi.fn>;
  };

  beforeEach(async () => {
    currencyService = {
      getCurrencies: vi
        .fn()
        .mockReturnValue(
          of({ currencyOptions: CURRENCIES, selectedCurrencyOptions: [CURRENCIES[3]] }),
        ),
      putCurrencies: vi.fn().mockReturnValue(of({})),
    };

    await TestBed.configureTestingModule({
      imports: [CurrenciesComponent],
      providers: [
        provideNoopAnimations(),
        provideIonicTesting(),
        ...provideFakeAdapters().providers,
        { provide: CurrencyService, useValue: currencyService },
        { provide: NotificationService, useValue: { success: vi.fn(), error: vi.fn() } },
      ],
    }).compileComponents();

    const fixture = TestBed.createComponent(CurrenciesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('lists what is not yet enabled on the left and what is on the right', () => {
    expect(component.visibleAvailable().map((c) => c.code)).toEqual(['CHF', 'XOF', 'SEK']);
    expect(component.selectedCurrencies().map((c) => c.code)).toEqual(['USD']);
  });

  /**
   * The template draws the arrows, so the strings must not: with both, the buttons read
   * "Add → →" and "← ← Remove". Translators also get a clean word, and an RTL locale is not
   * left with a hard-coded arrow inside its string.
   */
  it('keeps the direction arrows out of the translated button labels', () => {
    expect(en.CURRENCIES.ADD).not.toMatch(/[→←]/);
    expect(en.CURRENCIES.REMOVE).not.toMatch(/[→←]/);
  });

  describe('filter', () => {
    it('narrows the Available list by label, case-insensitively', () => {
      component.onFilter('fra');

      expect(component.visibleAvailable().map((c) => c.code)).toEqual(['CHF', 'XOF']);
    });

    it('also matches on the currency code', () => {
      component.onFilter('sek');

      expect(component.visibleAvailable().map((c) => c.code)).toEqual(['SEK']);
    });

    it('shows everything again once cleared, and tolerates a null from the searchbar', () => {
      component.onFilter('fra');
      component.onFilter(null);

      expect(component.visibleAvailable()).toHaveLength(3);
    });

    it('does not touch the Selected list', () => {
      component.onFilter('zzz');

      expect(component.visibleAvailable()).toEqual([]);
      expect(component.selectedCurrencies().map((c) => c.code)).toEqual(['USD']);
    });
  });

  describe('Add', () => {
    it('moves the ticked currencies across', () => {
      component.availableSelection.add('CHF');

      component.addSelected();

      expect(component.selectedCurrencies().map((c) => c.code)).toEqual(['USD', 'CHF']);
      expect(component.visibleAvailable().map((c) => c.code)).toEqual(['XOF', 'SEK']);
    });

    it('adds only what is on screen, and keeps a hidden tick for when it returns', () => {
      component.availableSelection.add('CHF');
      component.availableSelection.add('SEK');
      component.onFilter('fra');

      component.addSelected();

      // SEK was ticked but filtered out of view, so it must not be enabled behind the user's back.
      expect(component.selectedCurrencies().map((c) => c.code)).toEqual(['USD', 'CHF']);
      expect(component.availableSelection.has('SEK')).toBe(true);
      expect(component.availableSelection.has('CHF')).toBe(false);
    });
  });

  it('saves the codes of everything on the right, including ones added while filtered', () => {
    component.onFilter('fra');
    component.availableSelection.add('XOF');
    component.addSelected();

    component.save();

    expect(currencyService.putCurrencies).toHaveBeenCalledWith({ currencies: ['USD', 'XOF'] });
  });
});
