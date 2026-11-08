import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { todayInSouthAfrica, publicHolidays } from 'fdoncall-practice/domain/dates';
import { usePracticeStore, type PracticeUser } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { aggregatePracticeTasks, type PracticeTaskItem } from '@/components/deadlines/practice-tasks';
import { filterReviewQueueTasks } from '@/components/inbox/PartnerReviewQueue';
import {
  CalendarClock,
  ShieldCheck,
  UserCheck,
  CheckCircle2,
  Calendar,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DashboardViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function getUpcomingHolidays(today: string, count = 4): Array<[string, string]> {
  const year = parseInt(today.slice(0, 4), 10);
  const holsMap = new Map<string, string>();
  for (const [d, name] of publicHolidays(year)) {
    holsMap.set(d, name);
  }
  for (const [d, name] of publicHolidays(year + 1)) {
    holsMap.set(d, name);
  }
  const sortedDates = Array.from(holsMap.keys()).sort();
  const futureDates = sortedDates.filter((d) => d >= today);
  return futureDates.slice(0, count).map((d) => [d, holsMap.get(d)!]);
}

export function getUserDashboardQueue(
  tasks: PracticeTaskItem[],
  currentUser: PracticeUser,
  overrides: Record<string, { status: string; partnerSignOff?: boolean }>
) {
  const isPartner = currentUser.role === 'Partner';
  const reviewItems = isPartner ? filterReviewQueueTasks(tasks, overrides) : [];

  const myAssignedTasks = tasks.filter((t) => t.staffId === currentUser.id);
  const targetPool = isPartner ? tasks : myAssignedTasks.length > 0 ? myAssignedTasks : tasks;

  const today = todayInSouthAfrica();
  const overdue = targetPool.filter((t) => {
    const st = overrides[t.id]?.status || t.status;
    return st !== 'Submitted' && t.due && t.due < today;
  });

  const dueSoon = targetPool.filter((t) => {
    const st = overrides[t.id]?.status || t.status;
    return st !== 'Submitted' && t.due && t.due >= today && t.daysUntilDue !== undefined && t.daysUntilDue <= 7;
  });

  return { reviewItems, overdue, dueSoon, targetPool };
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const { clients, staff, leads, currentUser, taskStatusOverrides } = usePracticeStore();
  const today = todayInSouthAfrica();
  const upcomingHolidays = React.useMemo(() => getUpcomingHolidays(today, 4), [today]);

  const summary = React.useMemo(() => {
    return aggregatePracticeTasks(clients, today, staff);
  }, [clients, today, staff]);

  const queue = React.useMemo(() => {
    return getUserDashboardQueue(summary.tasks, currentUser, taskStatusOverrides);
  }, [summary.tasks, currentUser, taskStatusOverrides]);

  const isPartner = currentUser.role === 'Partner';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Personalized Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-border/70">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight">
            Welcome back, {currentUser.name}
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            {currentUser.role} • FD on Call Practice Operating System
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isPartner && queue.reviewItems.length > 0 && (
            <Button
              size="sm"
              onClick={() => onNavigate('inbox')}
              className="bg-[#c4161c] hover:bg-[#a51217] text-white text-xs h-8 gap-1.5 cursor-pointer"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              <span>{queue.reviewItems.length} Returns Awaiting Partner Sign-Off</span>
            </Button>
          )}
          <Button
            size="sm"
            onClick={() => onNavigate('deadlines')}
            variant="outline"
            className="text-xs h-8 gap-1.5 cursor-pointer"
          >
            <CalendarClock className="h-3.5 w-3.5 text-[#c4161c]" />
            <span>View Deadlines</span>
          </Button>
        </div>
      </div>

      {/* 3 Operational KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Card 1: Action Queue */}
        <div className="border border-border/80 rounded-xl p-4 bg-card/60 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-medium">
              {isPartner ? 'Partner Review Queue' : 'My Assigned Filings'}
            </span>
            <UserCheck className="h-4 w-4 text-[#c4161c]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            {isPartner ? `${queue.reviewItems.length} Pending` : `${queue.targetPool.length} Active`}
          </div>
          <p className="text-xs text-muted-foreground">
            {isPartner ? 'High-risk returns requiring CA(SA) sign-off' : 'Assigned compliance obligations in horizon'}
          </p>
        </div>

        {/* Card 2: Urgent & Overdue */}
        <div className="border border-border/80 rounded-xl p-4 bg-card/60 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-medium">
              Urgent &amp; Overdue Filings
            </span>
            <AlertTriangle className={cn('h-4 w-4', queue.overdue.length > 0 ? 'text-destructive' : 'text-emerald-500')} />
          </div>
          <div className={cn('text-2xl font-bold font-mono tracking-tight', queue.overdue.length > 0 ? 'text-destructive' : 'text-emerald-500')}>
            {queue.overdue.length} Overdue · {queue.dueSoon.length} Due in 7d
          </div>
          <p className="text-xs text-muted-foreground">
            Immediate SARS &amp; CIPC filing priority
          </p>
        </div>

        {/* Card 3: Upcoming SA Holidays */}
        <div className="border border-border/80 rounded-xl p-4 bg-card/60 space-y-2 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-medium">
              Upcoming SA Holidays (from {today})
            </span>
            <Calendar className="h-4 w-4 text-[#c4161c]" />
          </div>
          <div className="space-y-1 font-mono text-[11px] pt-0.5">
            {upcomingHolidays.map(([d, name]) => (
              <div key={d} className="flex justify-between truncate">
                <span className="text-foreground truncate pr-2">{name}:</span>
                <span className="text-muted-foreground">{d}</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Operational Panels */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Panel: Actionable Queue */}
        <div className="lg:col-span-7 space-y-4">
          <div className="border border-border/80 rounded-xl bg-card/60 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <CalendarClock className="h-4 w-4 text-[#c4161c]" />
                <h2 className="text-sm font-semibold text-foreground">
                  {isPartner ? 'Returns Awaiting Partner Sign-Off' : 'My Priority Tasks'}
                </h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate(isPartner ? 'inbox' : 'deadlines')}
                className="text-xs h-7 gap-1"
              >
                View all <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="divide-y divide-border/60">
              {isPartner && queue.reviewItems.length === 0 && queue.overdue.length === 0 ? (
                <div className="p-8 text-center text-xs text-muted-foreground italic flex flex-col items-center gap-2">
                  <CheckCircle2 className="h-6 w-6 text-emerald-500" />
                  <span>All review queues are cleared. Excellent work!</span>
                </div>
              ) : (
                (isPartner ? queue.reviewItems : [...queue.overdue, ...queue.dueSoon]).slice(0, 5).map((t) => (
                  <div
                    key={t.id}
                    onClick={() => onNavigate('client', t.clientCode)}
                    className="p-3.5 hover:bg-muted/30 transition-colors flex items-center justify-between gap-3 cursor-pointer"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-semibold text-[#c4161c] text-xs">
                          {t.clientCode}
                        </span>
                        <span className="text-foreground font-medium text-xs truncate">
                          {t.clientName}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-muted-foreground font-mono">
                        <Badge variant="outline" className="text-[10px] py-0 px-1">
                          {t.service}
                        </Badge>
                        <span>Due: {t.due || 'TBD'}</span>
                        <span>•</span>
                        <span>Prep: {t.staffName}</span>
                      </div>
                    </div>

                    <Button variant="ghost" size="sm" className="h-7 text-xs shrink-0">
                      Inspect
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel: Onboarding Leads or Active Scope */}
        <div className="lg:col-span-5 space-y-4">
          <div className="border border-border/80 rounded-xl bg-card/60 overflow-hidden shadow-xs">
            <div className="p-4 border-b border-border/60 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-[#c4161c]" />
                <h2 className="text-sm font-semibold text-foreground">Active Onboarding Pipeline</h2>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => onNavigate('estimator')}
                className="text-xs h-7 gap-1"
              >
                Estimator <ArrowRight className="h-3 w-3" />
              </Button>
            </div>

            <div className="divide-y divide-border/60">
              {leads.filter((l) => l.stage !== 'Active Client').slice(0, 4).map((lead) => (
                <div key={lead.id} className="p-3.5 space-y-1">
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-foreground text-xs">{lead.companyName}</span>
                    <Badge variant="outline" className="text-[10px] font-mono text-primary border-primary/30">
                      {lead.stage}
                    </Badge>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-muted-foreground font-mono">
                    <span>{lead.contactPerson}</span>
                    <span className="font-bold text-foreground">R {lead.estimatedMonthlyFee.toLocaleString()} / mo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
