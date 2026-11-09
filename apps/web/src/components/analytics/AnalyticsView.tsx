import * as React from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  CalendarDays,
  Clock3,
  FileCheck2,
  PieChart,
  Users,
  Wallet,
} from 'lucide-react';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { PageHeader } from '@/components/ui/page-header';
import { AvatarChip, EmptyStateCard } from '@/components/ui/list-primitives';
import { relativeTime } from '@/components/home/home-logic';
import { cn } from '@/lib/utils';
import { BarList, DonutChart, LineAreaChart } from './analytics-charts';
import {
  ANALYTICS_WINDOWS,
  computeAnalytics,
  formatRange,
  resolveRanges,
  type AnalyticsWindow,
  type MetricComparison,
} from './analytics-logic';

/* ---------------------------------------------------------------------------
 * Analytics — the analytics-overview anatomy on practice metrics: a hero
 * billed-revenue card with a monthly trend, three comparison KPIs, the
 * service-group split, hours by client and the live activity trail.
 *
 * Every figure is derived from the store. A metric with no records in the
 * period shows its named empty state; its delta shows `—` when there is no
 * previous period to compare against.
 * ------------------------------------------------------------------------- */

const zarWhole = new Intl.NumberFormat('en-ZA', { maximumFractionDigits: 0 });

function formatZar(value: number): string {
  return `R ${zarWhole.format(Math.round(value))}`;
}

/** Compact form for the donut hub, where a full figure would not fit. */
function formatZarCompact(value: number): string {
  if (value >= 1_000_000) return `R ${(value / 1_000_000).toFixed(1)}m`;
  if (value >= 1_000) return `R ${(value / 1_000).toFixed(1)}k`;
  return formatZar(value);
}

function formatDelta(delta: number | null): string {
  if (delta === null) return '—';
  const rounded = Math.round(delta * 10) / 10;
  const magnitude = Number.isInteger(rounded) ? String(Math.abs(rounded)) : Math.abs(rounded).toFixed(1);
  if (rounded > 0) return `+${magnitude}%`;
  if (rounded < 0) return `-${magnitude}%`;
  return `0%`;
}

function DeltaBadge({ metric, compareLabel }: { metric: MetricComparison; compareLabel: string }) {
  const delta = metric.deltaPct;
  const empty = delta === null;
  const positive = delta !== null && delta > 0;
  const Icon = positive ? ArrowUpRight : ArrowDownRight;

  return (
    <span
      className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[11px]"
      title={`Comparison period: ${compareLabel}`}
    >
      {!empty && (
        <Icon
          className={cn('h-3.5 w-3.5', positive ? 'text-[#c4161c]' : 'text-muted-foreground')}
          aria-hidden="true"
        />
      )}
      <span
        className={cn(
          'tabular-nums',
          empty ? 'text-muted-foreground' : positive ? 'text-[#c4161c]' : 'text-foreground'
        )}
      >
        {formatDelta(delta)}
      </span>
      <span className="text-[10px] uppercase tracking-[0.1em] text-muted-foreground">vs previous</span>
    </span>
  );
}

interface KpiCardProps {
  label: string;
  metric: MetricComparison;
  unit: string;
  basis: string;
  emptyTitle: string;
  emptySubtitle: string;
  icon: React.ComponentType<{ className?: string }>;
  compareLabel: string;
}

function KpiCard({
  label,
  metric,
  unit,
  basis,
  emptyTitle,
  emptySubtitle,
  icon,
  compareLabel,
}: KpiCardProps) {
  return (
    <section className="flex flex-col gap-3 rounded-xl border border-border bg-card p-4">
      <div className="flex items-start justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{label}</h2>
        {metric.value !== null && <DeltaBadge metric={metric} compareLabel={compareLabel} />}
      </div>

      {metric.value === null ? (
        <EmptyStateCard icon={icon} title={emptyTitle} subtitle={emptySubtitle} dashed />
      ) : (
        <div className="space-y-3">
          <p className="flex items-baseline gap-1.5">
            <span className="font-mono text-2xl font-semibold leading-none tabular-nums text-foreground">
              {metric.value.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}
            </span>
            <span className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
              {unit}
            </span>
          </p>
          <p className="text-[11px] leading-relaxed text-muted-foreground">{basis}</p>
        </div>
      )}
    </section>
  );
}

