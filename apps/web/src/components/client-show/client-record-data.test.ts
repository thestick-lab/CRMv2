import { describe, expect, it } from 'vitest';
import { CLIENTS } from 'fdoncall-practice/data/seed';
import type { ActivityEvent } from '@/context/PracticeStoreContext';
import { initialsFor } from '@/lib/initials';
import {
  buildClientTimeline,
  buildMissingInformation,
  clientTags,
  nextOpenTask,
} from './client-record-data';

const muse = CLIENTS.find((c) => c.code === 'MUS-875')!;
const axe = CLIENTS.find((c) => c.code === 'AXE-460')!;

const activity: ActivityEvent[] = [
  {
    id: 'a1',
    type: 'task',
    actorName: 'Lungani',
    actorInitials: 'L',
    tint: 'amber',
    text: 'Sent year-end workpapers to partner review',
    subline: 'MUS-875 · Muse 1399',
    at: '2026-11-05T15:40:00+02:00',
  },
  {
    id: 'a2',
    type: 'submission',
    actorName: 'Erik',
    actorInitials: 'E',
    tint: 'crimson',
    text: 'Submitted VAT201 for Kheper SA t/a Silki',
    subline: 'KHE-615 · VAT category C',
    at: '2026-11-06T09:12:00+02:00',
  },
];

describe('client record derived data', () => {
  it('lists every unfilled contact channel as missing information', () => {
    const missing = buildMissingInformation(muse);
    expect(missing.map((m) => m.id)).toEqual(
      expect.arrayContaining(['email', 'phone', 'location', 'timezone', 'incorporationDate', 'turnover'])
    );
  });

  it('drops missing entries once the client supplies them', () => {
    const filled = {
      ...muse,
      email: 'accounts@muse1399.co.za',
      phone: '+27 21 555 0100',
      location: 'Cape Town, Western Cape',
      timezone: 'SAST (UTC+2)',
      incorporationDate: '2014-03-11',
      turnover: 9_500_000,
    };
    expect(buildMissingInformation(filled)).toHaveLength(0);
  });

  it('builds tags from the statutory scope and entity type', () => {
    const tags = clientTags(axe);
    expect(tags).toContain('Company');
    expect(tags).toContain('VAT201');
  });

  it('derives initials for the avatar tile', () => {
    expect(initialsFor('Muse 1399')).toBe('M');
    expect(initialsFor('A & L Contracting')).toBe('AL');
  });

  it('builds a client-scoped timeline newest first', () => {
    const timeline = buildClientTimeline(muse, activity, {});
    expect(timeline).toHaveLength(1);
    expect(timeline[0].title).toBe('Sent year-end workpapers to partner review');
    expect(timeline[0].subline).toContain('Muse 1399');
  });

  it('adds partner sign-off overrides to the timeline', () => {
    const timeline = buildClientTimeline(
      muse,
      [],
      {
        'MUS-875|AFS|2025': {
          status: 'Submitted',
          partnerSignOff: true,
          service: 'AFS',
          clientName: 'Muse 1399',
          period: '2025',
          approvedBy: 'Erik',
          updatedAt: '2026-10-30T10:00:00+02:00',
        },
      },
      { staff: [{ id: 'erik', name: 'Erik', role: 'Partner' }] }
    );
    expect(timeline).toHaveLength(1);
    expect(timeline[0].title).toContain('AFS');
    expect(timeline[0].action).toBe('Submitted');
    expect(timeline[0].subline).toContain('Erik');
  });

  it('shows the same trail for the client — filings, time and invoices only', () => {
    const trail: ActivityEvent[] = [
      ...activity,
      {
        id: 'a3',
        type: 'time',
        actorName: 'Nikita',
        actorInitials: 'N',
        tint: 'muted',
        text: 'Logged 1.5h on AFS workpapers',
        subline: 'MUS-875 · AFS',
        at: '2026-11-04T10:00:00+02:00',
      },
      {
        id: 'a4',
        type: 'invoice',
        actorName: 'Erik',
        actorInitials: 'E',
        tint: 'crimson',
        text: 'Invoice INV-1 sent to Muse 1399',
        subline: 'R4,125 incl. 15% VAT',
        at: '2026-11-04T11:00:00+02:00',
      },
    ];

    const timeline = buildClientTimeline(muse, trail, {}, {
      invoices: [{ id: 'invoice-1', number: 'INV-1', clientCode: 'MUS-875' }],
    });

    expect(timeline.map((entry) => entry.action)).toEqual(
      expect.arrayContaining(['Invoice sent', 'Time logged', 'Task updated'])
    );
    expect(timeline.some((entry) => entry.action === 'Submitted')).toBe(false);
    expect(timeline.find((entry) => entry.action === 'Invoice sent')?.subline).toContain('R4,125');
  });

  it('picks the soonest open statutory task for the next action panel', () => {
    const task = nextOpenTask(muse, {}, '2026-11-09');
    expect(task).toBeDefined();
    expect(task?.clientCode).toBe('MUS-875');
    expect(task?.due).toBeDefined();
  });

  it('skips submitted tasks when choosing the next action', () => {
    const first = nextOpenTask(muse, {}, '2026-11-09')!;
    const task = nextOpenTask(muse, { [first.id]: { status: 'Submitted' } }, '2026-11-09');
    expect(task?.id).not.toBe(first.id);
  });
});
