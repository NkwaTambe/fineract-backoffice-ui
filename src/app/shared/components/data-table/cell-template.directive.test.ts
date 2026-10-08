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

import { Component, TemplateRef, viewChild } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CellTemplateDirective } from './cell-template.directive';

@Component({
  template: `
    <ng-template appCellTemplate="testColumn">
      <span>Test Content</span>
    </ng-template>
  `,
  imports: [CellTemplateDirective],
  standalone: true,
})
class TestHostComponent {
  readonly cellTemplateDirective = viewChild.required(CellTemplateDirective);
}

describe('CellTemplateDirective', () => {
  let fixture: ComponentFixture<TestHostComponent>;
  let component: TestHostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TestHostComponent],
    }).compileComponents();

    fixture = TestBed.createComponent(TestHostComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create the directive and capture the template and columnName', () => {
    expect(component.cellTemplateDirective()).toBeTruthy();
    expect(component.cellTemplateDirective().columnName()).toBe('testColumn');
    expect(component.cellTemplateDirective().template).toBeInstanceOf(TemplateRef);
  });
});
