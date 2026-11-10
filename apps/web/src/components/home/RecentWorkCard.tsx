import { Clock } from 'lucide-react';
import { CardHeaderWithLink } from '@/components/ui/list-primitives';
import type { HomeRecentWorkItem } from './home-logic';

export interface RecentWorkCardProps {
  items: HomeRecentWorkItem[];
  onViewAll: () => void;
}

/** Time logged on the practice's clients, newest first. */
export function RecentWorkCard({ items, onViewAll }: RecentWorkCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CardHeaderWithLink title="Recent work" linkLabel="View all" onLink={onViewAll} />

      {items.length === 0 ? (
        <div className="px-4 py-6">
          <p className="text-sm font-medium text-foreground">No time logged yet</p>
          <p className="mt-1 text-xs leading-relaxed text-muted-foreground">
            Entries appear here as the team logs billable and non-billable work.
          </p>
        </div>
      ) : (
        <ul className="divide-y divide-border">
          {items.map((item) => (
            <li key={item.id} className="flex items-start gap-3 px-4 py-2.5">
              <span className="mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-muted text-muted-foreground">
                <Clock className="h-3.5 w-3.5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[13px] font-medium text-foreground">{item.title}</p>
                <p className="truncate font-mono text-[11px] text-muted-foreground">{item.subtitle}</p>
              </div>
              <span className="shrink-0 font-mono text-[11px] text-muted-foreground">{item.meta}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
