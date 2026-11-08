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
  Filter,
  List,
  ShieldCheck,
  UserCheck,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DeadlinesDashboardProps {
  onSelectClient: (code: string) => void;
}

export function DeadlinesDashboard({ onSelectClient }: DeadlinesDashboardProps) {
  const [viewMode, setViewMode] = React.useState<'kanban' | 'table'>('kanban');
  const [horizon, setHorizon] = React.useState<'30' | '90' | '365'>('30');
  const [selectedStaff, setSelectedStaff] = React.useState<string>('all');
  const [selectedService, setSelectedService] = React.useState<string>('all');
  const [groupBy, setGroupBy] = React.useState<'workflow' | 'urgency'>('workflow');
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
              Statutory Deadlines Dashboard
            </h1>
            <Badge variant="crimsonSubdued" className="font-mono text-xs py-0 px-1.5 h-5">
              Practice Horizon: {horizon} Days
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Real-time compliance monitoring across South African statutory tax returns (SARS s25 TAA &amp; Companies Act s30).
          </p>
        </div>

        {/* View Mode Toggle: Kanban vs Table */}
        <div className="flex items-center gap-2 self-start md:self-center">
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-card">
            <button
              onClick={() => setViewMode('kanban')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'kanban'
                  ? 'bg-[#c4161c] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <Columns3 className="h-3.5 w-3.5" />
              <span>Kanban</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition-colors',
                viewMode === 'table'
                  ? 'bg-[#c4161c] text-white shadow-xs'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              <List className="h-3.5 w-3.5" />
              <span>Table</span>
            </button>
          </div>
        </div>

        {viewMode === 'kanban' && (
          <div className="flex items-center p-0.5 rounded-lg border border-border bg-card text-xs">
            <button
              onClick={() => setGroupBy('workflow')}
              className={cn(
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
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
                'px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors',
                groupBy === 'urgency'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              Date Urgency
            </button>
          </div>
        )}
      </div>

      {/* 4 Statutory KPI Tiles */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Overdue */}
        <div className="border border-border/80 rounded-lg p-4 bg-card/60 space-y-1">
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
        </div>

        {/* Due in 7 Days */}
        <div className="border border-border/80 rounded-lg p-4 bg-card/60 space-y-1">
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
        </div>

        {/* Due in 30 Days */}
        <div className="border border-border/80 rounded-lg p-4 bg-card/60 space-y-1">
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
        </div>

        {/* Missing a Date */}
        <div className="border border-border/80 rounded-lg p-4 bg-card/60 space-y-1">
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
        </div>
      </div>

      {/* Filter Controls Bar */}
      <div className="border border-border/80 rounded-lg p-3 bg-card/60 flex flex-col md:flex-row md:items-center justify-between gap-3 text-xs">
        {/* Horizon Toggle Chips */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground mr-1 flex items-center gap-1">
            <Filter className="h-3 w-3" /> Horizon:
          </span>
          <button
            onClick={() => setHorizon('30')}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors',
              horizon === '30'
                ? 'bg-[#c4161c] text-white'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            30 Days
          </button>
          <button
            onClick={() => setHorizon('90')}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors',
              horizon === '90'
                ? 'bg-[#c4161c] text-white'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            90 Days
          </button>
          <button
            onClick={() => setHorizon('365')}
            className={cn(
              'px-2.5 py-1 rounded text-xs font-mono font-medium transition-colors',
              horizon === '365'
                ? 'bg-[#c4161c] text-white'
                : 'bg-muted/60 text-muted-foreground hover:bg-muted hover:text-foreground'
            )}
          >
            Full Year (365d)
          </button>
        </div>

        {/* Staff & Return Dropdowns */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Staff Select */}
          <select
            value={selectedStaff}
            onChange={(e) => setSelectedStaff(e.target.value)}
            className="h-7 px-2 text-xs rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
          >
            <option value="all">All Practice Staff</option>
            {staff.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name} ({s.role})
              </option>
            ))}
          </select>

          {/* Service Select */}
          <select
            value={selectedService}
            onChange={(e) => setSelectedService(e.target.value)}
            className="h-7 px-2 text-xs rounded border border-border bg-card text-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
          >
            <option value="all">All Return Types</option>
            {availableServices.map((svc) => (
              <option key={svc} value={svc}>
                {svc}
              </option>
            ))}
          </select>

          <span className="font-mono text-[11px] text-muted-foreground ml-1">
            {filteredTasks.length} tasks
          </span>
        </div>
      </div>

      {/* Render Active View */}
      {viewMode === 'kanban' ? (
        <DeadlinesKanban
          tasks={filteredTasks}
          asOfDate={today}
          onSelectClient={onSelectClient}
          horizon={horizon}
          groupBy={groupBy}
        />
      ) : (
        <DeadlinesTable
          tasks={filteredTasks}
          onSelectClient={onSelectClient}
        />
      )}
    </div>
  );
}
