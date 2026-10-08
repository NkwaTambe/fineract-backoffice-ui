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

import { createSpyObj, SpyObj } from '../../testing/mocks';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { of } from 'rxjs';

import { GroupActionDialogComponent, GroupActionDialogData } from './group-action-dialog.component';
import { BusinessDateManagementService, GroupsService } from '../../api';
import { provideFakeAdapters } from '../../testing/adapters';
import { toIsoDate } from '../../core/utils/date-formatter';

const ACTIVATE: GroupActionDialogData['title'] = 'GROUPS.ACTIVATE';

/**
 * The dialog's date, and specifically the floor under it.
 *
 * The floor is what keeps the browser's clock out of a command the platform validates against
 * a date it stamped itself, in the tenant's timezone. `group-membership.spec.ts` exercises the
 * same thing end to end, but only reproduces the disagreement while the two zones are on
 * different days — for a UTC runner against the stock `Asia/Kolkata` tenant, a five-and-a-half
 * hour window each evening. These cases hold whatever time it is.
 */
describe('GroupActionDialogComponent', () => {
  let fixture: ComponentFixture<GroupActionDialogComponent>;
  let component: GroupActionDialogComponent;
  let businessDateService: SpyObj<BusinessDateManagementService>;

  /** A date relative to the browser's today, as the ISO string the dialog compares. */
  function offsetFromToday(days: number): string {
    const date = new Date();
    date.setDate(date.getDate() + days);
    return toIsoDate(date);
  }

  /** The same date as the `[year, month, day]` the business-date endpoint answers with. */
  function fineractDate(iso: string): number[] {
    return iso.split('-').map(Number);
  }

  async function setup(data: GroupActionDialogData, businessDate?: number[]): Promise<void> {
    businessDateService = createSpyObj(['getBusinessdate']);
    businessDateService.getBusinessdate.mockReturnValue(
      of(businessDate ? [{ type: 'BUSINESS_DATE', date: businessDate }] : []) as never,
    );

    const groupsService = createSpyObj(['getGroupsTemplate']);
    groupsService.getGroupsTemplate.mockReturnValue(of({ closureReasons: [] }) as never);

    await TestBed.configureTestingModule({
      imports: [GroupActionDialogComponent],
      providers: [
        provideNoopAnimations(),
        ...provideFakeAdapters().providers,
        { provide: BusinessDateManagementService, useValue: businessDateService },
        { provide: GroupsService, useValue: groupsService },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(GroupActionDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', data);
    fixture.detectChanges();
  }

  it('defaults to today when the platform has committed to nothing earlier', async () => {
    await setup({ title: ACTIVATE, command: 'activate' });

    expect(component.actionDate()).toBe(toIsoDate(new Date()));
    expect(component.minDate()).toBeUndefined();
  });

  it('moves the default up to a floor that is later than the browser thinks today is', async () => {
    // The shape of the CI failure: Fineract stamped the group's submitted-on date in a tenant
    // timezone already on tomorrow, so activating "today" is activating before submission.
    const tomorrow = offsetFromToday(1);
    await setup({ title: ACTIVATE, command: 'activate', minDate: tomorrow });

    expect(component.actionDate()).toBe(tomorrow);
    expect(component.minDate()).toBe(tomorrow);
  });

  it('leaves the default at today when the floor is already behind it', async () => {
    // A group submitted last week: activation belongs today, not on the day it was recorded.
    const lastWeek = offsetFromToday(-7);
    await setup({ title: ACTIVATE, command: 'activate', minDate: lastWeek });

    expect(component.actionDate()).toBe(toIsoDate(new Date()));
    // Still floored, so the picker cannot offer a date the command would refuse.
    expect(component.minDate()).toBe(lastWeek);
  });

  it('caps at the business date and defaults there', async () => {
    await setup({ title: ACTIVATE, command: 'activate' }, [2026, 3, 4]);

    expect(component.actionDate()).toBe('2026-03-04');
    expect(component.maxDate()).toBe('2026-03-04');
  });

  it('drops a business-date cap that falls below the floor rather than contradicting it', async () => {
    // Both constraints cannot hold. The floor is the one the command itself validates, so the
    // picker keeps it and lets the platform speak for the business date on submit — a range
    // with max < min is one no date satisfies.
    const tomorrow = offsetFromToday(1);
    await setup(
      { title: ACTIVATE, command: 'activate', minDate: tomorrow },
      fineractDate(offsetFromToday(-30)),
    );

    expect(component.actionDate()).toBe(tomorrow);
    expect(component.minDate()).toBe(tomorrow);
    expect(component.maxDate()).toBeUndefined();
  });
});
