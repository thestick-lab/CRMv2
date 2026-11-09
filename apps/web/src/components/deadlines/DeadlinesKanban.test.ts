import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  bucketAdhocTasks,
  bucketWorkflowTasks,
  buildDeadlineColumns,
  effectiveWorkflowStatus,
} from './DeadlinesKanban';
import { aggregatePracticeTasks } from './practice-tasks';
import { CLIENTS } from 'fdoncall-practice/data/seed';
import { can } from '@/lib/permissions';
import type { AdHocTask } from '@/context/PracticeStoreContext';

const asOf = '2026-11-07';
const summary = aggregatePracticeTasks(CLIENTS, asOf);

describe('deadlines workflow buckets', () => {
  it('exposes the six workflow lanes including Awaiting Client', () => {
    const buckets = bucketWorkflowTasks(summary.tasks, {});
    expect(Object.keys(buckets)).toEqual([
      'notStarted',
      'inProgress',
      'awaitingClient',
      'partnerReviewGate',
      'approvedReadyToLodge',
      'submitted',
    ]);

    const total = Object.values(buckets).reduce((sum, items) => sum + items.length, 0);
    expect(total).toBe(summary.tasks.length);
  });

  it('places a task in the Awaiting Client lane from its status override', () => {
    const task = summary.tasks[0];
    const buckets = bucketWorkflowTasks(summary.tasks, {
      [task.id]: { status: 'Awaiting Client' },
    });
    expect(buckets.awaitingClient).toContainEqual(task);
    expect(buckets.notStarted).not.toContainEqual(task);
  });

  it('maps a client-status task into the Awaiting Client lane without an override', () => {
    const task = { ...summary.tasks[0], status: 'Awaiting client' as const };
    expect(effectiveWorkflowStatus(task, {})).toBe('Awaiting Client');
  });
});

describe('ad-hoc task lanes', () => {
  const adhoc: AdHocTask[] = [
    {
      id: 'adhoc-1',
      clientCode: 'ALC-610',
      description: 'Reconcile Xero bank feed for October',
      assigneeId: 'erik',
      dueDate: '2026-11-14',
      status: 'In Progress',
      createdAt: '2026-11-01T09:00:00.000Z',
    },
    {
      id: 'adhoc-2',
      clientCode: 'ALC-610',
      description: 'Chase signed engagement letter',
      assigneeId: 'wouter',
      status: 'Awaiting Client',
      createdAt: '2026-11-02T09:00:00.000Z',
    },
  ];

  it('buckets ad-hoc tasks into their lane and never gates them', () => {
    const buckets = bucketAdhocTasks(adhoc);
    expect(buckets.inProgress.map((t) => t.id)).toEqual(['adhoc-1']);
    expect(buckets.awaitingClient.map((t) => t.id)).toEqual(['adhoc-2']);
    expect(buckets.notStarted).toHaveLength(0);
  });

  it('builds six columns with statutory and ad-hoc cards merged per lane', () => {
    const columns = buildDeadlineColumns({
      statutoryBuckets: bucketWorkflowTasks(summary.tasks, {}),
      adhocBuckets: bucketAdhocTasks(adhoc),
      overrides: {},
      staff: [{ id: 'erik', name: 'Erik' }],
      clients: CLIENTS,
      asOfDate: asOf,
    });

    expect(columns).toHaveLength(6);
    expect(columns.map((c) => c.id)).toEqual([
      'Not Started',
      'In Progress',
      'Awaiting Client',
      'Partner Review Gate',
      'Approved (Ready to Lodge)',
      'Submitted',
    ]);

    const inProgress = columns.find((c) => c.id === 'In Progress')!;
    expect(inProgress.cards.some((c) => c.id === 'adhoc-1' && c.kind === 'adhoc')).toBe(true);
    const awaiting = columns.find((c) => c.id === 'Awaiting Client')!;
    expect(awaiting.cards.some((c) => c.id === 'adhoc-2')).toBe(true);
  });

  it('flags statutory cards whose master data is missing as blocked', () => {
    const columns = buildDeadlineColumns({
      statutoryBuckets: bucketWorkflowTasks(summary.tasks, {}),
      adhocBuckets: bucketAdhocTasks(adhoc),
      overrides: {},
      staff: [],
      clients: CLIENTS,
      asOfDate: asOf,
    });
    const blocked = columns
      .flatMap((c) => c.cards)
      .filter((card) => card.kind === 'statutory' && card.blockedReason);
    for (const card of blocked) {
      expect(card.task?.due).toBeUndefined();
      expect(card.blockedReason).toContain('Missing statutory due date');
    }
  });
});

describe('ad-hoc creation stays with unconditional grants', () => {
  it('gates + Add on the unconditional update-status cell, not the assigned scope', () => {
    const kanbanSrc = fs.readFileSync('src/components/deadlines/DeadlinesKanban.tsx', 'utf8');

    // The affordance checks the plain cell so a Limited role gets no `+ Add`.
    expect(kanbanSrc).toContain(
      "const canAddTasks = can(currentUser.role, 'Deadlines', 'update-status', permissions.matrix);"
    );
    expect(kanbanSrc).toContain('allowAdd={');
    expect(kanbanSrc).toContain("groupBy === 'workflow' && canAddTasks");
    expect(kanbanSrc).not.toContain("canAddTasks = can(currentUser.role, 'Deadlines', 'update-status', permissions.matrix, {");

    // A Subcontractor's cell is Limited, so the unconditional check refuses.
    expect(can('Subcontractor', 'Deadlines', 'update-status')).toBe(false);
    expect(can('Subcontractor', 'Deadlines', 'update-status', undefined, { assigned: true })).toBe(
      true
    );
  });

  it('scopes the ad-hoc modal registers for a Limited role', () => {
    const modalSrc = fs.readFileSync(
      'src/components/deadlines/AdHocTaskModal.tsx',
      'utf8'
    );

    expect(modalSrc).toContain('scopeToAssigned');
    expect(modalSrc).toContain('clientOptions');
    expect(modalSrc).toContain('assigneeOptions');
    expect(modalSrc).not.toContain('{clients.map(');
    expect(modalSrc).not.toContain('{staff.map(');
    // Writes are guarded, not just the picker.
    expect(modalSrc).toContain('clientOptions.some((candidate) => candidate.code === draft.clientCode)');
  });
});
