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

/**
 * Invariants for the app-owned UI primitives (ADR 0005):
 *
 *   1. Every `<app-button>` declares `type`, rather than inheriting the vendor's submit default.
 *   2. Every `<app-button>` can be named by a screen reader — projected text, or `label`.
 *      `scripts/check-a11y-names.mjs` covers the icon-only case; this covers the rest.
 *
 * Checked statically because `type` is a required signal input, and a required input is only
 * enforced when the component renders. Most list screens have no spec that renders them, so a
 * missing `type` would reach a user as NG0950 rather than failing CI.
 */

import { readFileSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';

const SRC = 'src';
const TAG = 'app-button';
const TYPE_ATTRIBUTE = /\s\[?type\]?="/;
const LABEL_ATTRIBUTE = /\s\[?label\]?="/;
const COMMENT_OPEN = '<!--';
const COMMENT_CLOSE = '-->';
/** Angular control flow is structure, not content a name could be read from. */
const CONTROL_FLOW = /@(?:if|else|for|empty|switch|case|default)\b[^{]*\{|\}/y;
const WHITESPACE = /\s+/y;

function walk(dir) {
  const out = [];
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    if (statSync(path).isDirectory()) {
      if (entry === 'api' || entry === 'node_modules') continue;
      out.push(...walk(path));
    } else if (path.endsWith('.ts') || path.endsWith('.html')) {
      out.push(path);
    }
  }
  return out;
}

/** Index of the `>` closing the tag that starts at `from`, skipping quoted binding values. */
function endOfOpeningTag(source, from) {
  let quote = null;
  for (let i = from; i < source.length; i++) {
    const char = source[i];
    if (quote) {
      if (char === quote) quote = null;
    } else if (char === '"' || char === "'") {
      quote = char;
    } else if (char === '>') {
      return i;
    }
  }
  return -1;
}

/** Index just past `pattern` when it matches at `index`, otherwise -1. */
function skip(pattern, source, index) {
  pattern.lastIndex = index;
  return pattern.test(source) ? pattern.lastIndex : -1;
}

/** True when nothing is projected but comments, control flow and whitespace. */
function isEmpty(content) {
  let i = 0;
  while (i < content.length) {
    if (content.startsWith(COMMENT_OPEN, i)) {
      const end = content.indexOf(COMMENT_CLOSE, i + COMMENT_OPEN.length);
      i = end === -1 ? content.length : end + COMMENT_CLOSE.length;
      continue;
    }
    const pastControlFlow = skip(CONTROL_FLOW, content, i);
    const next = pastControlFlow === -1 ? skip(WHITESPACE, content, i) : pastControlFlow;
    if (next === -1) return false;
    i = next;
  }
  return true;
}

/** Every `<app-button>` in `source`, with its opening tag and projected content. */
function buttons(source) {
  const found = [];
  for (const match of source.matchAll(new RegExp(`<${TAG}(?=[\\s/>])`, 'g'))) {
    const tagEnd = endOfOpeningTag(source, match.index);
    if (tagEnd === -1) continue;
    const openTag = source.slice(match.index, tagEnd + 1);
    if (openTag.endsWith('/>')) {
      found.push({ openTag, content: '', index: match.index });
      continue;
    }
    const close = source.indexOf(`</${TAG}>`, tagEnd);
    if (close === -1) continue;
    found.push({ openTag, content: source.slice(tagEnd + 1, close), index: match.index });
  }
  return found;
}

const missingType = [];
const unnamed = [];

for (const file of walk(SRC)) {
  const source = readFileSync(file, 'utf8');
  for (const { openTag, content, index } of buttons(source)) {
    const at = { file: relative('.', file), line: source.slice(0, index).split('\n').length };
    if (!TYPE_ATTRIBUTE.test(openTag)) missingType.push(at);
    if (isEmpty(content) && !LABEL_ATTRIBUTE.test(openTag)) unnamed.push(at);
  }
}

let failed = false;

if (missingType.length > 0) {
  failed = true;
  console.error('<app-button> without `type`. A required input throws NG0950 when the screen');
  console.error('renders, which for most list screens means in front of a user, not in CI:\n');
  for (const { file, line } of missingType) console.error(`  ${file}:${line}`);
  console.error('\nAdd type="button" for an ordinary action, or type="submit" to submit a form.');
}

if (unnamed.length > 0) {
  failed = true;
  console.error('\n<app-button> with nothing to announce — no projected text and no [label]:\n');
  for (const { file, line } of unnamed) console.error(`  ${file}:${line}`);
  console.error('\nAdd [label], bound to the translation key that names the action.');
}

if (failed) process.exit(1);
console.log('Every <app-button> declares its type and can be named.');
