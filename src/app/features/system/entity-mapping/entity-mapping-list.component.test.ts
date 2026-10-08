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
import { EntityMappingListComponent, readMappings } from './entity-mapping-list.component';
import { FineractEntityService } from '../../../api';
import { Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from '../../../core/services/dialog.service';

describe('EntityMappingListComponent', () => {
  let component: EntityMappingListComponent;
  let fixture: ComponentFixture<EntityMappingListComponent>;
  let serviceSpy: SpyObj<FineractEntityService>;
  let routerSpy: SpyObj<Router>;
  let dialogService: SpyObj<DialogService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj(['getEntitytoentitymapping', 'deleteEntitytoentitymappingMapId']);
    routerSpy = createSpyObj(['navigate']);
    dialogService = createSpyObj(['confirm']);
    dialogService.confirm.mockResolvedValue(true);
    serviceSpy.getEntitytoentitymapping.mockReturnValue(
      of(JSON.stringify([{ id: 1, fromId: 10, toId: 20 }])) as unknown as ReturnType<
        FineractEntityService['getEntitytoentitymapping']
      >,
    );

    await TestBed.configureTestingModule({
      imports: [EntityMappingListComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: FineractEntityService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DialogService, useValue: dialogService },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(EntityMappingListComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should parse and load mappings on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getEntitytoentitymapping).toHaveBeenCalled();
    expect(component.mappings()).toHaveLength(1);
    expect(component.mappings()[0].fromId).toBe(10);
  });

  /**
   * The live endpoint returns a JSON array while the generated client still types the response
   * as `string`. `JSON.parse` on the parsed array threw inside `next`, past the reach of the
   * `error` callback, and the screen rendered "No records found." over real data — issue #611.
   */
  describe('payload shapes (#611)', () => {
    it.each([
      ['the array the endpoint actually returns', [{ id: 1, fromId: 10, toId: 20 }]],
      [
        'the JSON string the generated type promises',
        JSON.stringify([{ id: 1, fromId: 10, toId: 20 }]),
      ],
      [
        'a paged envelope',
        { totalFilteredRecords: 1, pageItems: [{ id: 1, fromId: 10, toId: 20 }] },
      ],
    ])('loads rows from %s', (_label, payload) => {
      serviceSpy.getEntitytoentitymapping.mockReturnValue(
        of(payload) as unknown as ReturnType<FineractEntityService['getEntitytoentitymapping']>,
      );

      component.load();

      expect(component.mappings()).toHaveLength(1);
      expect(component.mappings()[0].fromId).toBe(10);
      expect(component.loadFailed()).toBe(false);
    });

    it.each([
      ['null', null],
      ['undefined', undefined],
      ['an empty string', ''],
    ])('treats %s as genuinely empty, not as a failure', (_label, payload) => {
      serviceSpy.getEntitytoentitymapping.mockReturnValue(
        of(payload) as unknown as ReturnType<FineractEntityService['getEntitytoentitymapping']>,
      );

      component.load();

      expect(component.mappings()).toEqual([]);
      expect(component.loadFailed()).toBe(false);
    });

    it('flags a failure when the payload is a shape it cannot read', () => {
      serviceSpy.getEntitytoentitymapping.mockReturnValue(
        of({ unexpected: true }) as unknown as ReturnType<
          FineractEntityService['getEntitytoentitymapping']
        >,
      );

      component.load();

      expect(component.loadFailed()).toBe(true);
      expect(component.mappings()).toEqual([]);
    });

    it('flags a failure when the request itself errors', () => {
      serviceSpy.getEntitytoentitymapping.mockReturnValue(
        throwError(() => new Error('boom')) as unknown as ReturnType<
          FineractEntityService['getEntitytoentitymapping']
        >,
      );

      component.load();

      expect(component.loadFailed()).toBe(true);
    });

    it('clears the failure once a later load succeeds', () => {
      serviceSpy.getEntitytoentitymapping.mockReturnValue(
        throwError(() => new Error('boom')) as unknown as ReturnType<
          FineractEntityService['getEntitytoentitymapping']
        >,
      );
      component.load();
      expect(component.loadFailed()).toBe(true);

      serviceSpy.getEntitytoentitymapping.mockReturnValue(
        of([{ id: 2, fromId: 1, toId: 2 }]) as unknown as ReturnType<
          FineractEntityService['getEntitytoentitymapping']
        >,
      );
      component.load();

      expect(component.loadFailed()).toBe(false);
      expect(component.mappings()).toHaveLength(1);
    });
  });

  describe('readMappings', () => {
    it('rejects the object form that used to reach JSON.parse', () => {
      expect(() => readMappings({ unexpected: true })).toThrow(TypeError);
    });

    it('does not swallow a genuinely malformed JSON string', () => {
      expect(() => readMappings('{not json')).toThrow();
    });
  });

  it('should navigate to edit with the mapping id', () => {
    component.onEdit({ id: 3 });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/system/entity-mapping/edit', 3]);
  });

  it('should delete after confirmation and reload', async () => {
    serviceSpy.deleteEntitytoentitymappingMapId.mockReturnValue(
      of('{}') as unknown as ReturnType<FineractEntityService['deleteEntitytoentitymappingMapId']>,
    );

    component.onDelete({ id: 5 });

    await fixture.whenStable();

    expect(serviceSpy.deleteEntitytoentitymappingMapId).toHaveBeenCalledWith(5);
    expect(serviceSpy.getEntitytoentitymapping).toHaveBeenCalledTimes(2);
  });

  it('should not delete when cancelled', async () => {
    dialogService.confirm.mockResolvedValue(false);
    component.onDelete({ id: 5 });
    await fixture.whenStable();
    expect(serviceSpy.deleteEntitytoentitymappingMapId).not.toHaveBeenCalled();
  });
});
