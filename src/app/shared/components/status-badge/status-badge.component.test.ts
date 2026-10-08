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
import { StatusBadgeComponent } from './status-badge.component';

const ACTIVE = 'Active';
const APPROVED = 'Approved';
const STATUS_ACTIVE = 'status-active';
const STATUS_CLOSED = 'status-closed';

describe('StatusBadgeComponent', () => {
  let component: StatusBadgeComponent;
  let fixture: ComponentFixture<StatusBadgeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [StatusBadgeComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(StatusBadgeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  describe('statusName', () => {
    it('should return UNKNOWN if status is undefined', () => {
      fixture.componentRef.setInput('status', undefined);
      expect(component.statusName()).toBe('UNKNOWN');
    });

    it('should return status if status is a string', () => {
      fixture.componentRef.setInput('status', ACTIVE);
      expect(component.statusName()).toBe(ACTIVE);
    });

    it('should return value from object if value is present', () => {
      fixture.componentRef.setInput('status', { value: APPROVED, code: 'approved' });
      expect(component.statusName()).toBe(APPROVED);
    });

    it('should return code from object if value is absent', () => {
      fixture.componentRef.setInput('status', { code: 'pending.approval' });
      expect(component.statusName()).toBe('pending.approval');
    });
  });

  describe('colorClass', () => {
    it('should return status-default for unknown status', () => {
      fixture.componentRef.setInput('status', undefined);
      expect(component.colorClass()).toBe('status-default');
    });

    it('reads a processing result as an outcome, not a lifecycle state', () => {
      fixture.componentRef.setInput('status', 'processed');
      expect(component.colorClass()).toBe(STATUS_ACTIVE);

      fixture.componentRef.setInput('status', 'success');
      expect(component.colorClass()).toBe(STATUS_ACTIVE);

      fixture.componentRef.setInput('status', 'failure');
      expect(component.colorClass()).toBe(STATUS_CLOSED);

      fixture.componentRef.setInput('status', 'unprocessed');
      expect(component.colorClass()).toBe('status-default');
    });

    it('should return status-active for active status', () => {
      fixture.componentRef.setInput('status', ACTIVE);
      expect(component.colorClass()).toBe(STATUS_ACTIVE);

      fixture.componentRef.setInput('status', { code: 'clientStatusType.active' });
      expect(component.colorClass()).toBe(STATUS_ACTIVE);

      fixture.componentRef.setInput('status', { value: APPROVED });
      expect(component.colorClass()).toBe(STATUS_ACTIVE);
    });

    it('should return status-pending for pending status', () => {
      fixture.componentRef.setInput('status', 'Pending');
      expect(component.colorClass()).toBe('status-pending');

      fixture.componentRef.setInput('status', { value: 'Submitted and pending approval' });
      expect(component.colorClass()).toBe('status-pending');
    });

    it('should return status-closed for closed/rejected/deleted status', () => {
      fixture.componentRef.setInput('status', 'Closed');
      expect(component.colorClass()).toBe(STATUS_CLOSED);

      fixture.componentRef.setInput('status', { value: 'Rejected' });
      expect(component.colorClass()).toBe(STATUS_CLOSED);

      fixture.componentRef.setInput('status', { code: 'deleted' });
      expect(component.colorClass()).toBe(STATUS_CLOSED);
    });

    it('should return status-default for unmapped status', () => {
      fixture.componentRef.setInput('status', 'SomeRandomStatus');
      expect(component.colorClass()).toBe('status-default');
    });
  });
});
