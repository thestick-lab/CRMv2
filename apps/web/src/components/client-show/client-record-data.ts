import type { Client, StaffMember } from 'fdoncall-practice/domain/types';
import { defaultServices } from 'fdoncall-practice/domain/rules';
import type {
  ActivityEvent,
  Invoice,
  Quote,
  TaskStatusOverride,
} from '@/context/PracticeStoreContext';
import { aggregatePracticeTasks, type PracticeTaskItem } from '@/components/deadlines/practice-tasks';
import { buildClientAuditEntries } from '@/components/govlog/audit-log';

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

/**
 * BO filing state from the recorded scope and the filing flag. Ticking BO on
 * the record puts the work in scope; the flag alone (used by legacy records)
 * only speaks once BO is a service we provide.
 */
export function boFilingState(client: Client): 'out-of-scope' | 'required' | 'filed' {
  if (!defaultServices(client).includes('BO')) return 'out-of-scope';
  return client.beneficialOwnershipFiled === true ? 'filed' : 'required';
}

export interface ClientTimelineEntry {
  id: string;
  at: string;
  /** What happened, e.g. `Submitted` or `Invoice sent`. */
  action: string;
  /** The event's subject, e.g. `AFS · FY 2026`. */
  title: string;
  /** Actor plus supporting detail, rendered beside the date. */
  subline: string;
}

/** Store records the trail joins against to find a client code. */
export interface ClientTimelineSource {
  clients?: Pick<Client, 'code' | 'name'>[];
  staff?: Pick<StaffMember, 'id' | 'name' | 'role'>[];
  quotes?: Pick<Quote, 'number' | 'clientCode'>[];
  invoices?: Pick<Invoice, 'number' | 'clientCode'>[];
}

/**
 * Relationship timeline: the governance trail filtered to this client — its
 * filings, sign-offs, quote decisions, invoices and logged time. Newest first.
 */
export function buildClientTimeline(
  client: Client,
  activity: ActivityEvent[],
  overrides: Record<string, TaskStatusOverride>,
  source: ClientTimelineSource = {}
): ClientTimelineEntry[] {
  return buildClientAuditEntries(
    {
      clients: source.clients ?? [{ code: client.code, name: client.name }],
      staff: source.staff ?? [],
      taskStatusOverrides: overrides,
      activity,
      quotes: source.quotes,
      invoices: source.invoices,
    },
    client.code
  ).map((entry) => ({
    id: entry.id,
    at: entry.at,
    action: entry.action,
    title: entry.subject,
    subline: [entry.actorName, entry.detail].filter(Boolean).join(' · '),
  }));
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
