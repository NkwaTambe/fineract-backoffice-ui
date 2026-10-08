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

import { ActivatedRouteSnapshot } from '@angular/router';

/** One link in the trail: `labelKey` is a translation key, `url` where it navigates. */
export interface Breadcrumb {
  labelKey: string;
  url: string;
}

/**
 * Builds the breadcrumb trail for the current route tree from each level's `title` —
 * the same translation-key route data `TranslatedTitleStrategy` already sets on nearly every
 * route for the browser tab title, reused here rather than duplicated as separate route data.
 *
 * A route config is commonly split into an outer segment (`path: 'clients'`, titled) wrapping
 * an inner empty-path child (`path: ''`, titled identically) that lazy-loads the feature — both
 * would otherwise contribute the same crumb back to back, so adjacent duplicates collapse into
 * one.
 */
export function buildBreadcrumbs(root: ActivatedRouteSnapshot): Breadcrumb[] {
  const crumbs: Breadcrumb[] = [];
  let route: ActivatedRouteSnapshot | null = root;
  let url = '';

  while (route) {
    const segment = route.url.map((s) => s.path).join('/');
    if (segment) url += `/${segment}`;

    const title = route.routeConfig?.title;
    if (typeof title === 'string' && crumbs.at(-1)?.labelKey !== title) {
      crumbs.push({ labelKey: title, url });
    }
    route = route.firstChild;
  }

  return crumbs;
}
