/**
 * The governance audit trail.
 *
 * Entries are DERIVED from practice state every time the log renders — there is
 * no second stored log to drift out of sync. Partner sign-offs and submissions
 * come from `taskStatusOverrides`; everything else the practice records (quote
 * moves, invoice sends, time, permission changes) arrives through `activity`.
 * Adding a new source later means adding one mapping function and calling it
 * from `buildAuditEntries`; the entry shape and the exports stay unchanged.
 */
import type { Client, StaffMember } from 'fdoncall-practice/domain/types';
import { auditLogPdf, type AuditPdfColumn } from 'fdoncall-practice/export/audit-pdf';
import { offerDownload } from 'fdoncall-practice/ui/download';
import type {
  ActivityEvent,
  ActivityType,
  Invoice,
  Quote,
  TaskStatusOverride,
} from '@/context/PracticeStoreContext';

export interface AuditEntry {
  id: string;
  /** ISO date or date-time; sorted newest first. */
  at: string;
  actorName: string;
  actorRole: string;
  action: string;
  subject: string;
  clientCode?: string;
  detail?: string;
}

export interface AuditLogSource {
  clients: Pick<Client, 'code' | 'name'>[];
  staff: Pick<StaffMember, 'id' | 'name' | 'role'>[];
  taskStatusOverrides: Record<string, TaskStatusOverride>;
  activity?: ActivityEvent[];
  /** Stage/creation events name their quote but not always their client. */
  quotes?: Pick<Quote, 'number' | 'clientCode'>[];
  invoices?: Pick<Invoice, 'number' | 'clientCode'>[];
}

/** Activity types mapped onto the actions shown in the log. */
const ACTIVITY_ACTIONS: Record<ActivityType, string> = {
  task: 'Task updated',
  submission: 'Submitted',
  quote: 'Quote activity',
  invoice: 'Invoice activity',
  time: 'Time logged',
  file: 'File added',
  client: 'Client record change',
  permission: 'Changed permission',
};

const ROLE_FALLBACK = 'Practice';
const SIGN_OFF_ROLE_FALLBACK = 'Partner';

/**
 * Activity whose text carries a more specific event than its type does — a
 * quote conversion is a client event, a stage move is a quote event. First
 * match wins, so the most specific pattern sits first.
 */
const ACTIVITY_ACTION_PATTERNS: Partial<Record<ActivityType, [RegExp, string][]>> = {
  client: [
    [/^Client created from quote/i, 'Client created from quote'],
    [/^Services updated for/i, 'Client services updated'],
  ],
  quote: [
    [/signed by/i, 'Quote signed'],
    [/closed lost/i, 'Quote closed lost'],
    [/ sent to /i, 'Quote sent'],
    [/ accepted\b/i, 'Quote accepted'],
    [/moved to /i, 'Quote stage changed'],
    [/\b(saved|draft)\b/i, 'Quote drafted'],
  ],
  invoice: [
    [/ sent to /i, 'Invoice sent'],
    [/marked paid/i, 'Invoice paid'],
    [/pushed to Xero/i, 'Invoice pushed to Xero'],
    [/ created /i, 'Invoice created'],
    [/INV-\d+/i, 'Invoice updated'],
  ],
  permission: [
    [/^Reset permissions/i, 'Reset permissions'],
    [/^Changed permission/i, 'Changed permission'],
  ],
};

function actionForActivity(event: ActivityEvent): string {
  for (const [pattern, action] of ACTIVITY_ACTION_PATTERNS[event.type] ?? []) {
    if (pattern.test(event.text)) return action;
  }
  return ACTIVITY_ACTIONS[event.type] ?? 'Activity';
}

/** Statutory task ids are `<clientCode>|<service>|<period>`; accept bare codes too. */
export function clientCodeFromTaskId(taskId: string): string | undefined {
  const head = taskId.split('|')[0]?.trim();
  if (head && /^[A-Z]{2,4}-\d{3}$/.test(head)) return head;
  return taskId.match(/\b[A-Z]{2,4}-\d{3}\b/)?.[0];
}

function clientCodeFromSubline(subline: string | undefined): string | undefined {
  return subline?.match(/^\s*([A-Z]{2,4}-\d{3})\b/)?.[1];
}

/** Subline minus the leading client code: the row's supporting detail. */
function detailFromSubline(subline: string | undefined): string | undefined {
  const remaining = subline?.replace(/^\s*[A-Z]{2,4}-\d{3}\s*·\s*/, '').trim();
  if (!remaining || /^[A-Z]{2,4}-\d{3}$/.test(remaining)) return undefined;
  return remaining;
}

function sortNewestFirst(entries: AuditEntry[]): AuditEntry[] {
  const stamp = (at: string) => {
    const parsed = Date.parse(at);
    return Number.isNaN(parsed) ? 0 : parsed;
  };
  return [...entries].sort((a, b) => stamp(b.at) - stamp(a.at));
}

