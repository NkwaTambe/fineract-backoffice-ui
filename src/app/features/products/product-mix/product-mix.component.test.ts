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
import { ProductMixComponent } from './product-mix.component';
import { ProductMixService } from '../../../api';
import { ActivatedRoute, Router, convertToParamMap } from '@angular/router';
import { of } from 'rxjs';
import { provideTranslateTesting } from '../../../testing/i18n-testing';
import { provideNoopAnimations } from '@angular/platform-browser/animations';
import { DialogService } from '../../../core/services/dialog.service';

describe('ProductMixComponent', () => {
  let component: ProductMixComponent;
  let fixture: ComponentFixture<ProductMixComponent>;
  let serviceSpy: SpyObj<ProductMixService>;
  let routerSpy: SpyObj<Router>;
  let dialogService: SpyObj<DialogService>;

  beforeEach(async () => {
    serviceSpy = createSpyObj([
      'getLoanproductsProductIdProductmix',
      'postLoanproductsProductIdProductmix',
      'putLoanproductsProductIdProductmix',
      'deleteLoanproductsProductIdProductmix',
    ]);
    routerSpy = createSpyObj(['navigate']);
    dialogService = createSpyObj(['confirm']);
    dialogService.confirm.mockResolvedValue(true);
    serviceSpy.getLoanproductsProductIdProductmix.mockReturnValue(
      of({
        productOptions: [{ id: 2, name: 'Product B' }],
        restrictedProducts: [],
      }) as unknown as ReturnType<ProductMixService['getLoanproductsProductIdProductmix']>,
    );

    await TestBed.configureTestingModule({
      imports: [ProductMixComponent],
      providers: [
        ...provideTranslateTesting(),
        { provide: ProductMixService, useValue: serviceSpy },
        { provide: Router, useValue: routerSpy },
        { provide: DialogService, useValue: dialogService },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { paramMap: convertToParamMap({ productId: '1' }) } },
        },
        provideNoopAnimations(),
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ProductMixComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should load product mix options on init', () => {
    expect(component).toBeTruthy();
    expect(serviceSpy.getLoanproductsProductIdProductmix).toHaveBeenCalledWith(1);
    expect(component.productOptions()).toHaveLength(1);
    expect(component.hasMix()).toBe(false);
  });

  it('should post when no mix exists and navigate to the list', () => {
    serviceSpy.postLoanproductsProductIdProductmix.mockReturnValue(
      of({}) as unknown as ReturnType<ProductMixService['postLoanproductsProductIdProductmix']>,
    );
    component.restrictedProducts.set([2]);
    component.onSubmit();
    expect(serviceSpy.postLoanproductsProductIdProductmix).toHaveBeenCalledWith(1, {
      productId: 1,
      restrictedProducts: [2],
    });
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/products/loan']);
  });

  it('should put when a mix already exists', () => {
    component.hasMix.set(true);
    serviceSpy.putLoanproductsProductIdProductmix.mockReturnValue(
      of({}) as unknown as ReturnType<ProductMixService['putLoanproductsProductIdProductmix']>,
    );
    component.restrictedProducts.set([2]);
    component.onSubmit();
    expect(serviceSpy.putLoanproductsProductIdProductmix).toHaveBeenCalledWith(1, {
      productId: 1,
      restrictedProducts: [2],
    });
  });

  it('should delete after confirmation and navigate to the list', async () => {
    serviceSpy.deleteLoanproductsProductIdProductmix.mockReturnValue(
      of({}) as unknown as ReturnType<ProductMixService['deleteLoanproductsProductIdProductmix']>,
    );
    component.onDelete();
    await fixture.whenStable();
    expect(serviceSpy.deleteLoanproductsProductIdProductmix).toHaveBeenCalledWith(1);
    expect(routerSpy.navigate).toHaveBeenCalledWith(['/products/loan']);
  });

  it('should not clear the mix when cancelled', async () => {
    dialogService.confirm.mockResolvedValue(false);
    component.onDelete();
    await fixture.whenStable();
    expect(serviceSpy.deleteLoanproductsProductIdProductmix).not.toHaveBeenCalled();
  });
});
