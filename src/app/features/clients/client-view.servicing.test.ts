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

/* eslint-disable @typescript-eslint/no-explicit-any */

import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ActivatedRoute, Router } from '@angular/router';
import { of } from 'rxjs';
import { signal } from '@angular/core';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { ClientViewComponent } from './client-view.component';
import {
  ClientService,
  NotesService,
  ClientsAddressService,
  DocumentsService,
  ClientFamilyMemberService,
  ClientIdentifierService,
} from '../../api';
import { AuthService } from '../../core/services/auth.service';
import { provideIonicTesting } from '../../testing/ionic-testing';
import { provideTranslateTesting } from '../../testing/i18n-testing';
import { FakeOverlayAdapter, provideFakeAdapters } from '../../testing/adapters';
import { createSpyObj, SpyObj } from '../../testing/mocks';
import { CLIENT_STATUS } from './client-servicing.model';

/**
 * The client servicing commands: transfers, staff assignment and the default savings account.
 *
 * These assert the **exact body** posted for each command, not merely that something was posted.
 * That is the whole point of the suite: every one of these commands rejects a parameter that
 * looks harmless and that the neighbouring commands require. `acceptTransfer` refuses `locale`,
 * `dateFormat` and `transferDate`; `proposeAndAcceptTransfer` refuses `transferDate` while
 * `proposeTransfer` demands it; `unassignStaff` demands the `staffId` it is removing. A spec
 * that only checked the command name would pass against a body the platform throws out.
 *
 * The contracts were probed against a running instance before this was written — see issues
 * #272 and #274.
 */