function roleForName(staff: AuditLogSource['staff'], name: string, fallback: string): string {
  return staff.find((member) => member.name === name)?.role ?? fallback;
}

/**
 * An entry plus the real-world action it records. Builders that can be
 * described twice (a sign-off writes an override *and* a submission event)
 * stamp the same key; the first builder to produce it wins.
 */
type KeyedAuditEntry = AuditEntry & { dedupeKey?: string };

function entryFromActivity(source: AuditLogSource, event: ActivityEvent): KeyedAuditEntry {
  return {
    id: `audit-activity-${event.id}`,
    at: event.at,
    actorName: event.actorName,
    actorRole: roleForName(source.staff, event.actorName, ROLE_FALLBACK),
    action: actionForActivity(event),
    subject: event.text,
    clientCode: clientCodeFromSubline(event.subline),
    detail: detailFromSubline(event.subline),
  };
}

function buildOverrideEntries(source: AuditLogSource): KeyedAuditEntry[] {
  const entries: KeyedAuditEntry[] = [];

  for (const [taskId, override] of Object.entries(source.taskStatusOverrides)) {
    // The trail is evidence of authorised decisions; an unsigned status change
    // carries no approver and is represented by its activity event instead.
    if (!override.partnerSignOff || !override.approvedBy) continue;

    const clientCode = clientCodeFromTaskId(taskId);
    const service = override.service ?? taskId.split('|')[1];
    const period = override.period ?? taskId.split('|')[2];
    const submitted = override.status === 'Submitted';
    const at = override.updatedAt ?? override.submissionDate ?? '';

    entries.push({
      id: `audit-override-${taskId}`,
      at,
      actorName: override.approvedBy,
      actorRole: roleForName(source.staff, override.approvedBy, SIGN_OFF_ROLE_FALLBACK),
      action: submitted ? 'Submitted' : 'Partner sign-off',
      subject: [service, period].filter(Boolean).join(' · ') || 'Statutory return',
      clientCode,
      detail: override.sarsReference ? `SARS reference ${override.sarsReference}` : undefined,
      // The override holds the approver and the SARS reference, so it is the
      // richer row for a submission the same event also logged.
      dedupeKey: submitted ? `submission:${taskId}` : undefined,
    });
  }

  return entries;
}

function buildSubmissionEntries(source: AuditLogSource): KeyedAuditEntry[] {
  return (source.activity ?? [])
    .filter((event) => event.type === 'submission')
    .map((event) => {
      const base = entryFromActivity(source, event);
      // Unsigned overrides are skipped by the sign-off builder but still hold
      // the filing identity and SARS reference for a non-gated submission.
      const override = event.taskId ? source.taskStatusOverrides[event.taskId] : undefined;

      return {
        ...base,
        subject:
          [override?.service, override?.period].filter(Boolean).join(' · ') || base.subject,
        clientCode: event.taskId
          ? clientCodeFromTaskId(event.taskId)
          : clientCodeFromSubline(event.subline),
        detail: override?.sarsReference
          ? `SARS reference ${override.sarsReference}`
          : base.detail,
        dedupeKey: event.taskId ? `submission:${event.taskId}` : undefined,
      };
    });
}

const PERMISSION_CHANGE_TEXT = /^Changed permission — (.+?): (.+)$/;

/** Types with a dedicated builder below; the general pass must not repeat them. */
const DEDICATED_ACTIVITY_TYPES: ActivityType[] = [
  'submission',
  'permission',
  'quote',
  'invoice',
  'time',
];

function buildPermissionEntries(source: AuditLogSource): KeyedAuditEntry[] {
  return (source.activity ?? [])
    .filter((event) => event.type === 'permission')
    .map((event) => {
      const base = entryFromActivity(source, event);
      const [role = '', group = ''] = event.subline.split(' · ');
      const change = PERMISSION_CHANGE_TEXT.exec(event.text);

      // A matrix reset touches no single permission; its own text is the record.
      if (!change) {
        return {
          ...base,
          subject: 'Default permission matrix',
          detail: [group, 'all roles'].filter(Boolean).join(' · '),
        };
      }

      const [, label, cell] = change;
      return {
        ...base,
        subject: `${label}: ${cell}`,
        detail: [role, label].filter(Boolean).join(' · '),
      };
    });
}

function buildQuoteEntries(source: AuditLogSource): KeyedAuditEntry[] {
  return (source.activity ?? [])
    .filter((event) => event.type === 'quote')
    .map((event) => {
      const number = /\bQ-\d+\b/.exec(event.text)?.[0];
      const quote = number ? source.quotes?.find((entry) => entry.number === number) : undefined;

      return {
        ...entryFromActivity(source, event),
        clientCode: quote?.clientCode ?? clientCodeFromSubline(event.subline),
      };
    });
}

