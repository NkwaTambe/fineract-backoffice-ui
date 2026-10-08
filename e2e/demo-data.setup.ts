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
 * Populates a freshly provisioned Fineract instance with a representative dataset for a
 * human to click through — release-candidate sanity testing, a demo, a screenshot pass —
 * rather than the narrow fixtures an individual spec builds for itself.
 *
 * Composed entirely from the existing seed-api.ts building blocks the specs already use and
 * trust; this adds no new seeding logic of its own; it only sequences what is already there
 * into one representative pass and prints what it made.
 *
 * Not part of any CI project's default run — this is a standalone project
 * (`--project=demo-seed`) so it never executes as a side effect of `--project=backend`, and
 * it does not depend on the `setup` project, so `npm run seed:demo-data` works on its own
 * against a backend that has had nothing else run against it yet.
 *
 * Run with:
 *   npm run seed:demo-data
 *
 * or, against a non-default backend:
 *   FINERACT_SERVER_URL=/fineract-provider/api/v1 npm run seed:demo-data
 */

import { test as setup } from '@playwright/test';

import {
  createApiContext,
  ensureReferenceData,
  seedActiveLoan,
  seedCenter,
  seedChartReport,
  seedClient,
  seedCollateralProduct,
  seedFixedDepositAccount,
  seedGroup,
  seedLoanCollateralType,
  seedLoanDatatable,
  seedManualJournalEntry,
  seedOffice,
  seedPendingLoan,
  seedReportDefinition,
  seedSavingsAccountWithTransactions,
  seedShareAccount,
  seedStaff,
} from './utils/seed-api';

setup('seed a representative demo dataset', async () => {
  // Generous: this makes roughly twenty sequential API calls against a backend whose first
  // requests after boot are already slow while caches warm.
  setup.setTimeout(180000);

  const api = await createApiContext();
  try {
    await ensureReferenceData(api);
    await seedLoanDatatable(api);
    await seedCollateralProduct(api);
    await seedLoanCollateralType(api);

    const office = await seedOffice(api, 'Demo');
    const staff = await seedStaff(api, 'DemoOfficer');
    const center = await seedCenter(api, 'Demo Center');
    const group = await seedGroup(api, 'Demo Group');

    const browsingClient = await seedClient(api, 'DemoBrowse');
    const activeLoan = await seedActiveLoan(api, 'DemoActive');
    const pendingLoan = await seedPendingLoan(api, 'DemoQueue');
    const savings = await seedSavingsAccountWithTransactions(api, 'DemoSavings');
    const fixedDeposit = await seedFixedDepositAccount(api, 'DemoFixed');
    const shareAccount = await seedShareAccount(api, 'DemoShares');
    const journalEntry = await seedManualJournalEntry(api, 'DemoJournal');
    const chartReport = await seedChartReport(api, 'DemoChart');
    const reportDefinition = await seedReportDefinition(api, 'DemoReportDef');

    console.log(
      [
        '',
        'Demo dataset ready. Sign in with the usual local admin credentials and look for:',
        '',
        `  Office               ${office.officeName} (#${office.officeId})`,
        `  Staff                ${staff.staffName}`,
        `  Center               ${center.centerName} (#${center.centerId}) — pending`,
        `  Group                ${group.groupName} (#${group.groupId}) — no parent center yet`,
        `  Client               ${browsingClient.displayName} (#${browsingClient.clientId})`,
        `  Active loan          ${activeLoan.displayName} — #${activeLoan.loanId}, disbursed`,
        `  Pending loan         ${pendingLoan.clientName} — ${pendingLoan.accountNo}, in the approval queue`,
        `  Savings account      ${savings.clientName} — #${savings.savingsId}, one deposit + one hold`,
        `  Fixed deposit        ${fixedDeposit.clientName} — #${fixedDeposit.accountId}, pending approval`,
        `  Share account        ${shareAccount.clientName} — ${shareAccount.productName}, pending approval`,
        `  Manual journal entry ${journalEntry.debitAccountName} / ${journalEntry.creditAccountName} — reversible`,
        `  Chart report         ${chartReport.reportName} (Reports > Run Reports)`,
        `  Report definition    ${reportDefinition.reportName} (System > Report Definitions)`,
        '',
      ].join('\n'),
    );
  } finally {
    await api.dispose();
  }
});
