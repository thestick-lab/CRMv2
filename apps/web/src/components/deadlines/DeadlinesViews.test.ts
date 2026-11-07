import { describe, expect, it } from 'vitest';
import { bucketKanbanTasks } from './DeadlinesKanban';
import { aggregatePracticeTasks } from './practice-tasks';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('DeadlinesKanban bucket distribution', () => {
  const asOf = '2026-11-07';
  const summary = aggregatePracticeTasks(CLIENTS, asOf);
  const buckets = bucketKanbanTasks(summary.tasks, asOf);

  it('distributes practice tasks across the 4 Kanban columns', () => {
    expect(buckets).toBeDefined();
    expect(buckets.overdue).toBeInstanceOf(Array);
    expect(buckets.due7Days).toBeInstanceOf(Array);
    expect(buckets.due30Days).toBeInstanceOf(Array);
    expect(buckets.missingDate).toBeInstanceOf(Array);

    const totalBucketed =
      buckets.overdue.length +
      buckets.due7Days.length +
      buckets.due30Days.length +
      buckets.missingDate.length;

    // Filtered to 30d scope or all relevant tasks
    expect(totalBucketed).toBeGreaterThan(0);
  });

  it('ensures tasks without due dates are in missingDate column', () => {
    for (const task of buckets.missingDate) {
      expect(task.due).toBeUndefined();
    }
  });
});
