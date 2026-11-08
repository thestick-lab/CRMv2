import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { aggregatePracticeTasks } from '@/components/deadlines/practice-tasks';
import { CLIENTS, STAFF } from 'fdoncall-practice/data/seed';
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

  it('verifies InboxView and PartnerReviewQueue component files exist and integrate sign-off triggers', () => {
    const queueSrc = fs.readFileSync('src/components/inbox/PartnerReviewQueue.tsx', 'utf8');
    const viewSrc = fs.readFileSync('src/components/views/InboxView.tsx', 'utf8');

    expect(queueSrc).toContain('PartnerReviewQueue');
    expect(queueSrc).toContain('Sign Off as CA(SA)');
    expect(queueSrc).toContain('Approved (Ready to Lodge)');
    expect(viewSrc).toContain('PartnerReviewQueue');
    expect(viewSrc).toContain('Partner Review Queue');
  });
});
