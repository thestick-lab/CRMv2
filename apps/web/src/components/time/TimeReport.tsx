import * as React from 'react';
import { formatDate, todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { SERVICE_TYPES } from 'fdoncall-practice/domain/catalogue';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { formatHours } from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { EmptyStateCard } from '@/components/ui/list-primitives';
import { BarList, DonutChart } from '@/components/analytics/analytics-charts';
import { cn } from '@/lib/utils';
import { Clock, Hourglass, PieChart, SlidersHorizontal, Users } from 'lucide-react';
import {
  buildTimeReport,
  resolvePresetRange,
  TIME_REPORT_PRESETS,
  type PersonTaskRow,
  type TimeReportFilters,
  type TimeReportRange,
} from './time-report-logic';

/* ---------------------------------------------------------------------------
 * Report tab — the time-tracking-report anatomy.
 *
 * A period and three filters feed one derivation; every KPI, bar and grouped
 * row is summed from the same rounded entry minutes, so the columns reconcile
 * by construction. A period with no entries shows named empty states and `—`
 * KPIs: the practice must never read a fabricated 0h as a real total.
 * ------------------------------------------------------------------------- */

const SERVICE_SHORT = new Map(SERVICE_TYPES.map((service) => [service.code, service.short]));

function rangeLabel(range: TimeReportRange): string {
  const start = range.start ? formatDate(range.start) : 'the start';
  const end = range.end ? formatDate(range.end) : 'today';
  return `${start} – ${end}`;
}

interface FilterOption {
  value: string;
  label: string;
}

interface ReportKpiProps {
  testId: string;
  label: string;
  value: string | null;
  basis: string;
  emptyCopy: string;
  icon: React.ComponentType<{ className?: string }>;
  accent?: boolean;
}

function ReportKpi({ testId, label, value, basis, emptyCopy, icon: Icon, accent }: ReportKpiProps) {
  return (
    <section
      data-testid={testId}
      className="flex flex-col gap-2 rounded-xl border border-border bg-card p-4"
    >
      <div className="flex items-start justify-between gap-2">
        <h3 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          {label}
        </h3>
        <Icon className={cn('h-3.5 w-3.5', accent ? 'text-[#c4161c]' : 'text-muted-foreground')} />
      </div>
      <p
        className={cn(
          'font-mono text-2xl font-semibold leading-none tabular-nums tracking-tight',
          value === null ? 'text-muted-foreground' : 'text-foreground'
        )}
      >
        {value ?? '—'}
      </p>
      <p className="text-[11px] leading-relaxed text-muted-foreground">
        {value === null ? emptyCopy : basis}
      </p>
    </section>
  );
}

interface FilterSelectProps {
  testId: string;
  label: string;
  value: string;
  options: FilterOption[];
  onChange: (value: string) => void;
}

function FilterSelect({ testId, label, value, options, onChange }: FilterSelectProps) {
  return (
    <label className="flex min-w-0 flex-col gap-1">
      <span className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        {label}
      </span>
      <select
        data-testid={testId}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-8 w-full rounded-lg border border-border bg-card px-2 font-mono text-[11px] text-foreground outline-none transition-colors focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40"
      >
        <option value="">All</option>
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

export function TimeReport() {
  const { timeEntries, clients, staff } = usePracticeStore();
  const today = todayInSouthAfrica();
  const defaultRange = React.useMemo(() => resolvePresetRange('this-month', today), [today]);

  const [draftRange, setDraftRange] = React.useState<TimeReportRange>(defaultRange);
  const [draftFilters, setDraftFilters] = React.useState<TimeReportFilters>({});
  const [appliedRange, setAppliedRange] = React.useState<TimeReportRange>(defaultRange);
  const [appliedFilters, setAppliedFilters] = React.useState<TimeReportFilters>({});
  const [collapsed, setCollapsed] = React.useState<ReadonlySet<string>>(new Set());

  const clientNames = React.useMemo(
    () => new Map(clients.map((client) => [client.code, client.name])),
    [clients]
  );
  const staffNames = React.useMemo(
    () => new Map(staff.map((member) => [member.id, member.name])),
    [staff]
  );

  // Filter options come from the whole trail so narrowing one filter never
  // removes the value currently chosen in another.
  const clientOptions = React.useMemo(
    () =>
      [...new Set(timeEntries.map((entry) => entry.clientCode))]
        .sort()
        .map((code) => ({ value: code, label: `${clientNames.get(code) ?? code} · ${code}` })),
    [timeEntries, clientNames]
  );
  const staffOptions = React.useMemo(
    () =>
      [...new Set(timeEntries.map((entry) => entry.staffUserId))]
        .sort()
        .map((id) => ({ value: id, label: staffNames.get(id) ?? id })),
    [timeEntries, staffNames]
  );
  const serviceOptions = React.useMemo(() => {
    const codes = new Set<NonNullable<(typeof timeEntries)[number]['serviceCode']>>();
    for (const entry of timeEntries) {
      if (entry.serviceCode) codes.add(entry.serviceCode);
    }
    return [...codes].sort().map((code) => ({
      value: code,
      label: SERVICE_SHORT.get(code) ?? code,
    }));
  }, [timeEntries]);

  const report = React.useMemo(
    () => buildTimeReport(timeEntries, appliedRange, appliedFilters),
    [timeEntries, appliedRange, appliedFilters]
  );

  const groups = React.useMemo(() => {
    const grouped = new Map<string, PersonTaskRow[]>();
    for (const row of report.byPersonTask) {
      const rows = grouped.get(row.clientCode) ?? [];
      rows.push(row);
      grouped.set(row.clientCode, rows);
    }
    return [...grouped.entries()]
      .map(([clientCode, rows]) => ({
        clientCode,
        rows,
        billable: rows.reduce((sum, row) => sum + row.billable, 0),
        nonBillable: rows.reduce((sum, row) => sum + row.nonBillable, 0),
        total: rows.reduce((sum, row) => sum + row.total, 0),
      }))
      .sort((a, b) => b.total - a.total || a.clientCode.localeCompare(b.clientCode));
  }, [report.byPersonTask]);

  // Narrowing on `total` narrows the whole KPI object: a non-empty period
  // carries numbers, so the populated branch needs no zero fallbacks.
  const kpis = report.kpis;
  const empty = kpis.total === null;
  const label = rangeLabel(appliedRange);

  const toggleGroup = (clientCode: string) => {
    setCollapsed((current) => {
      const next = new Set(current);
      if (next.has(clientCode)) next.delete(clientCode);
      else next.add(clientCode);
      return next;
    });
  };

  const apply = () => {
    setAppliedRange(draftRange);
    setAppliedFilters(draftFilters);
  };

  const clear = () => {
    setDraftRange(defaultRange);
    setDraftFilters({});
    setAppliedRange(defaultRange);
    setAppliedFilters({});
    setCollapsed(new Set());
  };

  const billablePct = kpis.billablePct;
  const splitSlices =
    report.billableSplit.billable !== null && report.billableSplit.nonBillable !== null && billablePct !== null
      ? [
          {
            label: 'Billable',
            pct: billablePct,
            detail: formatHours(report.billableSplit.billable),
          },
          {
            label: 'Non-billable',
            pct: Math.max(0, Math.round((100 - billablePct) * 10) / 10),
            detail: formatHours(report.billableSplit.nonBillable),
          },
        ]
      : [];

  return (
    <div className="space-y-5">
      {/* Filters -------------------------------------------------------- */}
      <section className="rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Range
            </span>
            <input
              data-testid="report-range-start"
              type="date"
              value={draftRange.start}
              onChange={(event) =>
                setDraftRange((current) => ({ ...current, start: event.target.value }))
              }
              className="h-8 rounded-lg border border-border bg-card px-2 font-mono text-[11px] tabular-nums text-foreground outline-none transition-colors focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40"
            />
            <span className="text-[11px] text-muted-foreground">to</span>
            <input
              data-testid="report-range-end"
              type="date"
              value={draftRange.end}
              onChange={(event) =>
                setDraftRange((current) => ({ ...current, end: event.target.value }))
              }
              className="h-8 rounded-lg border border-border bg-card px-2 font-mono text-[11px] tabular-nums text-foreground outline-none transition-colors focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40"
            />
          </div>

          <div className="flex flex-wrap items-center gap-1">
            {TIME_REPORT_PRESETS.map((preset) => {
              const presetRange = resolvePresetRange(preset.id, today);
              const active =
                presetRange.start === draftRange.start && presetRange.end === draftRange.end;
              return (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => setDraftRange(presetRange)}
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
        </div>

        <div className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="grid flex-1 grid-cols-1 gap-3 sm:grid-cols-3">
            <FilterSelect
              testId="report-filter-client"
              label="Project"
              value={draftFilters.client ?? ''}
              options={clientOptions}
              onChange={(client) =>
                setDraftFilters((current) => ({ ...current, client: client || undefined }))
              }
            />
            <FilterSelect
              testId="report-filter-staff"
              label="Person"
              value={draftFilters.staff ?? ''}
              options={staffOptions}
              onChange={(staffId) =>
                setDraftFilters((current) => ({ ...current, staff: staffId || undefined }))
              }
            />
            <FilterSelect
              testId="report-filter-service"
              label="Task"
              value={draftFilters.service ?? ''}
              options={serviceOptions}
              onChange={(service) =>
                setDraftFilters((current) => ({ ...current, service: service || undefined }))
              }
            />
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" data-testid="report-clear" onClick={clear}>
              Clear
            </Button>
            <Button size="sm" data-testid="report-apply" onClick={apply}>
              <SlidersHorizontal className="h-3.5 w-3.5" />
              Apply
            </Button>
          </div>
        </div>
      </section>

      {/* KPI strip ------------------------------------------------------ */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <ReportKpi
          testId="report-kpi-total"
          label="Total (rounded)"
          value={empty ? null : formatHours(kpis.total)}
          basis={`${report.entryCount} ${report.entryCount === 1 ? 'entry' : 'entries'} in ${label}.`}
          emptyCopy={`No time entries between ${label}.`}
          icon={Hourglass}
        />
        <ReportKpi
          testId="report-kpi-billable"
          label="Billable"
          value={empty ? null : formatHours(kpis.billable)}
          basis="Rounded time flagged billable on each entry."
          emptyCopy="Nothing billable logged in this range."
          icon={Clock}
          accent
        />
        <ReportKpi
          testId="report-kpi-nonbillable"
          label="Non-billable"
          value={empty ? null : formatHours(kpis.nonBillable)}
          basis="Training, admin and write-offs logged against clients."
          emptyCopy="No non-billable time in this range."
          icon={Users}
        />
        <ReportKpi
          testId="report-kpi-billable-pct"
          label="Billable %"
          value={billablePct === null ? null : `${billablePct}%`}
          basis="Billable rounded hours ÷ total rounded hours."
          emptyCopy="No billable share without entries."
          icon={PieChart}
        />
      </div>

      {/* Grouped reconciliation table ---------------------------------- */}
      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Time by project</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Rounded · reconciles to entries
          </span>
        </div>

        {empty ? (
          <div className="p-4">
            <EmptyStateCard
              icon={Clock}
              title="No time recorded this period"
              subtitle={`Entries started between ${label} will appear grouped by client, person and task.`}
              dashed
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium">Project / person · task</th>
                  <th className="px-3 py-2.5 text-right font-medium">Billable</th>
                  <th className="px-3 py-2.5 text-right font-medium">Non-billable</th>
                  <th className="px-4 py-2.5 text-right font-medium">Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups.map((group) => {
                  const isCollapsed = collapsed.has(group.clientCode);
                  return (
                    <React.Fragment key={group.clientCode}>
                      <tr
                        data-testid="report-group"
                        data-client={group.clientCode}
                        className="bg-muted/20"
                      >
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            data-testid="report-group-toggle"
                            aria-expanded={!isCollapsed}
                            onClick={() => toggleGroup(group.clientCode)}
                            className="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left outline-none transition-colors hover:bg-muted/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                          >
                            <span
                              aria-hidden="true"
                              className={cn(
                                'font-mono text-[10px] text-muted-foreground transition-transform',
                                isCollapsed ? '' : 'rotate-90'
                              )}
                            >
                              ▶
                            </span>
                            <span className="text-foreground">
                              {clientNames.get(group.clientCode) ?? group.clientCode}
                            </span>
                            <span className="font-mono text-[10px] uppercase tracking-wide text-muted-foreground">
                              {group.clientCode}
                            </span>
                            <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">
                              {group.rows.length} {group.rows.length === 1 ? 'row' : 'rows'}
                            </span>
                          </button>
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-foreground">
                          {formatHours(group.billable)}
                        </td>
                        <td className="px-3 py-2 text-right font-mono font-semibold tabular-nums text-foreground">
                          {formatHours(group.nonBillable)}
                        </td>
                        <td className="px-4 py-2 text-right font-mono font-semibold tabular-nums text-foreground">
                          {formatHours(group.total)}
                        </td>
                      </tr>
                      {!isCollapsed &&
                        group.rows.map((row) => (
                          <tr key={row.key} data-testid="report-person-task" className="hover:bg-muted/20">
                            <td className="py-2 pl-10 pr-3 text-muted-foreground">
                              <span className="text-foreground">
                                {staffNames.get(row.staffUserId) ?? row.staffUserId}
                              </span>
                              <span className="mx-1.5 text-muted-foreground/60">·</span>
                              <span className="font-mono text-[11px] uppercase tracking-wide">
                                {row.taskLabel}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                              {formatHours(row.billable)}
                            </td>
                            <td className="px-3 py-2 text-right font-mono tabular-nums text-muted-foreground">
                              {formatHours(row.nonBillable)}
                            </td>
                            <td className="px-4 py-2 text-right font-mono tabular-nums text-foreground">
                              {formatHours(row.total)}
                            </td>
                          </tr>
                        ))}
                    </React.Fragment>
                  );
                })}
              </tbody>
              <tfoot className="border-t border-border bg-muted/30 font-mono text-[11px]">
                <tr data-testid="report-totals">
                  <td className="px-4 py-2.5 uppercase tracking-wide text-muted-foreground">Total</td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">
                    {formatHours(kpis.billable)}
                  </td>
                  <td className="px-3 py-2.5 text-right font-semibold tabular-nums text-foreground">
                    {formatHours(kpis.nonBillable)}
                  </td>
                  <td className="px-4 py-2.5 text-right font-semibold tabular-nums text-foreground">
                    {formatHours(kpis.total)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}
      </section>

      {/* Charts + rounding rules --------------------------------------- */}
      <div className="grid grid-cols-1 items-stretch gap-4 lg:grid-cols-12">
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-5">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Time by client</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Rounded
            </span>
          </div>
          {report.byClient.length === 0 ? (
            <EmptyStateCard
              icon={Users}
              title="No client time this period"
              subtitle="Client bars appear once entries fall in the reported range."
              dashed
            />
          ) : (
            <BarList
              items={report.byClient.map((row) => ({
                label: clientNames.get(row.clientCode) ?? row.clientCode,
                value: row.total,
                detail: formatHours(row.total),
              }))}
              formatValue={formatHours}
            />
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Billable vs non-billable</h2>
          </div>
          {empty ? (
            <EmptyStateCard
              icon={PieChart}
              title="No split to show"
              subtitle="The billable mix appears once entries exist for the range."
              dashed
            />
          ) : (
            <DonutChart
              slices={splitSlices}
              centerValue={formatHours(kpis.total)}
              centerLabel="Total"
            />
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-3">
          <h2 className="mb-3 text-sm font-semibold text-foreground">Rounding rules</h2>
          <ul className="space-y-2.5 text-[11px] leading-relaxed text-muted-foreground">
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c4161c]" />
              <span>
                Round entries to <span className="font-mono text-foreground">0.25h</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c4161c]" />
              <span>
                Minimum entry <span className="font-mono text-foreground">0.25h</span>
              </span>
            </li>
            <li className="flex items-start gap-2">
              <span aria-hidden="true" className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-[#c4161c]" />
              <span>
                Apply rounding <span className="font-mono text-foreground">Per entry</span>
              </span>
            </li>
          </ul>
          <p className="mt-3 border-t border-border pt-3 text-[10px] leading-relaxed text-muted-foreground/80">
            Half-up to the nearest quarter hour; a stopped timer still bills the 15 minute floor.
          </p>
        </section>
      </div>
    </div>
  );
}
