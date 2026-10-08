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
import { SearchFilterComponent } from './search-filter.component';
import { provideNoopAnimations } from '@angular/platform-browser/animations';

describe('SearchFilterComponent', () => {
  let component: SearchFilterComponent;
  let fixture: ComponentFixture<SearchFilterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SearchFilterComponent],
      providers: [provideNoopAnimations()],
    }).compileComponents();

    fixture = TestBed.createComponent(SearchFilterComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  afterEach(() => vi.useRealTimers());

  it('should emit searchChange with debounced value', () => {
    vi.useFakeTimers();
    vi.spyOn(component.searchChange, 'emit');

    const inputElement = fixture.nativeElement.querySelector('input');

    // Simulate user typing
    inputElement.value = 'test';
    inputElement.dispatchEvent(new Event('input'));

    // Shouldn't emit immediately due to debounce
    expect(component.searchChange.emit).not.toHaveBeenCalled();

    // Wait for debounceTime (400ms)
    vi.advanceTimersByTime(400);

    expect(component.searchChange.emit).toHaveBeenCalledWith('test');
  });

  it('should trim the input value before emitting', () => {
    vi.useFakeTimers();
    vi.spyOn(component.searchChange, 'emit');

    const inputElement = fixture.nativeElement.querySelector('input');

    // Simulate user typing with spaces
    inputElement.value = '  test value  ';
    inputElement.dispatchEvent(new Event('input'));

    // Wait for debounceTime (400ms)
    vi.advanceTimersByTime(400);

    expect(component.searchChange.emit).toHaveBeenCalledWith('test value');
  });

  it('should not emit if the trimmed value is identical to the previous one', () => {
    vi.useFakeTimers();
    vi.spyOn(component.searchChange, 'emit');

    const inputElement = fixture.nativeElement.querySelector('input');

    // First emission
    inputElement.value = 'test';
    inputElement.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(400);
    expect(component.searchChange.emit).toHaveBeenCalledTimes(1);

    // Second emission with same value
    inputElement.value = 'test  ';
    inputElement.dispatchEvent(new Event('input'));
    vi.advanceTimersByTime(400);

    // Should still be called only once
    expect(component.searchChange.emit).toHaveBeenCalledTimes(1);
  });
});
