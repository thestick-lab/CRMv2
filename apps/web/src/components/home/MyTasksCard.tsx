import * as React from 'react';
import { ArrowRight, Check, Inbox } from 'lucide-react';
import { PriorityPill } from '@/components/ui/list-primitives';
import { cn } from '@/lib/utils';
import type { HomeTaskItem } from './home-logic';

export interface MyTasksCardProps {
  myTasks: HomeTaskItem[];
  completedTasks: HomeTaskItem[];
  onComplete: (task: HomeTaskItem) => void;
  onViewAll: () => void;
  onOpenClient: (clientCode: string) => void;
}

type Tab = 'open' | 'completed';

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

function dueLabel(task: HomeTaskItem): string {
  if (!task.due) return 'No date';
  if (task.daysUntilDue === undefined) {
    const [, month, day] = task.due.split('-');
    return `${Number(day)} ${MONTHS[Number(month) - 1]}`;
  }
  if (task.daysUntilDue < 0) return `${Math.abs(task.daysUntilDue)}d late`;
  if (task.daysUntilDue === 0) return 'Today';
  if (task.daysUntilDue === 1) return 'Tomorrow';
  const [, month, day] = task.due.split('-');
  return `${Number(day)} ${MONTHS[Number(month) - 1]}`;
}

function TaskRow({
  task,
  onComplete,
  onOpenClient,
}: {
  task: HomeTaskItem;
  onComplete: (task: HomeTaskItem) => void;
  onOpenClient: (clientCode: string) => void;
}) {
  const done = task.status === 'Submitted';
  const overdue = !done && task.daysUntilDue !== undefined && task.daysUntilDue < 0;

  return (
    <li className="group flex items-start gap-3 px-4 py-3 transition-colors hover:bg-muted/30">
      <button
        type="button"
        role="checkbox"
        aria-checked={done}
        aria-label={
          done
            ? `${task.title} for ${task.clientName} completed`
            : `Mark ${task.title} for ${task.clientName} submitted`
        }
        onClick={() => onComplete(task)}
        className={cn(
          'mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded border outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#c4161c]',
          done
            ? 'border-[#c4161c] bg-[#c4161c] text-white'
            : 'border-border bg-transparent hover:border-[#c4161c]/60'
        )}
      >
        {done && <Check className="h-3 w-3" />}
      </button>

      <div className="min-w-0 flex-1">
        <button
          type="button"
          onClick={() => onOpenClient(task.clientCode)}
          className={cn(
            'block max-w-full truncate text-left text-[13px] font-medium outline-none transition-colors hover:text-[#c4161c] focus-visible:underline',
            done ? 'text-muted-foreground line-through' : 'text-foreground'
          )}
        >
          {task.title}
        </button>
        <p className="mt-0.5 truncate font-mono text-[11px] text-muted-foreground">
          {task.clientName} · {task.serviceLabel}
        </p>
      </div>

      {!done && <PriorityPill level={task.priority} />}

      <span
        className={cn(
          'w-16 shrink-0 text-right font-mono text-[11px] tabular-nums',
          overdue ? 'text-destructive' : 'text-muted-foreground'
        )}
        title={task.due ? `Due ${task.due}` : 'No statutory due date'}
      >
        {dueLabel(task)}
      </span>
    </li>
  );
}

/**
 * The practice's daily checklist: everything the signed-in user owns, plus a
 * completed tab. The checkbox submits gate-free work directly; partner-gated
 * returns open the statutory action modal instead (handled by the caller).
 */
export function MyTasksCard({
  myTasks,
  completedTasks,
  onComplete,
  onViewAll,
  onOpenClient,
}: MyTasksCardProps) {
  const [tab, setTab] = React.useState<Tab>('open');
  const items = tab === 'open' ? myTasks : completedTasks;
  const tabs: { id: Tab; label: string; count: number }[] = [
    { id: 'open', label: 'My tasks', count: myTasks.length },
    { id: 'completed', label: 'Completed', count: completedTasks.length },
  ];

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-3 py-2">
        <div role="tablist" aria-label="My tasks" className="flex items-center gap-1">
          {tabs.map((entry) => (
            <button
              key={entry.id}
              type="button"
              role="tab"
              aria-selected={tab === entry.id}
              onClick={() => setTab(entry.id)}
              className={cn(
                'inline-flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#c4161c]',
                tab === entry.id
                  ? 'bg-muted text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {entry.label}
              <span className="font-mono text-[11px] tabular-nums text-muted-foreground">
                {entry.count}
              </span>
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={onViewAll}
          className="group inline-flex shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
        >
          View all
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      </div>

      {items.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-10 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Inbox className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-foreground">
            {tab === 'open' ? 'Nothing assigned to you' : 'No completed tasks yet'}
          </p>
          <p className="max-w-xs text-xs leading-relaxed text-muted-foreground">
            {tab === 'open'
              ? 'New statutory work assigned to you lands here as the practice allocates it.'
              : 'Submitting a return from this list moves it across to this tab.'}
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.slice(0, 6).map((task) => (
            <TaskRow
              key={task.id}
              task={task}
              onComplete={onComplete}
              onOpenClient={onOpenClient}
            />
          ))}
        </ul>
      )}
    </section>
  );
}