describe('ClientViewComponent — servicing commands', () => {
  let component: ClientViewComponent;
  let fixture: ComponentFixture<ClientViewComponent>;
  let clientServiceSpy: SpyObj<ClientService>;
  let overlay: FakeOverlayAdapter;

  const CLIENT_ID = 123;
  const OFFICER_NAME = 'Officer, Probe';

  /** The client as `GET /clients/{id}` actually returns it, including the undeclared fields. */
  function clientResponse(overrides: Record<string, unknown> = {}): any {
    return {
      id: CLIENT_ID,
      accountNo: 'CL00123',
      displayName: 'John Doe',
      officeId: 7,
      officeName: 'Head Office',
      status: { id: CLIENT_STATUS.ACTIVE, code: 'clientStatusType.active', value: 'Active' },
      ...overrides,
    };
  }

  /**
   * Reset first: a few of these tests build the component twice to compare two client states,
   * and a second `configureTestingModule` on an instantiated TestBed throws rather than
   * reconfiguring.
   */
  async function setUp(client: any = clientResponse()): Promise<void> {
    TestBed.resetTestingModule();

    const adapters = provideFakeAdapters();
    overlay = adapters.overlay;

    clientServiceSpy = createSpyObj([
      'getClientsClientId',
      'getClientsClientIdAccounts',
      'getClientsTemplate',
      'postClientsClientId',
    ]);
    clientServiceSpy.getClientsClientId.mockReturnValue(of(client) as any);
    clientServiceSpy.getClientsClientIdAccounts.mockReturnValue(
      of({ loanAccounts: [], savingsAccounts: [] }) as any,
    );
    clientServiceSpy.getClientsTemplate.mockReturnValue(of({ officeOptions: [] }) as any);
    clientServiceSpy.postClientsClientId.mockReturnValue(of({ clientId: CLIENT_ID }) as any);

    const notesServiceSpy = createSpyObj([
      'postResourceTypeResourceIdNotes',
      'getResourceTypeResourceIdNotes',
    ]);
    notesServiceSpy.getResourceTypeResourceIdNotes.mockReturnValue(of([]) as any);

    const addressServiceSpy = createSpyObj(['getClientClientidAddresses']);
    addressServiceSpy.getClientClientidAddresses.mockReturnValue(of([]) as any);
    const documentServiceSpy = createSpyObj(['getEntityTypeEntityIdDocuments']);
    documentServiceSpy.getEntityTypeEntityIdDocuments.mockReturnValue(of([]) as any);
    const familyMemberServiceSpy = createSpyObj(['getClientsClientIdFamilymembers']);
    familyMemberServiceSpy.getClientsClientIdFamilymembers.mockReturnValue(of([]) as any);
    const identifierServiceSpy = createSpyObj(['getClientsClientIdIdentifiers']);
    identifierServiceSpy.getClientsClientIdIdentifiers.mockReturnValue(of([]) as any);

    const authServiceSpy = Object.assign(createSpyObj<AuthService>(['hasPermission']), {
      currentUser: signal({
        username: 'mifos',
        base64EncodedAuthenticationKey: 'key',
        authenticated: true,
        officeId: 1,
        officeName: 'Head Office',
        userId: 1,
        permissions: ['ALL_FUNCTIONS'],
      }),
    });

    await TestBed.configureTestingModule({
      imports: [ClientViewComponent],
      providers: [
        provideIonicTesting(),
        // client-view still renders `| translate` directly, so the library has to be present
        // alongside the fake I18N adapter. See provideTranslateTesting().
        ...provideTranslateTesting(),
        provideNoopAnimations(),
        ...adapters.providers,
        { provide: ClientService, useValue: clientServiceSpy },
        { provide: NotesService, useValue: notesServiceSpy },
        { provide: ClientsAddressService, useValue: addressServiceSpy },
        { provide: DocumentsService, useValue: documentServiceSpy },
        { provide: ClientFamilyMemberService, useValue: familyMemberServiceSpy },
        { provide: ClientIdentifierService, useValue: identifierServiceSpy },
        { provide: AuthService, useValue: authServiceSpy },
        { provide: Router, useValue: createSpyObj(['navigate']) },
        {
          provide: ActivatedRoute,
          useValue: {
            paramMap: of({ get: (key: string) => (key === 'id' ? String(CLIENT_ID) : null) }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ClientViewComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  }

  /** The (clientId, body, command) triple of the most recent command post. */
  function lastCommand(): { clientId: number; body: any; command: string } {
    const args = clientServiceSpy.postClientsClientId.mock.lastCall!;
    return { clientId: args[0] as number, body: args[1] as any, command: args[2] as string };
  }

  describe('transfers', () => {
    it('proposes a transfer with the destination, the date and the format that parses it', async () => {
      await setUp();
      overlay.nextModalResult = {
        destinationOfficeId: 9,
        transferDate: '2026-08-08',
        note: 'moving branch',
      };

      await component.onProposeTransfer();

      const { clientId, body, command } = lastCommand();
      expect(clientId).toBe(CLIENT_ID);
      expect(command).toBe('proposeTransfer');
      expect(body).toEqual({
        destinationOfficeId: 9,
        transferDate: '08 August 2026',
        locale: 'en',
        dateFormat: 'dd MMMM yyyy',
        note: 'moving branch',
      });
    });

    it('omits the date from a one-step transfer, which the platform refuses outright', async () => {
      await setUp();
      overlay.nextModalResult = { destinationOfficeId: 9 };

      await component.onProposeAndAcceptTransfer();

      const { body, command } = lastCommand();
      expect(command).toBe('proposeAndAcceptTransfer');
      expect(body).toEqual({ destinationOfficeId: 9 });
      // Named individually: each of these produces its own "not supported" error.
      expect(body.transferDate).toBeUndefined();
      expect(body.locale).toBeUndefined();
      expect(body.dateFormat).toBeUndefined();
    });

    it('accepts a transfer with a note and nothing else', async () => {
      await setUp(clientResponse({ status: { id: CLIENT_STATUS.TRANSFER_IN_PROGRESS } }));
      overlay.nextModalResult = { note: 'welcome' };

      await component.onAcceptTransfer();

      const { body, command } = lastCommand();
      expect(command).toBe('acceptTransfer');
      expect(body).toEqual({ note: 'welcome' });
    });

    it('sends an empty body when the note was left blank', async () => {
      await setUp(clientResponse({ status: { id: CLIENT_STATUS.TRANSFER_IN_PROGRESS } }));
      overlay.nextModalResult = {};

      await component.onAcceptTransfer();

      expect(lastCommand().body).toEqual({});
    });

    it('rejects a transfer', async () => {
      await setUp(clientResponse({ status: { id: CLIENT_STATUS.TRANSFER_IN_PROGRESS } }));
      overlay.nextModalResult = { note: 'not our branch' };

      await component.onRejectTransfer();

      expect(lastCommand().command).toBe('rejectTransfer');
    });

    it('withdraws a transfer', async () => {
      await setUp(clientResponse({ status: { id: CLIENT_STATUS.TRANSFER_IN_PROGRESS } }));
      overlay.nextModalResult = {};

      await component.onWithdrawTransfer();

      expect(lastCommand().command).toBe('withdrawTransfer');
    });

    it('posts nothing when the dialog is dismissed', async () => {
      await setUp();
      overlay.nextModalResult = undefined;

      await component.onProposeTransfer();

      expect(clientServiceSpy.postClientsClientId).not.toHaveBeenCalled();
    });

    it('treats both pending states as awaiting an answer, so an on-hold client can be recovered', async () => {
      await setUp(clientResponse({ status: { id: CLIENT_STATUS.TRANSFER_ON_HOLD } }));
      expect(component.isTransferPending()).toBe(true);

      await setUp(clientResponse({ status: { id: CLIENT_STATUS.TRANSFER_IN_PROGRESS } }));
      expect(component.isTransferPending()).toBe(true);

      await setUp();
      expect(component.isTransferPending()).toBe(false);
    });
  });

  describe('staff and default savings account', () => {
    it('assigns a member of staff', async () => {
      await setUp();
      overlay.nextModalResult = { staffId: 4 };

      await component.onAssignStaff();

      const { body, command } = lastCommand();
      expect(command).toBe('assignStaff');
      expect(body).toEqual({ staffId: 4 });
    });

    it('echoes the current staff id back when unassigning, which the platform requires', async () => {
      await setUp(clientResponse({ staffId: 4, staffName: OFFICER_NAME }));
      overlay.nextModalResult = true;

      await component.onUnassignStaff();

      const { body, command } = lastCommand();
      expect(command).toBe('unassignStaff');
      expect(body).toEqual({ staffId: 4 });
    });

    it('does not offer to unassign when nobody is assigned', async () => {
      await setUp();
      expect(component.assignedStaffId()).toBeUndefined();

      await component.onUnassignStaff();

      expect(clientServiceSpy.postClientsClientId).not.toHaveBeenCalled();
    });

    it('reads the staff and savings fields the generated model does not declare', async () => {
      await setUp(clientResponse({ staffId: 4, staffName: OFFICER_NAME, savingsAccountId: 8 }));

      expect(component.assignedStaffId()).toBe(4);
      expect(component.assignedStaffName()).toBe(OFFICER_NAME);
      expect(component.defaultSavingsAccountId()).toBe(8);
    });

    it('sets the default savings account', async () => {
      await setUp();
      overlay.nextModalResult = { savingsAccountId: 8 };

      await component.onUpdateSavingsAccount();

      const { body, command } = lastCommand();
      expect(command).toBe('updateSavingsAccount');
      expect(body).toEqual({ savingsAccountId: 8 });
    });

    it('offers servicing actions only while the client is live', async () => {
      await setUp();
      expect(component.canServiceClient()).toBe(true);

      await setUp(clientResponse({ status: { id: CLIENT_STATUS.CLOSED } }));
      expect(component.canServiceClient()).toBe(false);
    });
  });

  /**
   * Issue #273. The menu identifiers and the platform command names diverge for exactly these
   * two, and the platform never reaches the payload: it answers
   * `400 "The query parameter command has an unsupported value of: undoReject"`.
   */
  describe('undoing a rejection or a withdrawal', () => {
    it('posts UndoRejection, not the menu identifier', async () => {
      await setUp(clientResponse({ status: { id: CLIENT_STATUS.REJECTED } }));
      overlay.nextModalResult = { actionDate: new Date(2026, 7, 8) };

      await component.onClientAction('undoReject');

      const { body, command } = lastCommand();
      expect(command).toBe('UndoRejection');
      expect(body.reopenedDate).toBe('08 August 2026');
    });

    it('posts UndoWithdrawal, not the menu identifier', async () => {
      await setUp(clientResponse({ status: { id: CLIENT_STATUS.WITHDRAWN } }));
      overlay.nextModalResult = { actionDate: new Date(2026, 7, 8) };

      await component.onClientAction('undoWithdraw');

      expect(lastCommand().command).toBe('UndoWithdrawal');
    });

    it('leaves the commands the platform already accepts untouched', async () => {
      await setUp(clientResponse({ status: { id: CLIENT_STATUS.PENDING } }));
      overlay.nextModalResult = { actionDate: new Date(2026, 7, 8) };

      await component.onClientAction('activate');

      expect(lastCommand().command).toBe('activate');
    });
  });
});
