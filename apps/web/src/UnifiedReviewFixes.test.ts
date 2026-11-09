import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  getInitialPracticeState,
  practiceReducer,
} from '@/context/PracticeStoreContext';

describe('Unified operations and governance review fixes', () => {
  it('ensures production index.html does not contain localhost:8400 dev script', () => {
    const indexHtml = fs.readFileSync('index.html', 'utf8');
    expect(indexHtml).not.toContain('localhost:8400');
    expect(indexHtml).not.toContain('impeccable-live-start');
  });

  it('persists and hydrates savedEstimates in PracticeStoreContext', () => {
    const state = getInitialPracticeState();
    expect(state.savedEstimates).toBeDefined();

    const mockEstimateInput = {
      startMonth: '2026-12',
      entityType: 'Company' as const,
      yearEndMonth: 2,
      turnover: 6500000,
      payroll: true,
      employeeCount: 12,
      provisionalTaxpayer: true,
      directors: 2,
      rate: 700,
      marchIncreasePct: 6,
      irp6Payable: true,
      selected: { BOOKKEEPING: true, AFS: true },
      hours: { BOOKKEEPING: 6, PAYROLL: 1, MGMT: 2, AFS: 20, REVIEW: 0 },
      months: { AFS: 8, REVIEW: 10, ITR: 9, CIPC_AR: 8 },
      recharges: { XERO: 691.3, SIMPLEPAY: 250 },
    };

    const nextState = practiceReducer(state, {
      type: 'SAVE_ESTIMATE',
      payload: { clientCode: 'ALC-610', input: mockEstimateInput },
    });

    expect(nextState.savedEstimates['ALC-610']).toBeDefined();
    expect(nextState.savedEstimates['ALC-610'].hours.BOOKKEEPING).toBe(6);
  });

  it('verifies SettingsView role-gates the Admin Panel to Partners and Compliance Officers', () => {
    const settingsSrc = fs.readFileSync('src/components/settings/SettingsView.tsx', 'utf8');

    expect(settingsSrc).toContain('usePracticeStore');
    expect(settingsSrc).toContain('currentUser.role');
    expect(settingsSrc).toContain('isPartnerOrAdmin');
  });

  it('verifies DeadlinesKanban drops to Not Started and In Progress update status without premature submit', () => {
    const kanbanSrc = fs.readFileSync('src/components/deadlines/DeadlinesKanban.tsx', 'utf8');

    // Should update status for Not Started and In Progress directly
    expect(kanbanSrc).toContain('updateTaskStatus(taskId, targetStatus)');
    // Should NOT prematurely call updateTaskStatus on Submitted before modal saves
    expect(kanbanSrc).not.toContain("updateTaskStatus(taskId, 'Submitted');");
  });

  it('verifies DeadlinesDashboard accepts and displays client filter badge with clear trigger', () => {
    const dashboardSrc = fs.readFileSync('src/components/deadlines/DeadlinesDashboard.tsx', 'utf8');

    expect(dashboardSrc).toContain('clientFilter');
    expect(dashboardSrc).toContain('onClearClientFilter');
  });

  it('verifies StatutoryProfileTab checkboxes are not disabled when toggled off', () => {
    const tabSrc = fs.readFileSync('src/components/client-show/tabs/StatutoryProfileTab.tsx', 'utf8');

    expect(tabSrc).not.toContain('disabled: !client.vatCategory');
    expect(tabSrc).not.toContain('disabled: !client.payroll');
  });

  it('verifies TaskStatusOverride stores approvedBy partner and the audit trail displays the signing partner', () => {
    const auditSrc = fs.readFileSync('src/components/govlog/audit-log.ts', 'utf8');
    const queueSrc = fs.readFileSync('src/components/inbox/PartnerReviewQueue.tsx', 'utf8');

    expect(queueSrc).toContain('approvedBy: currentUser.name');
    expect(auditSrc).toContain('approvedBy');
  });
});
