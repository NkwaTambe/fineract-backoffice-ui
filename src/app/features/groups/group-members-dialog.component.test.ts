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
import { of } from 'rxjs';

import {
  GroupMembersDialogComponent,
  GroupMembersDialogData,
} from './group-members-dialog.component';
import { ClientService } from '../../api';
import { provideFakeAdapters, FakeOverlayAdapter } from '../../testing/adapters';
import { createSpyObj, SpyObj } from '../../testing/mocks';

/** Longer than the component's 300ms debounce. */
const AFTER_DEBOUNCE = 350;
const AMINA = 'Amina Yusuf';

describe('GroupMembersDialogComponent', () => {
  let fixture: ComponentFixture<GroupMembersDialogComponent>;
  let component: GroupMembersDialogComponent;
  let clientService: SpyObj<ClientService>;
  let overlay: FakeOverlayAdapter;

  async function setup(data: GroupMembersDialogData): Promise<void> {
    clientService = createSpyObj<ClientService>(['getClients']);
    clientService.getClients.mockReturnValue(
      of({
        pageItems: [
          { id: 11, accountNo: '000000011', displayName: AMINA },
          { id: 21, accountNo: '000000021', displayName: 'Chidi Okonkwo' },
        ],
      }) as never,
    );

    const adapters = provideFakeAdapters();
    overlay = adapters.overlay;

    await TestBed.configureTestingModule({
      imports: [GroupMembersDialogComponent],
      providers: [
        provideNoopAnimations(),
        ...adapters.providers,
        { provide: ClientService, useValue: clientService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupMembersDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
  }

  afterEach(() => vi.useRealTimers());

  it('excludes clients already in the group from the add candidates', async () => {
    vi.useFakeTimers();
    await setup({
      mode: 'add',
      officeId: 1,
      members: [{ id: 11, displayName: AMINA }],
    });

    vi.advanceTimersByTime(AFTER_DEBOUNCE);
    fixture.detectChanges();

    // Client 11 comes back from the search but is already a member; associating them a second
    // time is rejected by the platform, so the dialog must not offer them.
    expect(component.candidates().map((candidate) => candidate.id)).toEqual([21]);
  });

  it('scopes the candidate search to the group office, but not by client status', async () => {
    vi.useFakeTimers();
    await setup({ mode: 'add', officeId: 4, members: [] });

    vi.advanceTimersByTime(AFTER_DEBOUNCE);

    // Signature: officeId, externalId, displayName, firstName, lastName, status, …
    const args = clientService.getClients.mock.calls.at(-1)!;
    expect(args[0]).toBe(4);
    // `associateClients` accepts a pending client, and a group whose members activate after it
    // forms is the ordinary case. Filtering to 'active' hid them.
    expect(args[5]).toBeUndefined();
  });

  it('lists the current members and makes no search in remove mode', async () => {
    vi.useFakeTimers();
    await setup({
      mode: 'remove',
      officeId: 1,
      members: [
        { id: 11, displayName: AMINA },
        { id: 12, displayName: 'Beatrice Wanjiru' },
      ],
    });

    vi.advanceTimersByTime(AFTER_DEBOUNCE);

    expect(component.candidates().map((candidate) => candidate.id)).toEqual([11, 12]);
    expect(clientService.getClients).not.toHaveBeenCalled();
  });

  it('toggles a selection off again and resolves with the chosen ids', async () => {
    vi.useFakeTimers();
    await setup({ mode: 'remove', officeId: 1, members: [{ id: 11 }, { id: 12 }] });
    vi.advanceTimersByTime(AFTER_DEBOUNCE);

    component.toggle(11);
    component.toggle(12);
    component.toggle(11);

    component.onConfirm();
    expect(overlay.dismissals.at(-1)).toEqual({ clientMembers: [12] });
  });

  it('does not resolve while nothing is selected', async () => {
    vi.useFakeTimers();
    await setup({ mode: 'remove', officeId: 1, members: [{ id: 11 }] });
    vi.advanceTimersByTime(AFTER_DEBOUNCE);

    component.onConfirm();
    expect(overlay.dismissals).toEqual([]);
  });
});
