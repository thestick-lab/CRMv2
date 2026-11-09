import { describe, expect, it } from 'vitest';
import { STAFF } from 'fdoncall-practice/data/seed';
import type { PracticeTaskItem } from '@/components/deadlines/practice-tasks';
import type { ActivityEvent, PracticeUser, TaskStatusOverride } from '@/context/PracticeStoreContext';
import {
  buildHomeData,
  buildMyTaskLists,
  getUpcomingHolidays,
  priorityForDays,
} from './home-logic';

const TODAY = '2026-11-09';

const CURRENT_USER: PracticeUser = {
  id: 'erik',
  name: 'Erik',
  role: 'Partner',
  email: 'erik@fdoncall.co.za',
  kind: 'employee',
};

function task(overrides: Partial<PracticeTaskItem>): PracticeTaskItem {
  return {
    id: 'task-1',
    clientCode: 'KHE-615',
    clientName: 'Kheper SA t/a Silki',
    service: 'VAT201',
    period: '2026-10',
    statutory: true,
    needsPartnerReview: false,
    urgency: 'week',
    status: 'Not started',
    staffId: 'erik',
    staffName: 'Erik',
    ...overrides,
  };
}

const TASKS: PracticeTaskItem[] = [
  task({ id: 'khe-VAT201', due: '2026-11-10', daysUntilDue: 1 }),
  task({
    id: 'khe-AFS',
    service: 'AFS',
    due: '2026-12-20',
    daysUntilDue: 41,
    staffId: 'mia',
    staffName: 'Mia',
    needsPartnerReview: true,
  }),
  task({
    id: 'mus-VAT201',
    clientCode: 'MUS-875',
    clientName: 'Muse 1399',
    due: '2026-11-07',
    daysUntilDue: -2,
    urgency: 'overdue',
  }),
  task({
    id: 'mus-EMP201',
    clientCode: 'MUS-875',
    clientName: 'Muse 1399',
    service: 'EMP201',
    due: '2027-02-01',
    daysUntilDue: 84,
    urgency: 'later',
  }),
  task({
    id: 'mus-ITR14',
    clientCode: 'MUS-875',
    clientName: 'Muse 1399',
    service: 'ITR14',
    due: '2026-12-15',
    daysUntilDue: 36,
    urgency: 'month',
  }),
  task({
    id: 'alc-ITR14',
    clientCode: 'ALC-610',
    clientName: 'A & L Contracting',
    service: 'ITR14',
    due: '2026-11-30',
    daysUntilDue: 21,
    urgency: 'month',
    staffId: 'nikita',
    staffName: 'Nikita',
  }),
];

const OVERRIDES: Record<string, TaskStatusOverride> = {
  'khe-AFS': { status: 'Partner Review Gate' },
  'mus-ITR14': { status: 'Submitted', submissionDate: '2026-11-08' },
};

const LIVE_ACTIVITY: ActivityEvent[] = [
  {
    id: 'live-1',
    type: 'submission',
    actorName: 'Mia',
    actorInitials: 'M',
    tint: 'amber',
    text: 'Marked the AFS working papers ready for partner review',
    subline: 'KHE-615 · Kheper SA t/a Silki',
    at: '2026-11-08T09:00:00+02:00',
  },
];

function build(tasks: PracticeTaskItem[] = TASKS, overrides = OVERRIDES) {
  return buildHomeData({
    tasks,
    staff: STAFF,
    currentUser: CURRENT_USER,
    taskStatusOverrides: overrides,
    activity: LIVE_ACTIVITY,
    timeEntries: [],
    today: TODAY,
  });
}

describe('Home data: KPI strip', () => {
  it('counts open tasks and tasks due within the next week', () => {
    const home = build();
    // mus-ITR14 is submitted, the other five are open
    expect(home.kpis.totalTasks).toBe(5);
    // Only khe-VAT201 (due tomorrow) falls inside the seven-day horizon
    expect(home.kpis.dueThisWeek).toBe(1);
  });

  it('counts partner-review gate overrides for the In review tile', () => {
    const home = build();
    expect(home.kpis.inReview).toBe(1);
  });

  it('counts practice staff for the Team members tile', () => {
    const home = build();
    expect(home.kpis.teamMembers).toBe(STAFF.length);
  });
});

