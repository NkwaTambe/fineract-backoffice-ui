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
import { ClientSearchComponent } from './client-search.component';
import { ClientService, GetClientsResponse } from '../../../api';
import { Observable, of } from 'rxjs';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { HttpEvent } from '@angular/common/http';
import { createSpyObj, SpyObj } from '../../../testing/mocks';
import { provideTranslateTesting } from '../../../testing/i18n-testing';

describe('ClientSearchComponent', () => {
  let component: ClientSearchComponent;
  let fixture: ComponentFixture<ClientSearchComponent>;
  let clientServiceSpy: SpyObj<ClientService>;

  beforeEach(async () => {
    clientServiceSpy = createSpyObj<ClientService>(['getClients', 'getClientsClientId']);

    // Provide a default return value for all calls to retrieveAll21
    clientServiceSpy.getClients.mockReturnValue(
      of({ pageItems: [] }) as unknown as Observable<HttpEvent<GetClientsResponse>>,
    );

    await TestBed.configureTestingModule({
      imports: [ClientSearchComponent],
      providers: [
        provideNoopAnimations(),
        ...provideTranslateTesting(),
        { provide: ClientService, useValue: clientServiceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientSearchComponent);
    component = fixture.componentInstance;
  });

  it('should create', () => {
    fixture.detectChanges();
    expect(component).toBeTruthy();
  });

  afterEach(() => vi.useRealTimers());

  it('should search for clients when input changes', () => {
    vi.useFakeTimers();
    const mockResponse = {
      pageItems: [{ id: 1, displayName: 'John Doe', accountNo: '001' }],
    };

    // Set mock BEFORE detectChanges to catch initial startWith call if needed,
    // but we specifically want to test the change to 'John'.
    clientServiceSpy.getClients.mockReturnValue(
      of(mockResponse) as unknown as Observable<HttpEvent<GetClientsResponse>>,
    );

    fixture.detectChanges(); // Trigger ngOnInit
    vi.advanceTimersByTime(300); // Handle initial startWith('') call

    clientServiceSpy.getClients.mockClear();

    component.searchControl.setValue('John');
    vi.advanceTimersByTime(300); // Debounce time

    expect(clientServiceSpy.getClients).toHaveBeenCalledWith(
      undefined,
      undefined,
      'John%',
      undefined,
      undefined,
      undefined,
      undefined,
      0,
      20,
    );
    expect(component.filteredClients()).toHaveLength(1);
    expect(component.filteredClients()[0]['displayName']).toBe('John Doe');
  });

  it('should emit selected client id', () => {
    fixture.detectChanges();
    vi.spyOn(component.clientSelected, 'emit');
    const mockClient = { id: 123, displayName: 'Test Client' };

    component.onSelected(mockClient as unknown as Record<string, unknown>);

    expect(component.clientSelected.emit).toHaveBeenCalledWith(123);
  });
});
