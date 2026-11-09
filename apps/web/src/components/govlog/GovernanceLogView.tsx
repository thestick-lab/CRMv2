import * as React from 'react';
import { Download, FileText, Lock, ScrollText, ShieldCheck, X } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AvatarChip, EmptyStateCard } from '@/components/ui/list-primitives';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { cn } from '@/lib/utils';
import {
  buildAuditEntries,
  downloadAuditCsv,
  downloadAuditPdf,
  formatAuditTimestamp,
  type AuditEntry,
} from './audit-log';

const FILTER_SELECT_CLASS =
  'h-8 min-w-0 rounded-md border border-border bg-card px-2 text-xs text-foreground outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#c4161c]';

function initialsFor(name: string): string {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? '')
    .join('');
}

function actionTone(action: string): 'crimson' | 'amber' | 'muted' {
  if (
    action === 'Submitted' ||
    action === 'Client created from quote' ||
    action.startsWith('Quote ') ||
    action.startsWith('Invoice ')
  ) {
    return 'crimson';
  }
  if (action === 'Partner sign-off' || action === 'Changed permission') return 'amber';
  return 'muted';
}

function actionBadgeVariant(action: string): 'crimsonSubdued' | 'warning' | 'outline' {
  const tone = actionTone(action);
  if (tone === 'crimson') return 'crimsonSubdued';
  if (tone === 'amber') return 'warning';
  return 'outline';
}

interface FilterState {
  client: string;
  actor: string;
  action: string;
}

const EMPTY_FILTERS: FilterState = { client: '', actor: '', action: '' };

function uniqueSorted(values: Array<string | undefined>): string[] {
  return [...new Set(values.filter((value): value is string => Boolean(value)))].sort((a, b) =>
    a.localeCompare(b)
  );
}

