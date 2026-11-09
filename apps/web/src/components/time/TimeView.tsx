import * as React from 'react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Button } from '@/components/ui/button';
import { PageHeader } from '@/components/ui/page-header';
import { cn } from '@/lib/utils';
import { can } from '@/lib/permissions';
import { BarChart3, ListChecks, Plus } from 'lucide-react';
import { useTimer } from './timer-context';
import { Timesheet } from './Timesheet';
import { TimeReport } from './TimeReport';

/* ---------------------------------------------------------------------------
 * Time — two tabs over one trail of entries. `Log` is the working timesheet
 * (the capture sheet stays the only editor), `Report` is the reconciliation
 * the practice bills from. The topbar's `+ New → Log time` opens the same
 * capture sheet, so both entry points land in one flow.
 * ------------------------------------------------------------------------- */

type TimeTab = 'log' | 'report';

const TABS: ReadonlyArray<{ id: TimeTab; label: string; icon: React.ComponentType<{ className?: string }> }> = [
  { id: 'log', label: 'Log', icon: ListChecks },
  { id: 'report', label: 'Report', icon: BarChart3 },
];

export function TimeView() {
  const { timeEntries, currentUser, permissions } = usePracticeStore();
  const { openEntrySheet } = useTimer();
  const canLogOwn = can(currentUser.role, 'Time', 'log-own', permissions.matrix);
  const canViewAll = can(currentUser.role, 'Time', 'view-all', permissions.matrix);
  const tabs = TABS.filter((entry) => (entry.id === 'log' ? canLogOwn : canViewAll));
  const [tab, setTab] = React.useState<TimeTab>(() => (canLogOwn ? 'log' : 'report'));

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <PageHeader
        eyebrow="Time"
        title="Time tracking"
        subtitle="Log billable and non-billable work, then reconcile the practice report against the underlying entries."
        actions={
          <Button
            size="sm"
            onClick={openEntrySheet}
            data-testid="time-log-action"
            disabled={!canLogOwn}
            title={canLogOwn ? undefined : `${currentUser.role} cannot log time`}
          >
            <Plus className="h-3.5 w-3.5" />
            Log time
          </Button>
        }
      />

      <div className="flex items-center justify-between gap-3 border-b border-border">
        <div role="tablist" aria-label="Time views" className="flex items-center gap-1">
          {tabs.map((entry) => {
            const Icon = entry.icon;
            const active = tab === entry.id;
            return (
              <button
                key={entry.id}
                type="button"
                role="tab"
                id={`time-tab-${entry.id}`}
                aria-selected={active}
                aria-controls={`time-panel-${entry.id}`}
                data-testid={`time-tab-${entry.id}`}
                onClick={() => setTab(entry.id)}
                className={cn(
                  '-mb-px inline-flex items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#c4161c]',
                  active
                    ? 'border-[#c4161c] text-foreground'
                    : 'border-transparent text-muted-foreground hover:text-foreground'
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {entry.label}
                {entry.id === 'log' && (
                  <span className="ml-0.5 rounded-full bg-muted px-1.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                    {timeEntries.length}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <p className="hidden font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground sm:block">
          ZAR practice · quarter-hour billing
        </p>
      </div>

      <div role="tabpanel" id={`time-panel-${tab}`} aria-labelledby={`time-tab-${tab}`}>
        {tab === 'log' ? <Timesheet /> : <TimeReport />}
      </div>
    </div>
  );
}
