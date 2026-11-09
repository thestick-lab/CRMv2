import type { Client, StaffMember } from 'fdoncall-practice/domain/types';
import { defaultServices } from 'fdoncall-practice/domain/rules';
import {
  ACTIVITY_SEEDS,
  type ActivityEvent,
  type TaskStatusOverride,
} from '@/context/PracticeStoreContext';
import { aggregatePracticeTasks, type PracticeTaskItem } from '@/components/deadlines/practice-tasks';

/* ---------------------------------------------------------------------------
 * Pure derivation helpers for the client record. Everything here reads the
 * domain model and store state and returns plain data; the panels and tabs
 * stay presentational.
 * ------------------------------------------------------------------------- */

/** Avatar initials: first letters of up to two letter-bearing words. */
export function initialsFor(name: string): string {
  const words = name
    .split(/\s+/)
    .map((word) => word.replace(/[^A-Za-z]/g, ''))
    .filter((word) => word.length > 0);
  if (words.length === 0) return '—';
  return words
    .slice(0, 2)
    .map((word) => word[0]!.toUpperCase())
    .join('');
}

export type MissingInformationKind = 'contact' | 'statutory' | 'organization';

export interface MissingInformationItem {
  /** DOM control id for statutory fields, otherwise the client field key. */
  id: 'email' | 'phone' | 'location' | 'timezone' | 'incorporationDate' | 'turnover' | 'contacts';
  label: string;
  kind: MissingInformationKind;
  hint: string;
}

/** Fields a client record cannot report on until they are recorded. */
export function buildMissingInformation(client: Client): MissingInformationItem[] {
  const missing: MissingInformationItem[] = [];

  if (!client.email) {
    missing.push({ id: 'email', label: 'Email address', kind: 'contact', hint: 'Primary correspondence channel' });
  }
  if (!client.phone) {
    missing.push({ id: 'phone', label: 'Phone number', kind: 'contact', hint: 'Used for filing follow-ups' });
  }
  if (!client.location) {
    missing.push({ id: 'location', label: 'Location', kind: 'contact', hint: 'Office or registered address' });
  }
  if (!client.timezone) {
    missing.push({ id: 'timezone', label: 'Timezone', kind: 'contact', hint: 'Deadline cut-off time' });
  }

  const isCompany = client.entityType === 'Company' || client.entityType === 'Close corporation';
  if (isCompany && !client.incorporationDate) {
    missing.push({
      id: 'incorporationDate',
      label: 'Incorporation date',
      kind: 'statutory',
      hint: 'Sets the exact CIPC annual return window',
    });
  }
  if (!client.turnover) {
    missing.push({
      id: 'turnover',
      label: 'Annual turnover',
      kind: 'statutory',
      hint: 'Drives the CIPC fee band and turnover tier',
    });
  }

  if (!client.contacts || client.contacts.length === 0) {
    missing.push({
      id: 'contacts',
      label: 'Primary contact',
      kind: 'organization',
      hint: 'Director or contact person for this engagement',
    });
  }

  return missing;
}

/** Tag pills for the record header: entity type plus the statutory scope. */
export function clientTags(client: Client): string[] {
  const services = defaultServices(client);
  return [client.entityType, ...services];
}

/** Store activity with the seeded historical feed appended (deduped by id). */
export function withSeededActivity(activity: ActivityEvent[]): ActivityEvent[] {
  const seen = new Set(activity.map((event) => event.id));
  return [...activity, ...ACTIVITY_SEEDS.filter((seed) => !seen.has(seed.id))];
}

export interface ClientTimelineEntry {
  id: string;
  at: string;
  title: string;
  subline: string;
}

function mentionsClient(event: ActivityEvent, client: Client): boolean {
  return (
    event.subline.includes(client.code) ||
    event.subline.includes(client.name) ||
    event.text.includes(client.name)
  );
}

/**
 * Relationship timeline: practice activity that touches this client plus the
 * filing milestones recorded as task overrides. Newest first.
 */
export function buildClientTimeline(
  client: Client,
  activity: ActivityEvent[],
  overrides: Record<string, TaskStatusOverride>
): ClientTimelineEntry[] {
  const entries: ClientTimelineEntry[] = activity
    .filter((event) => mentionsClient(event, client))
    .map((event) => ({
      id: `activity-${event.id}`,
      at: event.at,
      title: event.text,
      subline: event.subline,
    }));

  const prefix = `${client.code}-`;
  for (const [taskId, override] of Object.entries(overrides)) {
    if (!taskId.startsWith(prefix)) continue;
    const submitted = override.status === 'Submitted' || override.status === 'Done';
    if (!submitted && !override.partnerSignOff) continue;

    const service = override.service ?? taskId.slice(prefix.length);
    const period = override.period ? ` ${override.period}` : '';
    entries.push({
      id: `override-${taskId}`,
      at: override.updatedAt ?? '',
      title: `${submitted ? 'Submitted' : 'Partner sign-off'} ${service}${period}`,
      subline: [override.approvedBy ?? 'Practice', client.name, override.status].filter(Boolean).join(' · '),
    });
  }

  return entries.sort((a, b) => (a.at < b.at ? 1 : a.at > b.at ? -1 : 0));
}

/** The soonest open statutory task, i.e. what the record should do next. */
export function nextOpenTask(
  client: Client,
  overrides: Record<string, TaskStatusOverride>,
  asOfDate: string,
  staff: StaffMember[] | undefined = undefined
): PracticeTaskItem | undefined {
  const { tasks } = aggregatePracticeTasks([client], asOfDate, staff);

  const open = tasks.filter((task) => {
    const status = overrides[task.id]?.status;
    return status !== 'Submitted' && status !== 'Done';
  });

  open.sort((a, b) => {
    if (a.due && b.due) return a.due < b.due ? -1 : a.due > b.due ? 1 : 0;
    if (a.due) return -1;
    if (b.due) return 1;
    return a.service < b.service ? -1 : a.service > b.service ? 1 : 0;
  });

  return open[0];
}
