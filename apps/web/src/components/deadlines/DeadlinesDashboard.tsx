import * as React from 'react';
import type { DeadlineKpiFilter } from '@/types/navigation';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import {
  aggregatePracticeTasks,
  computePracticeKpi,
  filterPracticeTasks,
} from './practice-tasks';
import { DeadlinesKanban } from './DeadlinesKanban';
import { DeadlinesTable } from './DeadlinesTable';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  CalendarClock,
  Clock,
  Columns3,
  List,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeadlinesDashboardProps {
  onSelectClient: (code: string) => void;
  clientFilter?: string;
  /** Pre-applied assignee filter, e.g. Home's "View all" for the current user. */
  staffFilter?: string;
  /** Pre-applied KPI tile filter, e.g. Home's "Due this week" tile. */
  kpiFilter?: DeadlineKpiFilter;
  onClearClientFilter?: () => void;
}

export function DeadlinesDashboard({
  onSelectClient,
  clientFilter,
  staffFilter,
  kpiFilter,
  onClearClientFilter,
}: DeadlinesDashboardProps) {
  const [viewMode, setViewMode] = React.useState<'kanban' | 'table'>('kanban');
  const [horizon, setHorizon] = React.useState<'30' | '90' | '365'>('30');
  const [selectedStaff, setSelectedStaff] = React.useState<string>(staffFilter ?? 'all');
  const [selectedService, setSelectedService] = React.useState<string>('all');
  const [groupBy, setGroupBy] = React.useState<'workflow' | 'urgency'>('workflow');
  const [activeKpiFilter, setActiveKpiFilter] = React.useState<DeadlineKpiFilter>(
    kpiFilter ?? 'all'
  );

  // Navigation-supplied filters (Home's KPI tiles and "View all") win on
  // arrival and reset when the view is reopened without them.
  React.useEffect(() => {
    setSelectedStaff(staffFilter ?? 'all');
  }, [staffFilter]);

  React.useEffect(() => {
    setActiveKpiFilter(kpiFilter ?? 'all');
  }, [kpiFilter]);

  const today = todayInSouthAfrica();
  const { clients, staff, adhocTasks } = usePracticeStore();

  // Aggregate all tasks practice-wide
  const summary = React.useMemo(() => {
    return aggregatePracticeTasks(clients, today, staff);
  }, [clients, staff, today]);

  // Filter tasks based on controls
  const filteredTasks = React.useMemo(() => {
    return filterPracticeTasks(summary.tasks, {
      horizon,
      staffId: selectedStaff,
      serviceCode: selectedService,
      asOfDate: today,
    });
  }, [summary.tasks, horizon, selectedStaff, selectedService, today]);

  // Compute dynamic KPI metrics reacting to active horizon and filters
  const displayedKpi = React.useMemo(() => {
    return computePracticeKpi(filteredTasks, today);
  }, [filteredTasks, today]);

  const displayedTasks = React.useMemo(() => {
    let result = filteredTasks;
    if (clientFilter) {
      result = result.filter((t) => t.clientCode === clientFilter);
    }
    if (activeKpiFilter === 'all') return result;
    if (activeKpiFilter === 'overdue') return result.filter((t) => t.due && t.due < today);
    if (activeKpiFilter === 'due7')
      return result.filter(
        (t) => t.due && t.due >= today && t.daysUntilDue !== undefined && t.daysUntilDue <= 7
      );
    if (activeKpiFilter === 'due30')
      return result.filter(
        (t) => t.due && t.due >= today && t.daysUntilDue !== undefined && t.daysUntilDue <= 30
      );
    if (activeKpiFilter === 'missing') return result.filter((t) => !t.due);
    return result;
  }, [filteredTasks, clientFilter, activeKpiFilter, today]);

  // Available unique service codes
  const availableServices = React.useMemo(() => {
    return Array.from(new Set(summary.tasks.map((t) => t.service))).sort();
  }, [summary.tasks]);

  const openAdhocCount = adhocTasks.filter((t) => t.status !== 'Submitted').length;

  const kpiTiles: Array<{
    id: DeadlineKpiFilter;
    label: string;
    value: number;
    caption: string;
    icon: React.ComponentType<{ className?: string }>;
    accent: 'destructive' | 'crimson' | 'primary' | 'amber';
    empty: string;
  }> = [
    {
      id: 'overdue',
      label: 'Overdue filings',
      value: displayedKpi.overdue,
      caption: 'Requires immediate filing',
      icon: AlertTriangle,
      accent: 'destructive',
      empty: 'Zero overdue filings',
    },
    {
      id: 'due7',
      label: 'Due in 7 days',
      value: displayedKpi.due7Days,
      caption: 'Urgent SARS / CIPC obligations',
      icon: Clock,
      accent: 'crimson',
      empty: 'Nothing due this week',
    },
    {
      id: 'due30',
      label: 'Due in 30 days',
      value: displayedKpi.due30Days,
      caption: 'Current operational horizon',
      icon: ShieldCheck,
      accent: 'primary',
      empty: 'No filings in the next 30 days',
    },
    {
      id: 'missing',
      label: 'Missing a date',
      value: displayedKpi.missingDate,
      caption: 'Needs CIPC or SARS master data',
      icon: UserCheck,
      accent: 'amber',
      empty: 'Every task has a date',
    },
  ];

  const accentText: Record<string, string> = {
    destructive: 'text-destructive',
    crimson: 'text-[#c4161c] dark:text-[#f87171]',
    primary: 'text-foreground',
    amber: 'text-amber-600 dark:text-amber-400',
  };

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <PageHeader
        eyebrow="Deadlines"
        title="Deadlines"
        subtitle={`${displayedTasks.length} statutory tasks in view · ${openAdhocCount} open ad-hoc task${
          openAdhocCount === 1 ? '' : 's'
        }. Six workflow lanes from preparation through partner sign-off to SARS submission.`}
        actions={
          <div className="flex items-center gap-2">
            <div className="flex items-center rounded-lg border border-border bg-card p-0.5">
              <button
                type="button"
                onClick={() => setViewMode('table')}
                aria-pressed={viewMode === 'table'}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'table'
                    ? 'bg-[#c4161c] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <List className="h-3.5 w-3.5" />
                Table
              </button>
              <button
                type="button"
                onClick={() => setViewMode('kanban')}
                aria-pressed={viewMode === 'kanban'}
                className={cn(
                  'flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                  viewMode === 'kanban'
                    ? 'bg-[#c4161c] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                <Columns3 className="h-3.5 w-3.5" />
                Board
              </button>
            </div>

            <div
              className={cn(
                'flex items-center rounded-lg border border-border bg-card p-0.5 text-xs transition-opacity duration-150',
                viewMode === 'kanban' ? 'opacity-100' : 'pointer-events-none opacity-0'
              )}
            >
              <button
                type="button"
                onClick={() => setGroupBy('workflow')}
                className={cn(
                  'cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  groupBy === 'workflow'
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Workflow
              </button>
              <button
                type="button"
                onClick={() => setGroupBy('urgency')}
                className={cn(
                  'cursor-pointer rounded-md px-2.5 py-1 text-[11px] font-medium transition-colors',
                  groupBy === 'urgency'
                    ? 'bg-primary/10 font-semibold text-primary'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                Urgency
              </button>
            </div>
          </div>
        }
      />

      {/* Active filter badges */}
      {(activeKpiFilter !== 'all' || clientFilter) && (
        <div className="flex flex-wrap items-center gap-2">
          {activeKpiFilter !== 'all' && (
            <Badge
              variant="outline"
              className="flex h-5 items-center gap-1 border-primary/30 px-2 py-0 font-mono text-xs text-primary"
            >
              Filter: {activeKpiFilter}
              <button
                type="button"
                onClick={() => setActiveKpiFilter('all')}
                aria-label="Clear KPI filter"
                className="ml-1 cursor-pointer font-bold text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </Badge>
          )}
          {clientFilter && (
            <Badge
              variant="outline"
              className="flex h-5 items-center gap-1 border-primary/30 px-2 py-0 font-mono text-xs text-primary"
            >
              Client: {clientFilter}
              <button
                type="button"
                onClick={() => onClearClientFilter?.()}
                aria-label="Clear client filter"
                className="ml-1 cursor-pointer font-bold text-muted-foreground hover:text-foreground"
              >
                ×
              </button>
            </Badge>
          )}
        </div>
      )}

      {/* KPI tiles */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {kpiTiles.map((tile) => {
          const Icon = tile.icon;
          const active = activeKpiFilter === tile.id;
          const zero = tile.value === 0;
          return (
            <button
              key={tile.id}
              type="button"
              onClick={() => setActiveKpiFilter(active ? 'all' : tile.id)}
              aria-pressed={active}
              className={cn(
                'rounded-xl border bg-card p-4 text-left transition-all',
                active
                  ? 'border-[#c4161c] ring-2 ring-[#c4161c]/30'
                  : 'border-border hover:border-foreground/25'
              )}
            >
              <div className="flex items-start justify-between gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted-foreground">
                  {tile.label}
                </span>
                <Icon
                  className={cn(
                    'h-4 w-4',
                    zero ? 'text-muted-foreground/60' : accentText[tile.accent]
                  )}
                />
              </div>
              <div
                className={cn(
                  'mt-2 font-mono text-2xl font-semibold tracking-tight tabular-nums',
                  zero ? 'text-muted-foreground' : accentText[tile.accent]
                )}
              >
                {tile.value}
              </div>
              <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                {tile.value === 0 ? tile.empty : tile.caption}
              </p>
            </button>
          );
        })}
      </div>

      {/* Filter toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border bg-card p-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center rounded-lg border border-border bg-background p-0.5 text-xs">
            <span className="px-2 font-mono text-[10px] uppercase text-muted-foreground">
              Horizon
            </span>
            {(['30', '90', '365'] as const).map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setHorizon(h)}
                className={cn(
                  'cursor-pointer rounded-md px-2.5 py-1 font-mono text-xs transition-colors',
                  horizon === h
                    ? 'bg-[#c4161c] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {h === '365' ? 'Full year' : `${h}d`}
              </button>
            ))}
          </div>

          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            aria-label="Filter by responsible staff member"
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
          >
            <option value="all">All practice staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>

          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            aria-label="Filter by return type"
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-medium text-foreground"
          >
            <option value="all">All return types</option>
            {availableServices.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 font-mono text-[11px] text-muted-foreground">
          <CalendarClock className="h-3.5 w-3.5" />
          {displayedTasks.length} tasks
        </div>
      </div>

      {/* View content */}
      {viewMode === 'kanban' ? (
        <DeadlinesKanban
          tasks={displayedTasks}
          groupBy={groupBy}
          onSelectClient={onSelectClient}
          asOfDate={today}
        />
      ) : (
        <DeadlinesTable tasks={displayedTasks} onSelectClient={onSelectClient} />
      )}
    </div>
  );
}