function buildInvoiceEntries(source: AuditLogSource): KeyedAuditEntry[] {
  return (source.activity ?? [])
    .filter((event) => event.type === 'invoice')
    .map((event) => {
      const number = /\bINV-\d+\b/.exec(event.text)?.[0];
      const invoice = number
        ? source.invoices?.find((entry) => entry.number === number)
        : undefined;

      return {
        ...entryFromActivity(source, event),
        clientCode: invoice?.clientCode ?? clientCodeFromSubline(event.subline),
      };
    });
}

function buildTimeEntries(source: AuditLogSource): KeyedAuditEntry[] {
  return (source.activity ?? [])
    .filter((event) => event.type === 'time')
    .map((event) => entryFromActivity(source, event));
}

/** Task notes, vault files and client-record edits. */
function buildGeneralActivityEntries(source: AuditLogSource): KeyedAuditEntry[] {
  return (source.activity ?? [])
    .filter((event) => !DEDICATED_ACTIVITY_TYPES.includes(event.type))
    .map((event) => entryFromActivity(source, event));
}

/** Derive the whole read-only trail, newest first. */
export function buildAuditEntries(source: AuditLogSource): AuditEntry[] {
  const derived: KeyedAuditEntry[] = [
    ...buildOverrideEntries(source),
    ...buildSubmissionEntries(source),
    ...buildPermissionEntries(source),
    ...buildQuoteEntries(source),
    ...buildInvoiceEntries(source),
    ...buildTimeEntries(source),
    ...buildGeneralActivityEntries(source),
  ];

  // One real-world action, one row: the override builder runs first so its
  // richer subject and detail survive when both sources describe the same act.
  const seen = new Set<string>();
  const unique: AuditEntry[] = [];
  for (const entry of derived) {
    if (entry.dedupeKey) {
      if (seen.has(entry.dedupeKey)) continue;
      seen.add(entry.dedupeKey);
    }
    const { dedupeKey: _key, ...auditEntry } = entry;
    unique.push(auditEntry);
  }

  return sortNewestFirst(unique);
}

/** The same derived trail filtered to the events that touch one client. */
export function buildClientAuditEntries(
  source: AuditLogSource,
  clientCode: string
): AuditEntry[] {
  return buildAuditEntries(source).filter((entry) => entry.clientCode === clientCode);
}

/** Display form: date-only values stay date-only; timestamps gain SAST time. */
export function formatAuditTimestamp(at: string): string {
  if (!at) return '—';
  const dateOnly = /^\d{4}-\d{2}-\d{2}$/.test(at);
  const date = new Date(dateOnly ? `${at}T00:00:00+02:00` : at);
  if (Number.isNaN(date.getTime())) return at;

  const label = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    ...(dateOnly ? {} : { hour: '2-digit', minute: '2-digit', hour12: false }),
  }).format(date);

  return label.replace(',', '');
}

function csvField(value: string | undefined): string {
  return `"${(value ?? '').replace(/"/g, '""')}"`;
}

const CSV_HEADER = ['Timestamp', 'Actor', 'Role', 'Action', 'Subject', 'Client', 'Detail'];

/** RFC 4180-style CSV: plain header, every value quoted and escaped. */
export function exportAuditCsv(entries: AuditEntry[]): string {
  const rows = entries.map((entry) =>
    [
      formatAuditTimestamp(entry.at),
      entry.actorName,
      entry.actorRole,
      entry.action,
      entry.subject,
      entry.clientCode ?? '',
      entry.detail ?? '',
    ]
      .map(csvField)
      .join(',')
  );

  return [CSV_HEADER.join(','), ...rows].join('\n');
}

const PDF_COLUMNS: AuditPdfColumn[] = [
  { label: 'Timestamp', width: 100, mono: true },
  { label: 'Actor', width: 110 },
  { label: 'Role', width: 82 },
  { label: 'Action', width: 96 },
  { label: 'Subject', width: 195 },
  { label: 'Client', width: 74, mono: true },
  { label: 'Detail', width: 150 },
];

/** Render the trail as a printable table, newest first. */
export async function exportAuditPdf(entries: AuditEntry[]): Promise<Uint8Array> {
  return auditLogPdf({
    title: 'Governance Log',
    subtitle: 'Read-only practice audit trail · partner sign-offs, submissions and recorded activity',
    columns: PDF_COLUMNS,
    rows: entries.map((entry) => [
      formatAuditTimestamp(entry.at),
      entry.actorName,
      entry.actorRole,
      entry.action,
      entry.subject,
      entry.clientCode ?? '',
      entry.detail ?? '',
    ]),
  });
}

function exportFileName(extension: string): string {
  return `governance-log-${new Date().toISOString().slice(0, 10)}.${extension}`;
}

export async function downloadAuditCsv(entries: AuditEntry[]): Promise<void> {
  const bytes = new TextEncoder().encode(exportAuditCsv(entries));
  await offerDownload(exportFileName('csv'), bytes, 'text/csv');
}

export async function downloadAuditPdf(entries: AuditEntry[]): Promise<void> {
  const bytes = await exportAuditPdf(entries);
  await offerDownload(exportFileName('pdf'), bytes, 'application/pdf');
}
