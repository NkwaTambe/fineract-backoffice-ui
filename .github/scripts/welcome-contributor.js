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
 * Greets a first-time contributor on the pull request they just opened, with the things a
 * maintainer would otherwise type out by hand: where the community talks, the code of
 * conduct everyone here is held to, and what actually has to be true before their change can
 * be merged.
 *
 * ## Who gets this
 *
 * `author_association === 'FIRST_TIME_CONTRIBUTOR' | 'FIRST_TIMER'` — GitHub's own judgement,
 * already in the event payload, so this costs no API call and cannot go stale. It means
 * "has not previously committed to this repository", so somebody whose earlier pull request
 * is still open counts as a first-timer again. That is a deliberate trade: greeting someone
 * twice is a small cost, and the alternative — a search query per opened pull request — adds
 * a rate-limited call and an index-lag failure mode to buy very little.
 *
 * Bots are skipped. Maintainers, members and past contributors are skipped.
 *
 * ## Why the comment is deliberately not a wall of rules
 *
 * The merge requirements are already in CONTRIBUTING.md and restated in the pull request
 * template, and they still get missed — so repeating all of them here would be repeating a
 * thing that demonstrably does not work. What this lists is the short set that most often
 * blocks a first pull request, each linked to the page that explains it. The signing check
 * comments separately and specifically when it fails, which is the moment that advice is
 * actually read.
 *
 * ## Safety
 *
 * Runs on `pull_request_target` so it holds a token that can comment on fork pull requests.
 * It never checks out or executes the pull request's code; the only field taken from the
 * event is the author's login, which is defused before it reaches the body so a crafted
 * username cannot turn the greeting into a mention of somebody else.
 */

const MARKER = '<!-- welcome-contributor -->';

const CODE_OF_CONDUCT = 'https://www.apache.org/foundation/policies/conduct';
const MAILING_LIST = 'https://lists.apache.org/list.html?dev@fineract.apache.org';
const MATRIX_HOME = 'https://matrix.to/#/%23apache-fineract-home:matrix.org';
const MATRIX_DEV = 'https://matrix.to/#/%23apache-fineract-dev:matrix.org';
const DOCS = 'https://fineract.apache.org/docs/current/';
const REPO = 'https://github.com/apache/fineract-backoffice-ui/blob/main';

const WELCOMED_ASSOCIATIONS = new Set(['FIRST_TIME_CONTRIBUTOR', 'FIRST_TIMER']);

/**
 * A login is `[A-Za-z0-9-]` so it cannot itself contain an `@` or `#`, but the greeting is
 * assembled from event data and this keeps that guarantee local rather than assumed.
 */
function defuseReferences(text) {
  return String(text)
    .replace(/@(?=[A-Za-z0-9])/g, '@​')
    .replace(/#(?=\d)/g, '#​');
}

function buildBody(login) {
  const who = login ? ` @${login}` : '';
  return [
    MARKER,
    '',
    `## Welcome, and thank you${who} 👋`,
    '',
    'This looks like your first pull request to the Fineract back-office UI. A maintainer will',
    'review it — in the meantime, here is what is worth knowing.',
    '',
    '### The community',
    '',
    `- **Code of conduct** — everyone taking part here, including in review, is held to the [ASF Code of Conduct](${CODE_OF_CONDUCT}). Please give it a read.`,
    `- **Mailing list** — [dev@fineract.apache.org](${MAILING_LIST}) is where design questions and anything bigger than a single change get discussed. Subscribe by emailing \`dev-subscribe@fineract.apache.org\`. In an Apache project the mailing list is the project's record: **if a decision was not made on the list, it did not happen**, so it is worth being on it.`,
    `- **Matrix** — [#apache-fineract-home](${MATRIX_HOME}) for general chat, [#apache-fineract-dev](${MATRIX_DEV}) for development. Good for a quick question; use the list for anything that should be findable later.`,
    `- **Docs** — [fineract.apache.org/docs/current](${DOCS}).`,
    '',
    '### What has to be true before this can merge',
    '',
    `- **Your commits must be signed _and_ show as Verified on GitHub.** This is the one that catches people out most often, and "signed" is not sufficient on its own — GitHub also has to be able to tie the signature to your account, which means \`git config user.email\` must be an address verified on your GitHub profile. [Setup instructions](${REPO}/CONTRIBUTING.md#commit-signing). If this is wrong, a check will comment here telling you exactly which part.`,
    `- **CI has to be green.** Every check and how to reproduce it locally is in [DOCS/CI_CHECKS.md](${REPO}/DOCS/CI_CHECKS.md). Before pushing, \`npm run lint\`, \`npm run format:check\`, \`npm run test:unit\` and \`npm run build\` cover most of it.`,
    `- **New tests go in Vitest** (\`*.test.ts\`), not Karma — the Karma suite is shrinking and CI fails if it grows. See [CONTRIBUTING.md](${REPO}/CONTRIBUTING.md#unit-tests).`,
    `- **New files need the Apache licence header** — \`./scripts/check-license.sh\` checks this.`,
    `- **User-facing strings need translation keys**, not literals — \`npm run i18n:check\`.`,
    `- **Third-party surfaces go through \`src/app/core/adapters/\`** rather than being called directly. [ADR 0003](${REPO}/DOCS/adr/0003-adapter-boundary.md) explains why.`,
    '',
    'The checklist in the pull request description covers the rest.',
    '',
    '### If a review takes a while',
    '',
    'This is a volunteer project, so a quiet week happens. Nudging the pull request or asking on',
    'the mailing list is welcome and not considered rude.',
    '',
    '---',
    '',
    '<sub>Posted automatically the first time you open a pull request here.</sub>',
  ].join('\n');
}

/** Idempotent: a re-run, or a reopened pull request, must not stack up greetings. */
async function alreadyWelcomed({ github, context, issueNumber }) {
  const { owner, repo } = context.repo;
  const comments = await github.paginate(github.rest.issues.listComments, {
    owner,
    repo,
    issue_number: issueNumber,
    per_page: 100,
  });
  return comments.some((comment) => comment.user?.type === 'Bot' && comment.body?.includes(MARKER));
}

module.exports = async ({ github, context, core }) => {
  const log = core?.info ?? console.log;
  const pull = context.payload.pull_request;

  if (!pull) {
    log('No pull request in the event payload; nothing to do.');
    return;
  }

  const association = pull.author_association;
  if (!WELCOMED_ASSOCIATIONS.has(association)) {
    log(`Author association is ${association}; not a first-time contributor. Skipping.`);
    return;
  }

  if (pull.user?.type === 'Bot') {
    log('Pull request opened by a bot. Skipping.');
    return;
  }

  if (await alreadyWelcomed({ github, context, issueNumber: pull.number })) {
    log('Already welcomed on this pull request. Skipping.');
    return;
  }

  const { owner, repo } = context.repo;
  await github.rest.issues.createComment({
    owner,
    repo,
    issue_number: pull.number,
    body: buildBody(defuseReferences(pull.user?.login ?? '')),
  });
  log(`Welcomed ${pull.user?.login ?? 'contributor'} on #${pull.number}.`);
};

// Exported for the unit tests; not used by the workflow.
module.exports.buildBody = buildBody;
module.exports.defuseReferences = defuseReferences;
module.exports.MARKER = MARKER;
module.exports.WELCOMED_ASSOCIATIONS = WELCOMED_ASSOCIATIONS;
