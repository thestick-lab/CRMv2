import * as React from 'react';
import { formatDate, todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { SERVICE_TYPES } from 'fdoncall-practice/domain/catalogue';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { useTimer } from './timer-context';
import { formatHours } from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { EmptyStateCard } from '@/components/ui/list-primitives';
import { cn } from '@/lib/utils';
import { can } from '@/lib/permissions';
import { Clock, Pencil, Plus } from 'lucide-react';
import { localDay, resolvePresetRange, TIME_REPORT_PRESETS } from './time-report-logic';

/* ---------------------------------------------------------------------------
 * Log tab — the practice timesheet.
 *
 * Rows are the store's time entries for the chosen period, newest first. A
 * row opens the shared capture sheet for an edit (including delete); the
 * billable chip toggles in place because reclassifying time is a one-click
 * correction. Durations shown are the rounded, billable figures the report
 * and the invoice feed both read.
 * ------------------------------------------------------------------------- */

const SERVICE_SHORT = new Map(SERVICE_TYPES.map((service) => [service.code, service.short]));

const SA_TIME = new Intl.DateTimeFormat('en-GB', {
  timeZone: 'Africa/Johannesburg',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
});

function timeLabel(iso: string): string {
  const time = Date.parse(iso);
  return Number.isNaN(time) ? '—' : SA_TIME.format(new Date(time));
}

export function Timesheet() {
  const { timeEntries, clients, staff, updateTimeEntry, currentUser, permissions } =
    usePracticeStore();
  const { openEntrySheet, editEntry } = useTimer();
  const today = todayInSouthAfrica();
  const canViewAllEntries = can(currentUser.role, 'Time', 'view-all', permissions.matrix);
  const [range, setRange] = React.useState(() => resolvePresetRange('this-month', today));

  const clientName = React.useMemo(
    () => new Map(clients.map((client) => [client.code, client.name])),
    [clients]
  );
  const staffName = React.useMemo(
    () => new Map(staff.map((member) => [member.id, member.name])),
    [staff]
  );

  const rows = React.useMemo(
    () =>
      timeEntries
        .filter((entry) => {
          // Without `Time — view all`, the sheet shows only the user's own
          // entries — a limited subcontractor never reads other people's time.
          if (!canViewAllEntries && entry.staffUserId !== currentUser.id) return false;
          const day = localDay(entry.startedAt);
          return day !== '' && day >= range.start && day <= range.end;
        })
        .sort((a, b) => b.startedAt.localeCompare(a.startedAt)),
    [timeEntries, range, canViewAllEntries, currentUser.id]
  );

  const totals = React.useMemo(
    () =>
      rows.reduce(
        (sum, entry) => {
          const minutes = Number.isFinite(entry.roundedMinutes) ? entry.roundedMinutes : 0;
          sum.total += minutes;
          if (entry.billable) sum.billable += minutes;
          else sum.nonBillable += minutes;
          return sum;
        },
        { total: 0, billable: 0, nonBillable: 0 }
      ),
    [rows]
  );

  const empty = rows.length === 0;

  return (
    <div className="space-y-4">
      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Period
            </span>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">From</span>
              <input
                data-testid="timesheet-range-start"
                type="date"
                value={range.start}
                onChange={(event) =>
                  setRange((current) => ({ ...current, start: event.target.value }))
                }
                className="h-8 rounded-lg border border-border bg-card px-2 font-mono text-[11px] tabular-nums text-foreground outline-none transition-colors focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40"
              />
            </label>
            <span className="text-[11px] text-muted-foreground">to</span>
            <label className="flex items-center gap-1.5">
              <span className="sr-only">To</span>
              <input
                data-testid="timesheet-range-end"
                type="date"
                value={range.end}
                onChange={(event) =>
                  setRange((current) => ({ ...current, end: event.target.value }))
                }
                className="h-8 rounded-lg border border-border bg-card px-2 font-mono text-[11px] tabular-nums text-foreground outline-none transition-colors focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40"
              />
            </label>
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1">
              {TIME_REPORT_PRESETS.map((preset) => {
                const presetRange = resolvePresetRange(preset.id, today);
                const active = presetRange.start === range.start && presetRange.end === range.end;
                return (
                  <button
                    key={preset.id}
                    type="button"
                    onClick={() => setRange(presetRange)}
                    className={cn(
                      'rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wide transition-colors',
                      active
                        ? 'border-[#c4161c]/30 bg-[#c4161c]/10 text-[#c4161c] dark:text-[#f87171]'
                        : 'border-border text-muted-foreground hover:bg-muted hover:text-foreground'
                    )}
                  >
                    {preset.label}
                  </button>
                );
              })}
            </div>
            <Button size="sm" onClick={openEntrySheet} data-testid="timesheet-add">
              <Plus className="h-3.5 w-3.5" />
              Log time
            </Button>
          </div>
        </div>

        {empty ? (
          <div className="p-4">
            <EmptyStateCard
              icon={Clock}
              title="No time logged in this period"
              subtitle="Adjust the dates, or add an entry to record the work against a client."
              dashed
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Date</th>
                  <th className="px-3 py-2.5 font-medium">Client</th>
                  <th className="px-3 py-2.5 font-medium">Work</th>
                  <th className="px-3 py-2.5 font-medium">Person</th>
                  <th className="px-3 py-2.5 font-medium">Service</th>
                  <th className="px-3 py-2.5 text-right font-medium">Hours</th>
                  <th className="px-3 py-2.5 font-medium">Billable</th>
                  <th className="px-4 py-2.5 text-right font-medium">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {rows.map((entry) => {
                  const day = localDay(entry.startedAt);
                  return (
                    <tr
                      key={entry.id}
                      data-testid="timesheet-row"
                      className="transition-colors hover:bg-muted/30"
                    >
                      <td className="whitespace-nowrap px-4 py-2.5">
                        <p className="tabular-nums text-foreground">{formatDate(day)}</p>
                        <p className="font-mono text-[10px] tabular-nums text-muted-foreground">
                          {timeLabel(entry.startedAt)}
                          {entry.endedAt ? `–${timeLabel(entry.endedAt)}` : ''}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p className="max-w-[12rem] truncate text-foreground">
                          {clientName.get(entry.clientCode) ?? entry.clientCode}
                        </p>
                        <p className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                          {entry.clientCode}
                        </p>
                      </td>
                      <td className="px-3 py-2.5">
                        <p
                          className="max-w-[18rem] truncate text-muted-foreground"
                          title={entry.description}
                        >
                          {entry.description || '—'}
                        </p>
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-foreground">
                        {staffName.get(entry.staffUserId) ?? entry.staffUserId}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
                        {entry.serviceCode ? SERVICE_SHORT.get(entry.serviceCode) ?? entry.serviceCode : '—'}
                      </td>
                      <td className="whitespace-nowrap px-3 py-2.5 text-right font-mono tabular-nums text-foreground">
                        {formatHours(entry.roundedMinutes)}
                      </td>
                      <td className="px-3 py-2.5">
                        <label className="inline-flex cursor-pointer items-center gap-1.5">
                          <input
                            type="checkbox"
                            data-testid="timesheet-billable"
                            checked={entry.billable}
                            onChange={(event) =>
                              updateTimeEntry(entry.id, { billable: event.target.checked })
                            }
                            aria-label={`Mark ${entry.description || 'entry'} as billable`}
                            className="h-3.5 w-3.5 accent-[#c4161c]"
                          />
                          <span
                            className={cn(
                              'font-mono text-[10px] uppercase tracking-wide',
                              entry.billable ? 'text-[#c4161c] dark:text-[#f87171]' : 'text-muted-foreground'
                            )}
                          >
                            {entry.billable ? 'Billable' : 'Non-bill'}
                          </span>
                        </label>
                      </td>
                      <td className="px-4 py-2.5 text-right">
                        <Button
                          size="sm"
                          variant="ghost"
                          data-testid="timesheet-edit"
                          onClick={() => editEntry(entry)}
                          aria-label={`Edit time entry for ${entry.clientCode}`}
                          className="gap-1.5 text-muted-foreground hover:text-foreground"
                        >
                          <Pencil className="h-3.5 w-3.5" />
                          Edit
                        </Button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-border bg-muted/30 font-mono text-[11px]">
                <tr data-testid="timesheet-totals">
                  <td className="px-4 py-2.5 uppercase tracking-wide text-muted-foreground" colSpan={5}>
                    {rows.length} {rows.length === 1 ? 'entry' : 'entries'}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">
                    {formatHours(totals.total)}
                  </td>
                  <td className="px-3 py-2.5 text-muted-foreground" colSpan={2}>
                    <span className="text-[#c4161c] dark:text-[#f87171]">
                      {formatHours(totals.billable)}
                    </span>{' '}
                    billable · {formatHours(totals.nonBillable)} non-billable
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