describe('Home data: my tasks', () => {
  it('returns only tasks assigned to the current user', () => {
    const home = build();
    expect(home.myTasks.every((t) => t.id !== 'khe-AFS' && t.id !== 'alc-ITR14')).toBe(true);
    expect(home.myTasks.map((t) => t.id).sort()).toEqual(
      ['khe-VAT201', 'mus-EMP201', 'mus-VAT201'].sort()
    );
  });

  it('maps urgency to priority (overdue and due-tomorrow are High)', () => {
    const home = build();
    const byId = new Map(home.myTasks.map((t) => [t.id, t]));
    expect(byId.get('khe-VAT201')?.priority).toBe('High');
    expect(byId.get('mus-VAT201')?.priority).toBe('High');
    expect(byId.get('mus-EMP201')?.priority).toBe('Low');
  });

  it('maps the 21-day fixture to Medium and holds the 7- and 30-day boundaries', () => {
    // Boundaries: within seven days is High, up to thirty is Medium, past is Low.
    expect(priorityForDays(7)).toBe('High');
    expect(priorityForDays(8)).toBe('Medium');
    expect(priorityForDays(30)).toBe('Medium');
    expect(priorityForDays(31)).toBe('Low');

    // The 21-day alc-ITR14 fixture, reached through the my-tasks pipeline.
    const nikita: PracticeUser = { ...CURRENT_USER, id: 'nikita', name: 'Nikita' };
    const lists = buildMyTaskLists(TASKS, OVERRIDES, nikita);
    expect(lists.open.find((t) => t.id === 'alc-ITR14')?.priority).toBe('Medium');
  });

  it('separates completed tasks and counts them for the Completed tab', () => {
    const home = build();
    expect(home.completedCount).toBe(1);
    const lists = buildMyTaskLists(TASKS, OVERRIDES, CURRENT_USER);
    expect(lists.completed.map((t) => t.id)).toEqual(['mus-ITR14']);
  });
});

describe('Home data: empty states', () => {
  it('reports overdue work', () => {
    const home = build();
    expect(home.emptyStates.noOverdue).toBe(false);
    expect(home.emptyStates.noAwaitingClient).toBe(true);
  });

  it('reports no overdue tasks when every due date is in the future', () => {
    const home = build(TASKS.filter((t) => t.id !== 'mus-VAT201'));
    expect(home.emptyStates.noOverdue).toBe(true);
  });

  it('reports tasks awaiting the client once that lane is used', () => {
    const home = build(TASKS, {
      ...OVERRIDES,
      'khe-VAT201': { status: 'Awaiting Client' },
    });
    expect(home.emptyStates.noAwaitingClient).toBe(false);
  });
});

describe('Home data: engagement banner', () => {
  it('features the client with the most open statutory tasks', () => {
    const home = build();
    expect(home.banner).toEqual({
      clientName: 'Muse 1399',
      code: 'MUS-875',
      compliancePct: 33,
      openTasks: 2,
    });
  });

  it('reports that client compliance as submitted or approved over its total', () => {
    const singleClient = TASKS.filter((t) => t.clientCode === 'MUS-875');
    const overrides: Record<string, TaskStatusOverride> = {
      'mus-ITR14': { status: 'Submitted' },
      'mus-EMP201': { status: 'Approved (Ready to Lodge)' },
    };
    const home = build(singleClient, overrides);
    // Two of Muse's three obligations are lodged, so 67% complete
    expect(home.banner?.compliancePct).toBe(67);
    expect(home.banner?.openTasks).toBe(2);
  });

  it('falls back to practice-wide compliance when no client has open work', () => {
    const submittedOnly = TASKS.map((t) => ({ ...t, id: `${t.id}-done` }));
    const overrides = Object.fromEntries(
      submittedOnly.map((t) => [t.id, { status: 'Submitted' } as TaskStatusOverride])
    );
    const home = build(submittedOnly, overrides);
    expect(home.banner).toEqual({
      clientName: 'Practice-wide compliance',
      code: '',
      compliancePct: 100,
      openTasks: 0,
    });
  });
});

describe('Home data: team activity and deadlines', () => {
  it('merges the historical seeds with live events, newest first', () => {
    const home = build();
    expect(home.activity).toHaveLength(6);
    expect(home.activity[0].id).toBe('live-1');
    const timestamps = home.activity.map((e) => e.at);
    expect([...timestamps].sort().reverse()).toEqual(timestamps);
    expect(home.activity.some((e) => e.id === 'activity-seed-vat201')).toBe(true);
  });

  it('lists the next five open due dates in order and skips submitted work', () => {
    const home = build();
    expect(home.deadlines.map((d) => d.id)).toEqual([
      'khe-VAT201',
      'alc-ITR14',
      'khe-AFS',
      'mus-EMP201',
    ]);
    expect(home.deadlines[0]).toMatchObject({ month: 'Nov', day: '10', priority: 'High' });
  });

  it('carries the next three gazetted SA public holidays forward', () => {
    const holidays = getUpcomingHolidays(TODAY, 3);
    expect(holidays.map((h) => h.name)).toEqual([
      'Day of Reconciliation',
      'Christmas Day',
      'Day of Goodwill',
    ]);
    expect(build().holidays).toHaveLength(3);
  });
});
