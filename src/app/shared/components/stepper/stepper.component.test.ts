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
import { StepperComponent } from './stepper.component';
import { provideFakeAdapters } from '../../../testing/adapters';

describe('StepperComponent', () => {
  let fixture: ComponentFixture<StepperComponent>;

  function render(labels: string[], currentIndex: number) {
    const adapters = provideFakeAdapters();
    labels.forEach((label) => adapters.i18n.catalogue.set(label, label));

    TestBed.configureTestingModule({
      imports: [StepperComponent],
      providers: [...adapters.providers],
    });

    fixture = TestBed.createComponent(StepperComponent);
    fixture.componentRef.setInput('labels', labels);
    fixture.componentRef.setInput('currentIndex', currentIndex);
    fixture.detectChanges();
  }

  it('renders one item per label', () => {
    render(['One', 'Two', 'Three'], 0);
    expect(fixture.nativeElement.querySelectorAll('.step')).toHaveLength(3);
  });

  it('marks steps before the current index as done, and the current one as active', () => {
    render(['One', 'Two', 'Three'], 1);
    const steps: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.step');

    expect(steps[0].classList.contains('step-done')).toBe(true);
    expect(steps[0].classList.contains('step-active')).toBe(false);

    expect(steps[1].classList.contains('step-active')).toBe(true);
    expect(steps[1].classList.contains('step-done')).toBe(false);

    expect(steps[2].classList.contains('step-done')).toBe(false);
    expect(steps[2].classList.contains('step-active')).toBe(false);
  });

  it('shows a checkmark for a done step and the 1-based number otherwise', () => {
    render(['One', 'Two'], 1);
    const steps: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.step');

    expect(steps[0].querySelector('ion-icon')).not.toBeNull();
    expect(steps[1].querySelector('ion-icon')).toBeNull();
    expect(steps[1].querySelector('.step-marker')?.textContent?.trim()).toBe('2');
  });

  it('does not draw a connector after the last step', () => {
    render(['One', 'Two'], 0);
    const steps: NodeListOf<HTMLElement> = fixture.nativeElement.querySelectorAll('.step');

    expect(steps[0].querySelector('.step-connector')).not.toBeNull();
    expect(steps[1].querySelector('.step-connector')).toBeNull();
  });
});
