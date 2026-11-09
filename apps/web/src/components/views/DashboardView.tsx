import * as React from 'react';
import type { NavigateOptions, ViewKey } from '@/types/navigation';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import {
  aggregatePracticeTasks,
  type PracticeTaskItem,
} from '@/components/deadlines/practice-tasks';
import { StatutoryActionModal } from '@/components/deadlines/StatutoryActionModal';
import { buildEstimateForClient } from '@/components/client-show/tabs/EstimateTab';
import { downloadExcelQuote } from '@/lib/export-actions';
import { canSignOff, can, isAssignedTo } from '@/lib/permissions';
import { Button } from '@/components/ui/button';
import { EmptyStateCard } from '@/components/ui/list-primitives';
import { EngagementBanner } from '@/components/home/EngagementBanner';
import { KpiStrip } from '@/components/home/KpiStrip';
import { MyTasksCard } from '@/components/home/MyTasksCard';
import { TeamActivityCard } from '@/components/home/TeamActivityCard';
import { UpcomingDeadlinesCard } from '@/components/home/UpcomingDeadlinesCard';
import { RecentWorkCard } from '@/components/home/RecentWorkCard';
import { HolidaysCard } from '@/components/home/HolidaysCard';
import { InviteCard } from '@/components/home/InviteCard';
import {
  buildHomeData,
  buildMyTaskLists,
  splitDate,
  type HomeTaskItem,
} from '@/components/home/home-logic';
import { CheckCircle2, Clock3, FileSpreadsheet, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DashboardViewProps {
  onNavigate: (view: ViewKey, clientCode?: string, options?: NavigateOptions) => void;
}

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

export function DashboardView({ onNavigate }: DashboardViewProps) {
  const {
    clients,
    staff,
    currentUser,
    taskStatusOverrides,
    activity,
    timeEntries,
    division,
    rates,
    updateTaskStatus,
    permissions,
  } = usePracticeStore();
  const today = todayInSouthAfrica();
  const [actionTask, setActionTask] = React.useState<PracticeTaskItem | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const tasks = React.useMemo(
    () => aggregatePracticeTasks(clients, today, staff).tasks,
    [clients, today, staff]
  );

  const home = React.useMemo(
    () =>
      buildHomeData({
        tasks,
        staff,
        currentUser,
        taskStatusOverrides,
        activity,
        timeEntries,
        today,
        clients,
      }),
    [tasks, staff, currentUser, taskStatusOverrides, activity, timeEntries, today, clients]
  );

  const myTasks = React.useMemo(
    () => buildMyTaskLists(tasks, taskStatusOverrides, currentUser),
    [tasks, taskStatusOverrides, currentUser]
  );

  const overdueCount = React.useMemo(
    () =>
      tasks.filter(
        (task) =>
          (taskStatusOverrides[task.id]?.status ?? '') !== 'Submitted' &&
          task.due !== undefined &&
          task.due < today
      ).length,
    [tasks, taskStatusOverrides, today]
  );

  // The checkbox submits gate-free work; partner-gated returns open the
  // statutory action modal so the SARS reference and sign-off are captured.
  const handleComplete = (item: HomeTaskItem) => {
    const task = tasks.find((candidate) => candidate.id === item.id);
    if (!task) return;
    if (task.needsPartnerReview) {
      setActionTask(task);
      return;
    }
    // The quick checkbox obeys the same matrix row as the statutory form.
    const canSubmit =
      can(currentUser.role, 'Deadlines', 'submit-returns', permissions.matrix, {
        assigned: isAssignedTo(currentUser.id, task),
      });
    if (!canSubmit) {
      setFeedback(
        `${currentUser.role} cannot submit ${task.service} for ${task.clientCode} — ask a Partner, the Compliance Officer or an Accountant to file it.`
      );
      return;
    }
    updateTaskStatus(task.id, 'Submitted', {
      submissionDate: today,
      service: task.service,
      clientName: task.clientName,
      period: task.period,
    });
  };

  const handleExportPartnerSummary = () => {
    const leadClient = clients[0];
    if (!leadClient) return;
    const estimate = buildEstimateForClient(
      leadClient,
      undefined,
      rates.standardHourlyRate,
      rates.marchEscalationPct
    );
    void downloadExcelQuote(leadClient, estimate, today);
  };

  const divisionLabel = division === 'accountant-on-call' ? 'Accountant on Call' : 'FD on Call';
  const dateLabel = React.useMemo(() => {
    const { month, day } = splitDate(today);
    return `${day} ${month} ${today.slice(0, 4)}`;
  }, [today]);

  return (
    <div className="mx-auto max-w-[1240px] space-y-5 px-6 py-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div className="min-w-0">
          <h1 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
            {greetingForHour(new Date().getHours())}, {currentUser.name}
          </h1>
          <p className="mt-1 text-xs text-muted-foreground">
            {currentUser.role} · {divisionLabel} practice · {dateLabel}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {canSignOff(currentUser.role) && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleExportPartnerSummary}
              className="h-8 cursor-pointer gap-1.5 font-mono text-[11px]"
              title="1-Click Practice Export for Partner meetings"
            >
              <FileSpreadsheet className="h-3.5 w-3.5 text-muted-foreground" />
              <span>Partner Meeting Export</span>
            </Button>
          )}

          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-md border px-2.5 py-1.5 font-mono text-[11px]',
              overdueCount > 0
                ? 'border-destructive/30 bg-destructive/10 text-destructive'
                : 'border-border bg-card text-muted-foreground'
            )}
          >
            {overdueCount > 0 ? (
              <>
                <Clock3 className="h-3.5 w-3.5" />
                {overdueCount} {overdueCount === 1 ? 'filing' : 'filings'} overdue
              </>
            ) : (
              <>
                <CheckCircle2 className="h-3.5 w-3.5" />
                No overdue filings
              </>
            )}
          </span>

          {home.kpis.inReview > 0 && (
            <button
              type="button"
              onClick={() => onNavigate('inbox')}
              className="inline-flex items-center gap-1.5 rounded-md bg-[#c4161c] px-2.5 py-1.5 font-mono text-[11px] text-white outline-none transition-colors hover:bg-[#a01217] focus-visible:ring-2 focus-visible:ring-[#c4161c] focus-visible:ring-offset-2 focus-visible:ring-offset-background dark:hover:bg-[#d91b22]"
            >
              <ShieldCheck className="h-3.5 w-3.5" />
              {home.kpis.inReview} awaiting partner sign-off
            </button>
          )}
        </div>
      </header>

      {home.banner && (
        <EngagementBanner
          banner={home.banner}
          onOpenClient={(code) => onNavigate('client', code)}
        />
      )}

      <KpiStrip
        kpis={home.kpis}
        onOpenDeadlines={(filter) => onNavigate('deadlines', undefined, { kpiFilter: filter })}
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        <div className="space-y-5 lg:col-span-8">
          <MyTasksCard
            myTasks={home.myTasks}
            completedTasks={myTasks.completed}
            onComplete={handleComplete}
            onViewAll={() => onNavigate('deadlines', undefined, { staffId: currentUser.id })}
            onOpenClient={(code) => onNavigate('client', code)}
          />

          {(home.emptyStates.noOverdue || home.emptyStates.noAwaitingClient) && (
            <div
              className={cn(
                'grid grid-cols-1 gap-3',
                home.emptyStates.noOverdue && home.emptyStates.noAwaitingClient && 'sm:grid-cols-2'
              )}
            >
              {home.emptyStates.noOverdue && (
                <EmptyStateCard
                  icon={CheckCircle2}
                  title="No overdue tasks"
                  subtitle="Every filing on the practice board is still inside its statutory window."
                  dashed
                />
              )}
              {home.emptyStates.noAwaitingClient && (
                <EmptyStateCard
                  icon={Clock3}
                  title="No tasks awaiting client"
                  subtitle="Nothing is parked with a client for information or approval."
                  dashed
                />
              )}
            </div>
          )}

          <TeamActivityCard activity={home.activity} today={today} />
        </div>

        <div className="space-y-4 lg:col-span-4">
          <UpcomingDeadlinesCard
            deadlines={home.deadlines}
            onViewCalendar={() => onNavigate('deadlines')}
            onOpenClient={(code) => onNavigate('client', code)}
          />
          <RecentWorkCard items={home.recentWork} onViewAll={() => onNavigate('time')} />
          <HolidaysCard holidays={home.holidays} />
          <InviteCard
            onInvite={() => onNavigate('settings', undefined, { settingsPane: 'team' })}
          />
        </div>
      </div>

      <StatutoryActionModal
        task={actionTask}
        open={actionTask !== null}
        onOpenChange={(open) => {
          if (!open) setActionTask(null);
        }}
        onSelectClient={(code) => onNavigate('client', code)}
      />

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className="fixed bottom-5 left-1/2 z-[60] -translate-x-1/2 rounded-lg border border-border bg-card px-3.5 py-2 text-xs text-foreground shadow-lg"
        >
          {feedback}
        </div>
      )}
    </div>
  );
}
