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

import { ComponentFixture } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { Location } from '@angular/common';
import { NotFoundComponent } from './not-found.component';
import { renderComponent } from '../../testing/render';
import { provideIonicTesting } from '../../testing/ionic-testing';
import { provideFakeAdapters } from '../../testing/adapters';

describe('NotFoundComponent', () => {
  let fixture: ComponentFixture<NotFoundComponent>;
  let host: HTMLElement;

  beforeEach(async () => {
    const adapters = provideFakeAdapters();
    adapters.i18n.catalogue.set('NOT_FOUND_PAGE.MESSAGE', 'We could not find {{path}}.');
    fixture = await renderComponent(NotFoundComponent, {
      providers: [
        provideRouter([]),
        ...provideIonicTesting(),
        ...adapters.providers,
        { provide: Location, useValue: { path: () => '/missing/report?year=2026' } },
      ],
    });
    host = fixture.nativeElement as HTMLElement;
  });

  it('names the path that could not be matched', () => {
    expect(host.textContent).toContain('/missing/report?year=2026');
  });

  it('moves focus to the page heading', () => {
    expect(document.activeElement).toBe(host.querySelector('h1'));
  });

  it('offers routes to the dashboard and global search', () => {
    const dashboard = host.querySelector('[data-testid="not-found-dashboard"] ion-button');
    const search = host.querySelector('[data-testid="not-found-search"] ion-button');

    expect(dashboard?.getAttribute('ng-reflect-router-link') ?? dashboard?.outerHTML).toContain(
      '/dashboard',
    );
    expect(search?.getAttribute('ng-reflect-router-link') ?? search?.outerHTML).toContain(
      '/search',
    );
  });
});
