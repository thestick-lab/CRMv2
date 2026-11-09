import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  getInitialPracticeState,
  practiceReducer,
} from '@/context/PracticeStoreContext';
import { buildAuditEntries } from '@/components/govlog/audit-log';
import type { PracticeTaskItem } from '@/components/deadlines/practice-tasks';
import { submissionActivity } from './activity-events';

/** The real Home checkbox path: an unsigned override plus one activity event. */
const TASK: Pick<
  PracticeTaskItem,
  'id' | 'clientCode' | 'clientName' | 'service' | 'period'
> = {
  id: 'AXE-460|EMP201|2026-11',
  clientCode: 'AXE-460',
  clientName: 'Axe Struct (Pty) Ltd',
  service: 'EMP201',
  period: 'Nov 2026',
};

function submittedFromHome() {
  const start = getInitialPracticeState();
  const withOverride = practiceReducer(start, {
    type: 'UPDATE_TASK_STATUS',
    payload: {
      taskId: TASK.id,
      status: 'Submitted',
      metadata: {
        submissionDate: '2026-11-09',
        service: TASK.service,
        clientName: TASK.clientName,
        period: TASK.period,
      },
    },
  });

  return practiceReducer(withOverride, {
    type: 'LOG_ACTIVITY',
    payload: submissionActivity(TASK, 'Erik'),
  });
}

describe('submission activity', () => {
  it('turns a gate-free Home completion into exactly one governance entry', () => {
    const state = submittedFromHome();
    const entries = buildAuditEntries({
      clients: state.clients,
      staff: state.staff,
      taskStatusOverrides: state.taskStatusOverrides,
      activity: state.activity,
      quotes: state.quotes,
      invoices: state.invoices,
    });

    const submitted = entries.filter((entry) => entry.action === 'Submitted');
    expect(submitted).toHaveLength(1);
    expect(submitted[0].clientCode).toBe('AXE-460');
    expect(submitted[0].subject).toBe('EMP201 · Nov 2026');
    expect(submitted[0].actorName).toBe('Erik');
    // The client column already names the client; no duplicated detail cell.
    expect(submitted[0].detail).toBeUndefined();
    expect(state.activity).toHaveLength(1);
  });

  it('is logged from both statutory submit sites, and never for an already-submitted task', () => {
    const home = fs.readFileSync('src/components/views/DashboardView.tsx', 'utf8');
    const form = fs.readFileSync('src/components/deadlines/StatutoryActionForm.tsx', 'utf8');

    for (const source of [home, form]) {
      expect(source).toContain("from '@/lib/activity-events'");
      expect(source).toContain('logActivity(submissionActivity(task, currentUser.name))');
    }

    // Re-saving a filed return updates the override; it must not append events.
    expect(home).toContain("taskStatusOverrides[task.id]?.status !== 'Submitted'");
    expect(form).toContain("override?.status !== 'Submitted'");
  });
});
