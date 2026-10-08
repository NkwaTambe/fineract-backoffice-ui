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
import { provideNoopAnimations } from '@angular/platform-browser/animations';

import { LoanApprovedAmountDialogComponent } from './loan-approved-amount-dialog.component';
import { LoanAvailableDisbursementAmountDialogComponent } from './loan-available-disbursement-amount-dialog.component';
import { provideFakeAdapters, FakeOverlayAdapter } from '../../testing/adapters';

describe('LoanApprovedAmountDialogComponent', () => {
  let fixture: ComponentFixture<LoanApprovedAmountDialogComponent>;
  let component: LoanApprovedAmountDialogComponent;
  let overlay: FakeOverlayAdapter;

  async function setup(currentApprovedAmount?: number): Promise<void> {
    const adapters = provideFakeAdapters();
    overlay = adapters.overlay;

    await TestBed.configureTestingModule({
      imports: [LoanApprovedAmountDialogComponent],
      providers: [provideNoopAnimations(), ...adapters.providers],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanApprovedAmountDialogComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('data', { currentApprovedAmount });
    fixture.detectChanges();
    await fixture.whenStable();
  }

  it('shows the current approved amount for context, when one was given', async () => {
    await setup(1000);
    expect(fixture.nativeElement.textContent).toContain('1000');
  });

  it('says nothing about a current amount when none was given', async () => {
    await setup(undefined);
    expect(fixture.nativeElement.textContent).not.toContain('LOANS.CURRENT_APPROVED_AMOUNT');
  });

  it('sends the new amount exactly, with no other fields', async () => {
    await setup(1000);
    component.amount.set(750);

    component.onConfirm();

    // Locale and dateFormat are deliberately absent — verified against a live Fineract that
    // the endpoint accepts a bare amount, and the app's own convention elsewhere is to add
    // `locale` only, which the caller does at the service-call boundary rather than here.
    expect(overlay.dismissals).toEqual([{ amount: 750 }]);
  });

  it('will not submit an empty amount', async () => {
    await setup(1000);
    component.amount.set(null);

    expect(component.isValid()).toBe(false);
    component.onConfirm();
    expect(overlay.dismissals).toEqual([]);
  });

  it('will not submit a zero or negative amount', async () => {
    // The platform's own rule ("amount must be greater than 0", verified live) — not
    // duplicated here as validation, just not worth a round trip that can only fail.
    await setup(1000);
    component.amount.set(0);
    expect(component.isValid()).toBe(false);

    component.amount.set(-50);
    expect(component.isValid()).toBe(false);
  });

  it('sends nothing when cancelled', async () => {
    await setup(1000);
    component.onCancel();
    expect(overlay.dismissals).toEqual([undefined]);
  });
});

describe('LoanAvailableDisbursementAmountDialogComponent', () => {
  let fixture: ComponentFixture<LoanAvailableDisbursementAmountDialogComponent>;
  let component: LoanAvailableDisbursementAmountDialogComponent;
  let overlay: FakeOverlayAdapter;

  beforeEach(async () => {
    const adapters = provideFakeAdapters();
    overlay = adapters.overlay;

    await TestBed.configureTestingModule({
      imports: [LoanAvailableDisbursementAmountDialogComponent],
      providers: [provideNoopAnimations(), ...adapters.providers],
    }).compileComponents();

    fixture = TestBed.createComponent(LoanAvailableDisbursementAmountDialogComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('allows a zero amount', () => {
    // Unlike the approved amount, dropping the available disbursement amount to zero is a real,
    // platform-accepted case (closing off the undrawn balance of a facility) — verified live
    // against an active, partially-disbursed single-tranche loan.
    component.amount.set(0);
    expect(component.isValid()).toBe(true);

    component.onConfirm();
    expect(overlay.dismissals).toEqual([{ amount: 0 }]);
  });

  it('sends the new amount', () => {
    component.amount.set(200);
    component.onConfirm();
    expect(overlay.dismissals).toEqual([{ amount: 200 }]);
  });

  it('will not submit an empty or negative amount', () => {
    component.amount.set(null);
    expect(component.isValid()).toBe(false);
    component.onConfirm();
    expect(overlay.dismissals).toEqual([]);

    component.amount.set(-1);
    expect(component.isValid()).toBe(false);
  });

  it('sends nothing when cancelled', () => {
    component.onCancel();
    expect(overlay.dismissals).toEqual([undefined]);
  });
});
