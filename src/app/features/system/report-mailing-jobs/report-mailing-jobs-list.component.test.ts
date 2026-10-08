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
import { ReportMailingJobsListComponent, readJobs } from './report-mailing-jobs-list.component';
import { ReportMailingJobsService } from '../../../api';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from '../../../core/services/dialog.service';

describe('ReportMailingJobsListComponent', () => {
  let component: ReportMailingJobsListComponent;
  let fixture: ComponentFixture<ReportMailingJobsListComponent>;
  let serviceSpy: SpyObj<ReportMailingJobsService>;
  let routerSpy: SpyObj<Router>;
  let dialogService: SpyObj<DialogService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getReportmailingjobs', 'deleteReportmailingjobsEntityId']);
    routerSpy = createSpyObj(['navigate']);
    dialogService = createSpyObj(['confirm']);
    dialogService.confirm.mockResolvedValue(true);
    serviceSpy.getReportmailingjobs.mockReturnValue(
      of([{ id: 1, name: 'Job', emailRecipients: 'a@b.c' }]) as unknown as ReturnType<
        ReportMailingJobsService['getReportmailingjobs']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [ReportMailingJobsListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: ReportMailingJobsService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DialogService, useValue: dialogService },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ReportMailingJobsListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load jobs on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getReportmailingjobs).toHaveBeenCalled();
    expect(component.jobs()).toHaveLength(1);
  });

  /**
   * The endpoint returns `{ totalFilteredRecords, pageItems }` while the generated client types
   * it as a bare array. Assigning the envelope into an array-typed signal made a downstream
   * computed throw `t is not iterable` — after a 2xx, so the `error` callback never ran and the
   * screen showed "No records found." See issue #611.
   */
  describe('payload shapes (#611)', () => {
    it('loads rows from the paged envelope the endpoint actually returns', () => {
      serviceSpy.getReportmailingjobs.mockReturnValue(
        of({
          totalFilteredRecords: 1,
          pageItems: [{ id: 7, name: 'Nightly', emailRecipients: 'ops@example.org' }],
        }) as unknown as ReturnType<ReportMailingJobsService['getReportmailingjobs']>,
      );

      component.load();

      expect(component.jobs()).toHaveLength(1);
      expect(component.jobs()[0].name).toBe('Nightly');
      expect(component.loadFailed()).toBe(false);
    });

    it('still loads rows from a bare array', () => {
      serviceSpy.getReportmailingjobs.mockReturnValue(
        of([{ id: 1, name: 'Job' }]) as unknown as ReturnType<
          ReportMailingJobsService['getReportmailingjobs']
        >,
      );

      component.load();

      expect(component.jobs()).toHaveLength(1);
      expect(component.loadFailed()).toBe(false);
    });

    it('treats an empty envelope as empty, not as a failure', () => {
      serviceSpy.getReportmailingjobs.mockReturnValue(
        of({ totalFilteredRecords: 0, pageItems: [] }) as unknown as ReturnType<
          ReportMailingJobsService['getReportmailingjobs']
        >,
      );

      component.load();

      expect(component.jobs()).toEqual([]);
      expect(component.loadFailed()).toBe(false);
    });

    it('flags a failure when the request errors', () => {
      serviceSpy.getReportmailingjobs.mockReturnValue(
        throwError(() => new Error('boom')) as unknown as ReturnType<
          ReportMailingJobsService['getReportmailingjobs']
        >,
      );

      component.load();

      expect(component.loadFailed()).toBe(true);
      expect(component.jobs()).toEqual([]);
    });
  });

  describe('readJobs', () => {
    it('reads pageItems out of the envelope', () => {
      expect(readJobs({ totalFilteredRecords: 2, pageItems: [{ id: 1 }, { id: 2 }] })).toHaveLength(
        2,
      );
    });

    it('throws on a shape it cannot read, so the caller can show a failure', () => {
      expect(() => readJobs({ unexpected: true })).toThrow(TypeError);
    });

    it('treats null and undefined as empty', () => {
      expect(readJobs(null)).toEqual([]);
      expect(readJobs(undefined)).toEqual([]);
    });
  });

  it('should navigate to edit with the job id', () => {
    component.onEdit({ id: 3, name: 'X' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/system/report-mailing-jobs/edit', 3]);
  });

  it('should delete after confirmation and reload', async () => {
    serviceSpy.deleteReportmailingjobsEntityId.mockReturnValue(
      of({}) as unknown as ReturnType<ReportMailingJobsService['deleteReportmailingjobsEntityId']>,
    );

    component.onDelete({ id: 5, name: 'Y' });

    await fixture.whenStable();

    expect(serviceSpy.deleteReportmailingjobsEntityId).toHaveBeenCalledWith(5);
    expect(serviceSpy.getReportmailingjobs).toHaveBeenCalledTimes(2);
  });

  it('should not delete when cancelled', async () => {
    dialogService.confirm.mockResolvedValue(false);
    component.onDelete({ id: 5, name: 'Y' });
    await fixture.whenStable();
    expect(serviceSpy.deleteReportmailingjobsEntityId).not.toHaveBeenCalled();
  });
});