export function GovernanceLogView() {
  const { clients, staff, taskStatusOverrides, activity } = usePracticeStore();
  const [filters, setFilters] = React.useState<FilterState>(EMPTY_FILTERS);
  const [exportState, setExportState] = React.useState<'idle' | 'working' | 'saved' | 'failed'>('idle');

  const entries = React.useMemo(
    () => buildAuditEntries({ clients, staff, taskStatusOverrides, activity }),
    [clients, staff, taskStatusOverrides, activity]
  );

  const clientNames = React.useMemo(() => {
    const map = new Map<string, string>();
    for (const client of clients) map.set(client.code, client.name);
    return map;
  }, [clients]);

  const clientOptions = React.useMemo(
    () =>
      uniqueSorted(entries.map((entry) => entry.clientCode)).map((code) => ({
        code,
        name: clientNames.get(code) ?? code,
      })),
    [entries, clientNames]
  );
  const actorOptions = React.useMemo(() => uniqueSorted(entries.map((entry) => entry.actorName)), [entries]);
  const actionOptions = React.useMemo(() => uniqueSorted(entries.map((entry) => entry.action)), [entries]);

  const filtered = React.useMemo(
    () =>
      entries.filter(
        (entry) =>
          (!filters.client || entry.clientCode === filters.client) &&
          (!filters.actor || entry.actorName === filters.actor) &&
          (!filters.action || entry.action === filters.action)
      ),
    [entries, filters]
  );

  const hasFilters = Boolean(filters.client || filters.actor || filters.action);

  const handleExport = async (kind: 'csv' | 'pdf') => {
    setExportState('working');
    try {
      if (kind === 'csv') await downloadAuditCsv(filtered);
      else await downloadAuditPdf(filtered);
      setExportState('saved');
      window.setTimeout(() => setExportState('idle'), 2500);
    } catch {
      setExportState('failed');
    }
  };

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        eyebrow="Admin"
        title="Governance Log"
        subtitle="Read-only audit trail of partner sign-offs, statutory submissions, quote decisions, invoices and permission changes — the practice's SAICA/IRBA engagement-quality record."
        actions={
          <>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleExport('pdf')}
              disabled={exportState === 'working' || filtered.length === 0}
              data-testid="export-audit-pdf"
            >
              <FileText />
              Export PDF
            </Button>
            <Button
              size="sm"
              onClick={() => handleExport('csv')}
              disabled={exportState === 'working' || filtered.length === 0}
              data-testid="export-audit-csv"
            >
              <Download />
              Export CSV
            </Button>
          </>
        }
      />

      <div className="flex items-start gap-3 rounded-xl border border-border bg-muted/30 p-3.5">
        <Lock className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
        <p className="text-xs leading-relaxed text-muted-foreground">
          Entries are derived from practice records on every view and cannot be edited or deleted.
          Signing off a return, submitting it to SARS or changing a permission adds a row automatically —
          no one writes to this log by hand.
        </p>
      </div>

      <div className="flex flex-col gap-3 rounded-xl border border-border bg-card px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-mono text-[10px] uppercase tracking-wider">Client</span>
            <select
              aria-label="Filter by client"
              className={FILTER_SELECT_CLASS}
              value={filters.client}
              onChange={(event) => setFilters((current) => ({ ...current, client: event.target.value }))}
            >
              <option value="">All clients</option>
              {clientOptions.map((option) => (
                <option key={option.code} value={option.code}>
                  {option.code} · {option.name}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-mono text-[10px] uppercase tracking-wider">Actor</span>
            <select
              aria-label="Filter by actor"
              className={FILTER_SELECT_CLASS}
              value={filters.actor}
              onChange={(event) => setFilters((current) => ({ ...current, actor: event.target.value }))}
            >
              <option value="">All actors</option>
              {actorOptions.map((actor) => (
                <option key={actor} value={actor}>
                  {actor}
                </option>
              ))}
            </select>
          </label>

          <label className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
            <span className="font-mono text-[10px] uppercase tracking-wider">Action</span>
            <select
              aria-label="Filter by action"
              className={FILTER_SELECT_CLASS}
              value={filters.action}
              onChange={(event) => setFilters((current) => ({ ...current, action: event.target.value }))}
            >
              <option value="">All actions</option>
              {actionOptions.map((action) => (
                <option key={action} value={action}>
                  {action}
                </option>
              ))}
            </select>
          </label>

          {hasFilters && (
            <Button variant="ghost" size="sm" onClick={() => setFilters(EMPTY_FILTERS)} className="h-8">
              <X />
              Clear
            </Button>
          )}
        </div>

        <div className="flex items-center gap-3 text-[11px] text-muted-foreground">
          <span aria-live="polite" className="min-h-4">
            {exportState === 'saved' && 'Exported'}
            {exportState === 'failed' && <span className="text-primary">Export failed</span>}
          </span>
          <Badge variant="outline" className="font-mono text-[10px]">
            {filtered.length}
            {hasFilters ? ` of ${entries.length}` : ''} {filtered.length === 1 ? 'entry' : 'entries'}
          </Badge>
        </div>
      </div>

      {entries.length === 0 ? (
        <EmptyStateCard
          icon={ScrollText}
          title="No audit entries yet"
          subtitle="Sign-offs, submissions and permission changes appear here automatically as they happen."
        />
      ) : filtered.length === 0 ? (
        <EmptyStateCard
          icon={ShieldCheck}
          title="No entries match these filters"
          subtitle="Clear or widen the client, actor and action filters to see the rest of the trail."
          dashed
        />
      ) : (
        <div className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-left">
              <thead className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Timestamp
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Actor
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Action
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Subject
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Client
                  </th>
                  <th scope="col" className="px-4 py-2.5 font-medium">
                    Detail
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {filtered.map((entry: AuditEntry) => (
                  <tr key={entry.id} className="text-xs transition-colors hover:bg-muted/20">
                    <td className="whitespace-nowrap px-4 py-3">
                      <time dateTime={entry.at} className="font-mono text-[11px] tabular-nums text-muted-foreground">
                        {formatAuditTimestamp(entry.at)}
                      </time>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <AvatarChip initials={initialsFor(entry.actorName)} tint={actionTone(entry.action)} />
                        <div className="min-w-0">
                          <p className="truncate font-medium text-foreground">{entry.actorName}</p>
                          <p className="truncate text-[10px] text-muted-foreground">{entry.actorRole}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={actionBadgeVariant(entry.action)} className="whitespace-nowrap text-[10px] font-medium">
                        {entry.action}
                      </Badge>
                    </td>
                    <td className="px-4 py-3">
                      <p className="text-foreground">{entry.subject}</p>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3">
                      {entry.clientCode ? (
                        <span className="flex items-baseline gap-1.5">
                          <span className="font-mono text-[11px] font-semibold text-primary">
                            {entry.clientCode}
                          </span>
                          <span className="max-w-[180px] truncate text-muted-foreground">
                            {clientNames.get(entry.clientCode) ?? ''}
                          </span>
                        </span>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className={cn('text-[11px] text-muted-foreground', entry.detail?.startsWith('SARS') && 'font-mono')}>
                        {entry.detail ?? '—'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
