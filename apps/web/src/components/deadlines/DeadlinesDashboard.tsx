import * as React from 'react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import {
  aggregatePracticeTasks,
  computePracticeKpi,
  filterPracticeTasks,
} from './practice-tasks';
import { DeadlinesKanban } from './DeadlinesKanban';
import { DeadlinesTable } from './DeadlinesTable';
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
  onClearClientFilter?: () => void;
}

export function DeadlinesDashboard({ onSelectClient, clientFilter, onClearClientFilter }: DeadlinesDashboardProps) {
  const [viewMode, setViewMode] = React.useState<'kanban' | 'table'>('table');
  const [horizon, setHorizon] = React.useState<'30' | '90' | '365'>('30');
  const [selectedStaff, setSelectedStaff] = React.useState<string>('all');
  const [selectedService, setSelectedService] = React.useState<string>('all');
  const [groupBy, setGroupBy] = React.useState<'workflow' | 'urgency'>('workflow');
  const [activeKpiFilter, setActiveKpiFilter] = React.useState<'all' | 'overdue' | 'due7' | 'due30' | 'missing'>('all');
  const today = todayInSouthAfrica();
  const { clients, staff } = usePracticeStore();

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
      return result.filter((t) => t.due && t.due >= today && t.daysUntilDue !== undefined && t.daysUntilDue <= 7);
    if (activeKpiFilter === 'due30')
      return result.filter((t) => t.due && t.due >= today && t.daysUntilDue !== undefined && t.daysUntilDue <= 30);
    if (activeKpiFilter === 'missing') return result.filter((t) => !t.due);
    return result;
  }, [filteredTasks, clientFilter, activeKpiFilter, today]);

  // Available unique service codes
  const availableServices = React.useMemo(() => {
    return Array.from(new Set(summary.tasks.map((t) => t.service))).sort();
  }, [summary.tasks]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header & View Mode Switcher */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <CalendarClock className="h-5 w-5 text-[#c4161c]" />
              Deadlines
            </h1>
            {activeKpiFilter !== 'all' && (
              <Badge variant="outline" className="font-mono text-xs py-0 px-2 h-5 text-primary border-primary/30 flex items-center gap-1">
                <span>Filter: {activeKpiFilter}</span>
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); setActiveKpiFilter('all'); }}
                  className="cursor-pointer font-bold text-muted-foreground hover:text-foreground ml-1"
                >
                  ×
                </button>
              </Badge>
            )}
            {clientFilter && (
              <Badge variant="outline" className="font-mono text-xs py-0 px-2 h-5 text-primary border-primary/30 flex items-center gap-1">
                <span>Client: {clientFilter}</span>
                <button
                  type="button"
                  onClick={() => onClearClientFilter?.()}
                  className="cursor-pointer font-bold text-muted-foreground hover:text-foreground ml-1"
                >
                  ×
                </button>
              </Badge>
            )}
          </div>
        </div>

        {/* Right Controls Container */}
        {/* Right Controls Container - both groups always mounted to prevent toggle jumping */}
        <div className="flex items-center gap-2 self-start md:self-center shrink-0">
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-card">
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                viewMode === 'table'
                  ? 'bg-[#c4161c] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer',
                viewMode === 'kanban'
                  ? 'bg-[#c4161c] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
          </div>

          <div
            className={cn(
              'flex items-center p-0.5 rounded-lg border border-border bg-card text-xs transition-opacity duration-150',
              viewMode === 'kanban' ? 'opacity-100' : 'opacity-0 pointer-events-none'
            )}
          >
            <button
              onClick={() => setGroupBy('workflow')}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                groupBy === 'workflow'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Workflow Status
            </button>
            <button
              onClick={() => setGroupBy('urgency')}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer',
                groupBy === 'urgency'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Date Urgency
            </button>
          </div>
        </div>
      </div>

      {/* 4 Statutory KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Overdue */}
        <button
          type="button"
          onClick={() => setActiveKpiFilter(activeKpiFilter === 'overdue' ? 'all' : 'overdue')}
          className={cn(
            'text-left border rounded-lg p-4 bg-card/60 space-y-1 transition-all cursor-pointer',
            activeKpiFilter === 'overdue' ? 'ring-2 ring-destructive border-destructive' : 'border-border/80 hover:border-destructive/60'
          )}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Overdue Filings</span>
            <AlertTriangle className={cn('h-4 w-4', displayedKpi.overdue > 0 ? 'text-destructive' : 'text-muted-foreground')} />
          </div>
          <div className={cn('text-2xl font-bold font-mono tracking-tight', displayedKpi.overdue > 0 ? 'text-destructive' : 'text-emerald-500')}>
            {displayedKpi.overdue}
          </div>
          <div className="text-[11px] text-muted-foreground">
            {displayedKpi.overdue === 0 ? 'Zero overdue filings' : 'Requires immediate filing'}
          </div>
        </button>

        {/* Due in 7 Days */}
        <button
          type="button"
          onClick={() => setActiveKpiFilter(activeKpiFilter === 'due7' ? 'all' : 'due7')}
          className={cn(
            'text-left border rounded-lg p-4 bg-card/60 space-y-1 transition-all cursor-pointer',
            activeKpiFilter === 'due7' ? 'ring-2 ring-[#c4161c] border-[#c4161c]' : 'border-border/80 hover:border-[#c4161c]/60'
          )}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-[#c4161c] flex items-center justify-between">
            <span>Due in 7 Days</span>
            <Clock className="h-4 w-4 text-[#c4161c]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-[#c4161c] dark:text-[#f87171]">
            {displayedKpi.due7Days}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Urgent SARS / CIPC obligations
          </div>
        </button>

        {/* Due in 30 Days */}
        <button
          type="button"
          onClick={() => setActiveKpiFilter(activeKpiFilter === 'due30' ? 'all' : 'due30')}
          className={cn(
            'text-left border rounded-lg p-4 bg-card/60 space-y-1 transition-all cursor-pointer',
            activeKpiFilter === 'due30' ? 'ring-2 ring-primary border-primary' : 'border-border/80 hover:border-primary/60'
          )}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Due in 30 Days</span>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {displayedKpi.due30Days}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Current operational horizon
          </div>
        </button>

        {/* Missing a Date */}
        <button
          type="button"
          onClick={() => setActiveKpiFilter(activeKpiFilter === 'missing' ? 'all' : 'missing')}
          className={cn(
            'text-left border rounded-lg p-4 bg-card/60 space-y-1 transition-all cursor-pointer',
            activeKpiFilter === 'missing' ? 'ring-2 ring-amber-500 border-amber-500' : 'border-border/80 hover:border-amber-500/60'
          )}
        >
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Missing A Date (Blockers)</span>
            <UserCheck className="h-4 w-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-amber-500">
            {displayedKpi.missingDate}
          </div>
          <div className="text-[11px] text-muted-foreground">
            Needs CIPC or SARS transfer
          </div>
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-3 rounded-xl border border-border bg-card/60 shadow-xs">
        <div className="flex flex-wrap items-center gap-2">
          {/* Horizon Toggle */}
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-background text-xs">
            <span className="px-2 text-[10px] font-mono uppercase text-muted-foreground">Horizon:</span>
            {(['30', '90', '365'] as const).map((h) => (
              <button
                key={h}
                onClick={() => setHorizon(h)}
                className={cn(
                  'px-2.5 py-1 rounded-md text-xs font-mono transition-colors cursor-pointer',
                  horizon === h
                    ? 'bg-[#c4161c] text-white shadow-xs'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {h === '365' ? 'Full Year (365d)' : `${h} Days`}
              </button>
            ))}
          </div>

          {/* Staff Filter */}
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground font-medium"
          >
            <option value="all">All Practice Staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>

          {/* Return Type Filter */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="px-2.5 py-1.5 rounded-lg border border-border bg-background text-xs text-foreground font-medium"
          >
            <option value="all">All Return Types</option>
            {availableServices.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>
        </div>

        <div className="text-xs font-mono text-muted-foreground">
          {displayedTasks.length} tasks
        </div>
      </div>

      {/* View Content: Kanban vs Table */}
      {viewMode === 'kanban' ? (
        <DeadlinesKanban
          tasks={displayedTasks}
          groupBy={groupBy}
          onSelectClient={onSelectClient}
          asOfDate={today}
        />
      ) : (
        <DeadlinesTable
          tasks={displayedTasks}
          onSelectClient={onSelectClient}
        />
      )}
    </div>
  );
}
