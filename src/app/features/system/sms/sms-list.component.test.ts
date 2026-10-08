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

import { createSpyObj, SpyObj } from '../../../testing/mocks';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SmsListComponent } from './sms-list.component';
import { SMSService } from '../../../api';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from '../../../core/services/dialog.service';

describe('SmsListComponent', () => {
  let component: SmsListComponent;
  let fixture: ComponentFixture<SmsListComponent>;
  let serviceSpy: SpyObj<SMSService>;
  let routerSpy: SpyObj<Router>;
  let dialogService: SpyObj<DialogService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getSms', 'deleteSmsResourceId']);
    routerSpy = createSpyObj(['navigate']);
    dialogService = createSpyObj(['confirm']);
    dialogService.confirm.mockResolvedValue(true);
    serviceSpy.getSms.mockReturnValue(
      of([{ id: 1, message: 'Hi', mobileNo: '123' }]) as unknown as ReturnType<
        SMSService['getSms']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [SmsListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: SMSService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DialogService, useValue: dialogService },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(SmsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load messages on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getSms).toHaveBeenCalled();
    expect(component.messages()).toHaveLength(1);
  });

  it('should navigate to edit with the message id', () => {
    component.onEdit({ id: 3 });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/system/sms/edit', 3]);
  });

  it('should delete after confirmation and reload', async () => {
    serviceSpy.deleteSmsResourceId.mockReturnValue(
      of({}) as unknown as ReturnType<SMSService['deleteSmsResourceId']>,
    );

    component.onDelete({ id: 5 });

    await fixture.whenStable();

    expect(serviceSpy.deleteSmsResourceId).toHaveBeenCalledWith(5);
    expect(serviceSpy.getSms).toHaveBeenCalledTimes(2);
  });

  it('should not delete when cancelled', async () => {
    dialogService.confirm.mockResolvedValue(false);
    component.onDelete({ id: 5 });
    await fixture.whenStable();
    expect(serviceSpy.deleteSmsResourceId).not.toHaveBeenCalled();
  });
});
