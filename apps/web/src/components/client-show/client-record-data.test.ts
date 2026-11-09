import { describe, expect, it } from 'vitest';
import { CLIENTS } from 'fdoncall-practice/data/seed';
import type { ActivityEvent } from '@/context/PracticeStoreContext';
import {
  buildClientTimeline,
  buildMissingInformation,
  clientTags,
  initialsFor,
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
        'MUS-875-afs-2025': {
          status: 'Submitted',
          service: 'AFS',
          clientName: 'Muse 1399',
          period: '2025',
          approvedBy: 'Erik',
          updatedAt: '2026-10-30T10:00:00+02:00',
        },
      }
    );
    expect(timeline).toHaveLength(1);
    expect(timeline[0].title).toContain('AFS');
    expect(timeline[0].subline).toContain('Erik');
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
