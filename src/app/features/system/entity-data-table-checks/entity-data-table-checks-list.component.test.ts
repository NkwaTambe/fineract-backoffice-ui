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
import { EntityDataTableChecksListComponent } from './entity-data-table-checks-list.component';
import { EntityDataTableService } from '../../../api';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from '../../../core/services/dialog.service';

describe('EntityDataTableChecksListComponent', () => {
  let component: EntityDataTableChecksListComponent;
  let fixture: ComponentFixture<EntityDataTableChecksListComponent>;
  let serviceSpy: SpyObj<EntityDataTableService>;
  let routerSpy: SpyObj<Router>;
  let dialogService: SpyObj<DialogService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getEntityDatatableChecks',
      'deleteEntityDatatableChecksEntityDatatableCheckId',
    ]);
    routerSpy = createSpyObj(['navigate']);
    dialogService = createSpyObj(['confirm']);
    dialogService.confirm.mockResolvedValue(true);
    serviceSpy.getEntityDatatableChecks.mockReturnValue(
      of({
        pageItems: [{ id: 1, entity: 'm_client', datatableName: 'dt' }],
      }) as unknown as ReturnType<EntityDataTableService['getEntityDatatableChecks']>,
    );

    await TestBed.configureTestingModule({
      imports: [EntityDataTableChecksListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: EntityDataTableService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DialogService, useValue: dialogService },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityDataTableChecksListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load checks on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getEntityDatatableChecks).toHaveBeenCalled();
    expect(component.checks()).toHaveLength(1);
  });

  it('should navigate to create', () => {
    component.onCreate();
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/system/entity-data-table-checks/create']);
  });

  it('should delete after confirmation and reload', async () => {
    serviceSpy.deleteEntityDatatableChecksEntityDatatableCheckId.mockReturnValue(
      of({}) as unknown as ReturnType<
        EntityDataTableService['deleteEntityDatatableChecksEntityDatatableCheckId']
      >,
    );

    component.onDelete({ id: 5 });

    await fixture.whenStable();

    expect(serviceSpy.deleteEntityDatatableChecksEntityDatatableCheckId).toHaveBeenCalledWith(5);
    expect(serviceSpy.getEntityDatatableChecks).toHaveBeenCalledTimes(2);
  });

  it('should not delete when cancelled', async () => {
    dialogService.confirm.mockResolvedValue(false);
    component.onDelete({ id: 5 });
    await fixture.whenStable();
    expect(serviceSpy.deleteEntityDatatableChecksEntityDatatableCheckId).not.toHaveBeenCalled();
  });
});
