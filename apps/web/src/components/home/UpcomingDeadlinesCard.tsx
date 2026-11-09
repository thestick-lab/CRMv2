import { CalendarClock } from 'lucide-react';
import { CardHeaderWithLink, DateChip, PriorityPill } from '@/components/ui/list-primitives';
import type { HomeDeadlineItem } from './home-logic';

export interface UpcomingDeadlinesCardProps {
  deadlines: HomeDeadlineItem[];
  onViewCalendar: () => void;
  onOpenClient: (clientCode: string) => void;
}

/** The next five statutory due dates, ordered by date. */
export function UpcomingDeadlinesCard({
  deadlines,
  onViewCalendar,
  onOpenClient,
}: UpcomingDeadlinesCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CardHeaderWithLink title="Upcoming deadlines" linkLabel="View calendar" onLink={onViewCalendar} />

      {deadlines.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-6 py-8 text-center">
          <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <CalendarClock className="h-4 w-4" />
          </span>
          <p className="text-sm font-medium text-foreground">No due dates in the horizon</p>
          <p className="text-xs text-muted-foreground">
            Set a year end on a client to project its statutory calendar.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {deadlines.map((deadline) => (
            <li key={deadline.id}>
              <button
                type="button"
                onClick={() => onOpenClient(deadline.clientCode)}
                className="flex w-full items-center gap-3 px-4 py-2.5 text-left outline-none transition-colors hover:bg-muted/30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c4161c]"
              >
                <DateChip month={deadline.month} day={deadline.day} />
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[13px] font-medium text-foreground">{deadline.title}</p>
                  <p className="truncate font-mono text-[11px] text-muted-foreground">
                    {deadline.clientName}
                  </p>
                </div>
                <PriorityPill level={deadline.priority} />
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
