import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aggregatePracticeTasks } from '@/components/deadlines/practice-tasks';
import { CLIENTS, STAFF } from 'fdoncall-practice/data/seed';
import { getInitialPracticeState, practiceReducer } from '@/context/PracticeStoreContext';
import { filterReviewQueueTasks } from './PartnerReviewQueue';

describe('PartnerReviewQueue data filtering and approval actions', () => {
  const asOf = '2026-11-08';
  const summary = aggregatePracticeTasks(CLIENTS, asOf, STAFF);

  it('filters practice tasks to returns in Partner Review Gate', () => {
    // Seed an override putting one task in Partner Review Gate
    const targetTask = summary.tasks.find((t) => t.service === 'AFS')!;
    const overrides = {
      [targetTask.id]: {
        status: 'Partner Review Gate',
      },
    };

    const queue = filterReviewQueueTasks(summary.tasks, overrides);
    expect(queue.length).toBeGreaterThanOrEqual(1);
    expect(queue.some((t) => t.id === targetTask.id)).toBe(true);
    expect(queue.every((t) => t.needsPartnerReview)).toBe(true);
  });

  it('approving a gated return moves it to Approved (Ready to Lodge) and out of the queue', () => {
    const targetTask = summary.tasks.find((t) => t.service === 'AFS')!;
    const gated = practiceReducer(getInitialPracticeState(), {
      type: 'UPDATE_TASK_STATUS',
      payload: { taskId: targetTask.id, status: 'Partner Review Gate' },
    });

    expect(filterReviewQueueTasks(summary.tasks, gated.taskStatusOverrides)).toContainEqual(
      expect.objectContaining({ id: targetTask.id })
    );

    const approved = practiceReducer(gated, {
      type: 'UPDATE_TASK_STATUS',
      payload: {
        taskId: targetTask.id,
        status: 'Approved (Ready to Lodge)',
        metadata: { partnerSignOff: true, approvedBy: 'Test Partner', submissionDate: asOf },
      },
    });

    const override = approved.taskStatusOverrides[targetTask.id];
    expect(override.status).toBe('Approved (Ready to Lodge)');
    expect(override.partnerSignOff).toBe(true);
    expect(override.approvedBy).toBe('Test Partner');
    expect(filterReviewQueueTasks(summary.tasks, approved.taskStatusOverrides)).toEqual([]);
  });

  it('requesting a revision returns the gated return to In Progress and out of the queue', () => {
    const targetTask = summary.tasks.find((t) => t.service === 'AFS')!;
    const gated = practiceReducer(getInitialPracticeState(), {
      type: 'UPDATE_TASK_STATUS',
      payload: { taskId: targetTask.id, status: 'Partner Review Gate' },
    });

    const revised = practiceReducer(gated, {
      type: 'UPDATE_TASK_STATUS',
      payload: {
        taskId: targetTask.id,
        status: 'In Progress',
        metadata: { partnerSignOff: false },
      },
    });

    expect(revised.taskStatusOverrides[targetTask.id].status).toBe('In Progress');
    // Leaving the approval lanes drops the sign-off entirely (not merely
    // `false`): a stale `approvedBy` must not survive a revision request.
    expect(revised.taskStatusOverrides[targetTask.id].partnerSignOff).toBeUndefined();
    expect(revised.taskStatusOverrides[targetTask.id].approvedBy).toBeUndefined();
    expect(filterReviewQueueTasks(summary.tasks, revised.taskStatusOverrides)).toEqual([]);
  });

  it('renders the reference list anatomy with per-row gate actions', () => {
    const queueSrc = fs.readFileSync('src/components/inbox/PartnerReviewQueue.tsx', 'utf8');
    const viewSrc = fs.readFileSync('src/components/views/InboxView.tsx', 'utf8');

    // Header keeps the pending-approvals badge and lands under the shared masthead.
    expect(viewSrc).toContain('PageHeader');
    expect(viewSrc).toContain('Partner Review Queue');
    expect(viewSrc).toContain('{pendingCount} Pending Approvals');

    // Per-row action pair: primary sign-off + ghost revision, both dispatching the
    // exact statuses the queue's behaviour contract depends on.
    expect(queueSrc).toContain('Sign Off as CA(SA)');
    expect(queueSrc).toContain('Request Revision');
    expect(queueSrc).toContain("variant=\"ghost\"");
    expect(queueSrc).toContain('handleApprove(task)');
    expect(queueSrc).toContain('handleRequestRevision(task.id)');
    expect(queueSrc).toContain("'Approved (Ready to Lodge)'");
    expect(queueSrc).toContain("'In Progress'");
    // The sign-off override carries the filing identity: the audit trail reads
    // `service`/`period` from it to name the subject.
    expect(queueSrc).toContain('service: task.service');
    expect(queueSrc).toContain('period: task.period');

    // Rows stay keyboard reachable with a visible focus ring.
    expect(queueSrc).toContain('tabIndex={0}');
    expect(queueSrc).toContain('focus-visible:ring-inset');
    expect(queueSrc).toContain('focus-visible:ring-[#c4161c]');

    // Retained empty state copy and non-partner guard.
    expect(queueSrc).toContain('Zero Returns Awaiting Partner Review');
    expect(queueSrc).toContain('Partner Signature Required');
  });
});