export function AnalyticsView() {
  const { invoices, clients, taskStatusOverrides, timeEntries, quotes, activity } = usePracticeStore();
  const today = todayInSouthAfrica();
  const [window, setWindow] = React.useState<AnalyticsWindow>('30D');

  const { range, compare } = React.useMemo(() => resolveRanges(today, window), [today, window]);
  const analytics = React.useMemo(
    () =>
      computeAnalytics(
        { invoices, clients, taskStatusOverrides, timeEntries, quotes, activity },
        range,
        compare
      ),
    [invoices, clients, taskStatusOverrides, timeEntries, quotes, activity, range, compare]
  );

  const rangeLabel = formatRange(range);
  const compareLabel = formatRange(compare);
  const latestBucket = analytics.revenueByMonth[analytics.revenueByMonth.length - 1];

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-6 py-6">
      <PageHeader
        eyebrow="Analytics"
        title="Overview"
        subtitle="Billed revenue, client activity, filings and billable hours for the selected period, measured against the previous period of equal length."
      />

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2">
          <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-card px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-foreground">
            <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" aria-hidden="true" />
            {rangeLabel}
          </span>
          <span
            className="inline-flex items-center gap-1.5 rounded-md border border-border bg-transparent px-2.5 py-1.5 font-mono text-[11px] tabular-nums text-muted-foreground"
            title="Comparison period"
          >
            vs {compareLabel}
          </span>
        </div>

        <div
          role="group"
          aria-label="Reporting period"
          className="inline-flex items-center gap-0.5 self-start rounded-lg border border-border bg-card p-0.5 sm:self-auto"
        >
          {ANALYTICS_WINDOWS.map((preset) => {
            const active = preset.id === window;
            return (
              <button
                key={preset.id}
                type="button"
                aria-pressed={active}
                onClick={() => setWindow(preset.id)}
                className={cn(
                  'cursor-pointer rounded-md px-2.5 py-1 font-mono text-[11px] font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#c4161c]',
                  active
                    ? 'bg-foreground text-background'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {preset.label}
              </button>
            );
          })}
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-2 border-b border-border px-5 py-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0">
            <h2 className="text-sm font-semibold text-foreground">Billed revenue</h2>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              ZAR · invoices sent or paid, issued in the period
            </p>
          </div>
          {analytics.revenue.value !== null && (
            <DeltaBadge metric={analytics.revenue} compareLabel={compareLabel} />
          )}
        </div>

        <div className="space-y-4 px-5 py-5">
          {analytics.revenue.value === null ? (
            <EmptyStateCard
              icon={Wallet}
              title="No revenue recorded this period"
              subtitle={`Sent or paid invoices issued between ${rangeLabel} will appear here.`}
              dashed
            />
          ) : (
            <>
              <div className="flex flex-wrap items-end justify-between gap-3">
                <p className="font-mono text-3xl font-semibold leading-none tabular-nums tracking-tight text-foreground">
                  {formatZar(analytics.revenue.value)}
                </p>
                {analytics.revenueByMonth.length > 1 && latestBucket && (
                  <span className="rounded-md border border-border bg-muted/40 px-2 py-1 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {latestBucket.label} · {formatZar(latestBucket.value)}
                  </span>
                )}
              </div>
              <LineAreaChart data={analytics.revenueByMonth} />
            </>
          )}
        </div>
      </section>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <KpiCard
          label="Active clients"
          metric={analytics.activeClients}
          unit="clients"
          basis="Distinct clients with an invoice, logged time or a signed quote in the period."
          emptyTitle="No client activity this period"
          emptySubtitle={`Invoices, time entries and signed quotes between ${rangeLabel} count here.`}
          icon={Users}
          compareLabel={compareLabel}
        />
        <KpiCard
          label="Filings submitted"
          metric={analytics.filingsSubmitted}
          unit="returns"
          basis="Returns marked submitted in the period, from the practice task trail."
          emptyTitle="No returns submitted this period"
          emptySubtitle={`Submissions dated between ${rangeLabel} count here.`}
          icon={FileCheck2}
          compareLabel={compareLabel}
        />
        <KpiCard
          label="Billable hours"
          metric={analytics.billableHours}
          unit="hours"
          basis="Rounded billable time entries started in the period."
          emptyTitle="No billable time recorded this period"
          emptySubtitle={`Time entries logged between ${rangeLabel} appear here.`}
          icon={Clock3}
          compareLabel={compareLabel}
        />
      </div>

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Revenue by service group</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              VAT incl.
            </span>
          </div>
          {analytics.revenueByGroup.length === 0 ? (
            <EmptyStateCard
              icon={PieChart}
              title="No revenue to split this period"
              subtitle="Invoice lines carry a Xero account code; the split appears once invoices are sent."
              dashed
            />
          ) : (
            <DonutChart
              slices={analytics.revenueByGroup.map((group) => ({
                label: group.label,
                pct: group.pct,
                detail: formatZar(group.zar),
              }))}
              centerValue={formatZarCompact(
                analytics.revenueByGroup.reduce((sum, group) => sum + group.zar, 0)
              )}
              centerLabel="Billed"
            />
          )}
        </section>

        <section className="rounded-xl border border-border bg-card p-5 lg:col-span-6">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-sm font-semibold text-foreground">Hours by client</h2>
            <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
              Top 5 · rounded
            </span>
          </div>
          {analytics.hoursByClient.length === 0 ? (
            <EmptyStateCard
              icon={Clock3}
              title="No time logged this period"
              subtitle={`Time entries started between ${rangeLabel} are grouped by client here.`}
              dashed
            />
          ) : (
            <BarList
              items={analytics.hoursByClient.map((client) => ({
                label: client.label,
                value: client.hours,
                detail: `${client.hours} h`,
              }))}
              formatValue={(value) => `${value} h`}
            />
          )}
        </section>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
          <h2 className="text-sm font-semibold text-foreground">Recent activity</h2>
          <span className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
            Latest
          </span>
        </div>
        {analytics.activity.length === 0 ? (
          <div className="p-4">
            <EmptyStateCard
              icon={Activity}
              title="No practice activity yet"
              subtitle="Status changes, submissions, quotes and time entries appear here as they happen."
              dashed
            />
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {analytics.activity.map((event) => (
              <li key={event.id} className="flex items-start gap-3 px-4 py-3">
                <AvatarChip initials={event.actorInitials} tint={event.tint} />
                <div className="min-w-0 flex-1">
                  <p className="text-[13px] leading-snug text-foreground">
                    <span className="font-medium">{event.actorName}</span>{' '}
                    <span className="text-muted-foreground">{event.text}</span>
                  </p>
                  <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
                    {event.subline}
                  </p>
                </div>
                <time
                  dateTime={event.at}
                  className="shrink-0 font-mono text-[10px] tabular-nums text-muted-foreground"
                >
                  {relativeTime(event.at, today)}
                </time>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
