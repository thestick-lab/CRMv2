import { describe, expect, it } from 'vitest';
import { aggregatePracticeTasks, filterPracticeTasks } from './practice-tasks';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('Practice-wide statutory task aggregator and KPI counts', () => {
  const asOf = '2026-11-07';
  const summary = aggregatePracticeTasks(CLIENTS, asOf);

  it('aggregates statutory filings across all 13 practice clients', () => {
    expect(summary.tasks.length).toBeGreaterThan(0);
    // All 13 clients are represented
    const codes = new Set(summary.tasks.map((t) => t.clientCode));
    expect(codes.size).toBe(13);
  });

  it('computes the 4 statutory KPI tile metrics', () => {
    expect(summary.kpi).toBeDefined();
    expect(typeof summary.kpi.overdue).toBe('number');
    expect(typeof summary.kpi.due7Days).toBe('number');
    expect(typeof summary.kpi.due30Days).toBe('number');
    expect(typeof summary.kpi.missingDate).toBe('number');
  });

  it('filters tasks by horizon (30 days, 90 days, 365 days)', () => {
    const horizon30 = filterPracticeTasks(summary.tasks, { horizon: '30', asOfDate: asOf });
    const horizon90 = filterPracticeTasks(summary.tasks, { horizon: '90', asOfDate: asOf });
    const horizon365 = filterPracticeTasks(summary.tasks, { horizon: '365', asOfDate: asOf });

    expect(horizon30.length).toBeLessThanOrEqual(horizon90.length);
    expect(horizon90.length).toBeLessThanOrEqual(horizon365.length);
  });

  it('filters tasks by staff member assignee', () => {
    const erikTasks = filterPracticeTasks(summary.tasks, { staffId: 'erik', asOfDate: asOf });
    expect(erikTasks.length).toBeGreaterThan(0);
    for (const t of erikTasks) {
      expect(t.staffId).toBe('erik');
    }
  });
});
