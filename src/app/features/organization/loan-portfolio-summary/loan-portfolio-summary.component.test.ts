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

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of, throwError } from 'rxjs';

import { LoanPortfolioSummaryComponent } from './loan-portfolio-summary.component';
import { SearchAPIService } from '../../../api';
import { provideFakeAdapters } from '../../../testing/adapters';
import { createSpyObj, SpyObj } from '../../../testing/mocks';

function createComponent(templateFails = false) {
  const searchSpy: SpyObj<SearchAPIService> = createSpyObj([
    'getSearchTemplate',
    'postSearchAdvance',
  ]);

  searchSpy.getSearchTemplate.mockReturnValue(
    (templateFails
      ? throwError(() => new Error('boom'))
      : of({
          offices: [{ id: 1, name: 'Head Office' }],
          loanProducts: [{ id: 2, name: 'Personal Loan' }],
        })) as unknown as ReturnType<SearchAPIService['getSearchTemplate']>,
  );

  const adapters = provideFakeAdapters();

  TestBed.configureTestingModule({
    imports: [LoanPortfolioSummaryComponent],
    providers: [
      ...adapters.providers,
      { provide: SearchAPIService, useValue: searchSpy },
      provideNoopAnimations(),
    ],
  });

  const fixture: ComponentFixture<LoanPortfolioSummaryComponent> = TestBed.createComponent(
    LoanPortfolioSummaryComponent,
  );
  fixture.detectChanges();
  return { fixture, component: fixture.componentInstance, searchSpy, adapters };
}

describe('LoanPortfolioSummaryComponent', () => {
  it('loads offices and loan products from the search template on init', () => {
    const { component, searchSpy } = createComponent();

    expect(searchSpy.getSearchTemplate).toHaveBeenCalled();
    expect(component.offices()).toEqual([{ id: 1, name: 'Head Office' }]);
    expect(component.loanProducts()).toEqual([{ id: 2, name: 'Personal Loan' }]);
  });

  it('reports a toast when the template fails to load', () => {
    const { component, adapters } = createComponent(true);

    expect(component.offices()).toEqual([]);
    expect(component.loanProducts()).toEqual([]);
    expect(adapters.overlay.toasts.length).toBe(1);
  });

  it('sends entities: loans plus the base filters, without amount/percentage fields by default', () => {
    const { component, searchSpy } = createComponent();
    searchSpy.postSearchAdvance.mockReturnValue(
      of([]) as unknown as ReturnType<SearchAPIService['postSearchAdvance']>,
    );

    component.filters.loanStatus = ['active'];
    component.filters.loanProducts = [2];
    component.filters.offices = [1];
    component.filters.loanDateOption = 'approvalDate';
    component.fromDate.set('2026-01-01');
    component.toDate.set('2026-06-30');

    component.onSearch();

    expect(searchSpy.postSearchAdvance).toHaveBeenCalledWith(
      expect.objectContaining({
        entities: ['loans'],
        loanStatus: ['active'],
        loanProducts: [2],
        offices: [1],
        loanDateOption: 'approvalDate',
        loanFromDate: '01 January 2026',
        loanToDate: '30 June 2026',
        includeOutStandingAmountPercentage: false,
        includeOutstandingAmount: false,
      }),
    );
    const payload = searchSpy.postSearchAdvance.mock.calls[0][0];
    expect(payload).not.toHaveProperty('outStandingAmountPercentage');
    expect(payload).not.toHaveProperty('outstandingAmount');
  });

  it('adds the between-condition min/max fields when the outstanding percentage filter is on', () => {
    const { component, searchSpy } = createComponent();
    searchSpy.postSearchAdvance.mockReturnValue(
      of([]) as unknown as ReturnType<SearchAPIService['postSearchAdvance']>,
    );

    component.filters.includeOutStandingAmountPercentage = true;
    component.filters.outStandingAmountPercentageCondition = 'between';
    component.filters.minOutStandingAmountPercentage = 10;
    component.filters.maxOutStandingAmountPercentage = 50;

    component.onSearch();

    expect(searchSpy.postSearchAdvance).toHaveBeenCalledWith(
      expect.objectContaining({
        outStandingAmountPercentageCondition: 'between',
        minOutStandingAmountPercentage: 10,
        maxOutStandingAmountPercentage: 50,
      }),
    );
    const payload = searchSpy.postSearchAdvance.mock.calls[0][0];
    expect(payload).not.toHaveProperty('outStandingAmountPercentage');
  });

  it('sends a single comparison value when the condition is not between', () => {
    const { component, searchSpy } = createComponent();
    searchSpy.postSearchAdvance.mockReturnValue(
      of([]) as unknown as ReturnType<SearchAPIService['postSearchAdvance']>,
    );

    component.filters.includeOutstandingAmount = true;
    component.filters.outstandingAmountCondition = '>=';
    component.filters.outstandingAmount = 1000;

    component.onSearch();

    expect(searchSpy.postSearchAdvance).toHaveBeenCalledWith(
      expect.objectContaining({ outstandingAmountCondition: '>=', outstandingAmount: 1000 }),
    );
    const payload = searchSpy.postSearchAdvance.mock.calls[0][0];
    expect(payload).not.toHaveProperty('minOutstandingAmount');
    expect(payload).not.toHaveProperty('maxOutstandingAmount');
  });

  it('shows results after a successful search, and returns to the filters on edit', () => {
    const { component, searchSpy } = createComponent();
    const rows = [{ officeName: 'Head Office', loanProductName: 'Personal Loan', count: 3 }];
    searchSpy.postSearchAdvance.mockReturnValue(
      of(rows) as unknown as ReturnType<SearchAPIService['postSearchAdvance']>,
    );

    expect(component.results()).toBeNull();
    component.onSearch();
    expect(component.results()).toEqual(rows);

    component.onEditFilters();
    expect(component.results()).toBeNull();
  });

  it('reports a toast and clears the loading state when the search fails', () => {
    const { component, searchSpy, adapters } = createComponent();
    searchSpy.postSearchAdvance.mockReturnValue(
      throwError(() => new Error('boom')) as unknown as ReturnType<
        SearchAPIService['postSearchAdvance']
      >,
    );

    component.onSearch();

    expect(component.isSearching()).toBe(false);
    expect(component.results()).toBeNull();
    expect(adapters.overlay.toasts.length).toBe(1);
  });
});
