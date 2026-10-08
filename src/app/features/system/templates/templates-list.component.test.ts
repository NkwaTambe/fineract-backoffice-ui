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
import { TemplatesListComponent } from './templates-list.component';
import { TemplatesService } from '../../../api';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from '../../../core/services/dialog.service';

describe('TemplatesListComponent', () => {
  let component: TemplatesListComponent;
  let fixture: ComponentFixture<TemplatesListComponent>;
  let serviceSpy: SpyObj<TemplatesService>;
  let routerSpy: SpyObj<Router>;
  let dialogService: SpyObj<DialogService>;

  const setup = async (): Promise<void> => {
    await TestBed.configureTestingModule({
      imports: [TemplatesListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: TemplatesService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DialogService, useValue: dialogService },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(TemplatesListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  };

  beforeEach(() => {
    serviceSpy = createSpyObj(['getTemplates', 'deleteTemplatesTemplateId']);
    routerSpy = createSpyObj(['navigate']);
    dialogService = createSpyObj(['confirm']);
    dialogService.confirm.mockResolvedValue(true);
    serviceSpy.getTemplates.mockReturnValue(
      of([{ id: 1, name: 'Loan Sanction Letter', entity: 1, type: 0 }]) as unknown as ReturnType<
        TemplatesService['getTemplates']
      >,
    );
  });

  it('should load templates on init', async () => {
    await setup();

    expect(component).toBeTruthy();
    expect(serviceSpy.getTemplates).toHaveBeenCalled();
    expect(component.templates()).toHaveLength(1);
  });

  it('resolves entity and type to the text the columns display, so search can match it', async () => {
    await setup();

    expect(component.rows()).toEqual([
      { id: 1, name: 'Loan Sanction Letter', entity: 'Loan', type: 'Document' },
    ]);
  });

  it('reports an error rather than an empty list when the load fails', async () => {
    serviceSpy.getTemplates.mockReturnValue(
      throwError(() => new Error('boom')) as unknown as ReturnType<
        TemplatesService['getTemplates']
      >,
    );
    await setup();

    expect(component.hasError()).toBe(true);
    expect(component.templates()).toHaveLength(0);
  });

  it('should navigate to edit with the template id', async () => {
    await setup();

    component.onEdit({ id: 3, name: 'X' });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/system/templates/edit', 3]);
  });

  it('should delete after confirmation and reload', async () => {
    await setup();
    serviceSpy.deleteTemplatesTemplateId.mockReturnValue(
      of({}) as unknown as ReturnType<TemplatesService['deleteTemplatesTemplateId']>,
    );

    await component.onDelete({ id: 5, name: 'Y' });

    expect(serviceSpy.deleteTemplatesTemplateId).toHaveBeenCalledWith(5);
    expect(serviceSpy.getTemplates).toHaveBeenCalledTimes(2);
  });

  it('should not delete when cancelled', async () => {
    await setup();
    dialogService.confirm.mockResolvedValue(false);

    await component.onDelete({ id: 5, name: 'Y' });

    expect(serviceSpy.deleteTemplatesTemplateId).not.toHaveBeenCalled();
  });
});
