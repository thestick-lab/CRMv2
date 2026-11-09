import { describe, expect, it } from 'vitest';
import type { AdHocTask } from '@/context/PracticeStoreContext';
import { filterAdhocTasks } from './ad-hoc';

const asOf = '2026-11-07';

function task(partial: Partial<AdHocTask> & { id: string }): AdHocTask {
  return {
    clientCode: 'ALC-610',
    description: 'Practice work',
    assigneeId: 'erik',
    status: 'Not Started',
    createdAt: '2026-11-01T08:00:00.000Z',
    ...partial,
  };
}

const tasks: AdHocTask[] = [
  task({ id: 'a-alc-dated', clientCode: 'ALC-610', dueDate: '2026-11-14' }), // 7d
  task({ id: 'a-alc-undated', clientCode: 'ALC-610' }),
  task({ id: 'a-mus-overdue', clientCode: 'MUS-875', dueDate: '2026-10-20', assigneeId: 'wouter' }),
  task({ id: 'a-mus-far', clientCode: 'MUS-875', dueDate: '2027-06-30', assigneeId: 'wouter' }),
];

const base = {
  horizon: '30' as const,
  kpiFilter: 'all' as const,
  asOfDate: asOf,
};

describe('ad-hoc board filters', () => {
  it('scopes ad-hoc cards to the client deep-link', () => {
    const ids = filterAdhocTasks(tasks, {
      ...base,
      horizon: '365',
      clientCode: 'MUS-875',
    }).map((t) => t.id);
    expect(ids).toEqual(['a-mus-overdue', 'a-mus-far']);
  });

  it('filters by assignee and hides ad-hoc work under a return-type filter', () => {
    expect(
      filterAdhocTasks(tasks, { ...base, horizon: '365', staffId: 'wouter' }).map((t) => t.id)
    ).toEqual(['a-mus-overdue', 'a-mus-far']);
    expect(filterAdhocTasks(tasks, { ...base, serviceCode: 'VAT201' })).toEqual([]);
    expect(
      filterAdhocTasks(tasks, { ...base, horizon: '365', serviceCode: 'all' })
    ).toHaveLength(4);
  });

  it('keeps undated ad-hoc work visible in every horizon and buckets it as missing', () => {
    for (const horizon of ['30', '90', '365'] as const) {
      const ids = filterAdhocTasks(tasks, { ...base, horizon }).map((t) => t.id);
      expect(ids).toContain('a-alc-undated');
      // Dated work inside the horizon and overdue work stay visible.
      expect(ids).toContain('a-alc-dated');
      expect(ids).toContain('a-mus-overdue');
    }
    // The far-dated task only enters at the 365-day horizon.
    expect(
      filterAdhocTasks(tasks, { ...base, horizon: '30' }).map((t) => t.id)
    ).not.toContain('a-mus-far');
    expect(
      filterAdhocTasks(tasks, { ...base, horizon: '365' }).map((t) => t.id)
    ).toContain('a-mus-far');

    expect(
      filterAdhocTasks(tasks, { ...base, kpiFilter: 'missing' }).map((t) => t.id)
    ).toEqual(['a-alc-undated']);
  });

  it('applies KPI date ranges to ad-hoc due dates', () => {
    expect(filterAdhocTasks(tasks, { ...base, kpiFilter: 'overdue' }).map((t) => t.id)).toEqual([
      'a-mus-overdue',
    ]);
    expect(filterAdhocTasks(tasks, { ...base, kpiFilter: 'due7' }).map((t) => t.id)).toEqual([
      'a-alc-dated',
    ]);
    expect(filterAdhocTasks(tasks, { ...base, kpiFilter: 'due30' }).map((t) => t.id)).toEqual([
      'a-alc-dated',
    ]);
  });
});
