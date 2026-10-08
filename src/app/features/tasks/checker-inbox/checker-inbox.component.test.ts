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
import { of, throwError } from 'rxjs';
import { MakerCheckerOr4EyeFunctionalityService } from '../../../api';
import { provideFakeAdapters } from '../../../testing/adapters';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { createSpyObj, SpyObj } from '../../../testing/mocks';
import { CheckerInboxComponent } from './checker-inbox.component';

describe('CheckerInboxComponent', () => {
  let component: CheckerInboxComponent;
  let fixture: ComponentFixture<CheckerInboxComponent>;
  let serviceSpy: SpyObj<MakerCheckerOr4EyeFunctionalityService>;
  let adapters: ReturnType<typeof provideFakeAdapters>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getMakercheckers',
      'postMakercheckersAuditId',
      'deleteMakercheckersAuditId',
    ]);
    serviceSpy.getMakercheckers.mockReturnValue(
      of([]) as unknown as ReturnType<MakerCheckerOr4EyeFunctionalityService['getMakercheckers']>,
    );
    serviceSpy.postMakercheckersAuditId.mockReturnValue(
      of({}) as unknown as ReturnType<
        MakerCheckerOr4EyeFunctionalityService['postMakercheckersAuditId']
      >,
    );
    adapters = provideFakeAdapters();

    await TestBed.configureTestingModule({
      imports: [CheckerInboxComponent],
      providers: [
        ...provideTranslateTesting(),
        ...adapters.providers,
        { provide: MakerCheckerOr4EyeFunctionalityService, useValue: serviceSpy },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(CheckerInboxComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('rejects through the reject command without deleting the audit entry', async () => {
    adapters.overlay.nextModalResult = true;

    await component.onReject({ id: 7 });

    expect(serviceSpy.postMakercheckersAuditId).toHaveBeenCalledWith(7, 'reject');
    expect(serviceSpy.deleteMakercheckersAuditId).not.toHaveBeenCalled();
    expect(serviceSpy.getMakercheckers).toHaveBeenCalledTimes(2);
    expect(adapters.overlay.lastToast).toEqual(
      expect.objectContaining({
        message: 'CHECKER_INBOX.REJECT_SUCCESS',
        cssClass: 'success-toast',
      }),
    );
  });

  it('uses the standard destructive confirmation dialog', async () => {
    adapters.overlay.nextModalResult = false;

    await component.onReject({ id: 7 });

    expect(adapters.overlay.lastModal?.inputs?.['data']).toEqual(
      expect.objectContaining({
        title: 'CHECKER_INBOX.REJECT_TITLE',
        message: 'CHECKER_INBOX.CONFIRM_REJECT',
        destructive: true,
      }),
    );
  });

  it('does not call either endpoint when rejection is cancelled', async () => {
    adapters.overlay.nextModalResult = false;

    await component.onReject({ id: 7 });

    expect(serviceSpy.postMakercheckersAuditId).not.toHaveBeenCalled();
    expect(serviceSpy.deleteMakercheckersAuditId).not.toHaveBeenCalled();
  });

  it('reports a failed rejection without refreshing the inbox', async () => {
    adapters.overlay.nextModalResult = true;
    serviceSpy.postMakercheckersAuditId.mockReturnValue(
      throwError(() => new Error('request failed')) as ReturnType<
        MakerCheckerOr4EyeFunctionalityService['postMakercheckersAuditId']
      >,
    );

    await component.onReject({ id: 7 });

    expect(serviceSpy.getMakercheckers).toHaveBeenCalledTimes(1);
    expect(adapters.overlay.lastToast).toEqual(
      expect.objectContaining({
        message: 'CHECKER_INBOX.REJECT_ERROR',
        cssClass: 'error-toast',
      }),
    );
  });
});
