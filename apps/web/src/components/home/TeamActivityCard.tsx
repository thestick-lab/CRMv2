import { AvatarChip } from '@/components/ui/list-primitives';
import type { ActivityEvent } from '@/context/PracticeStoreContext';
import { relativeTime } from './home-logic';

export interface TeamActivityCardProps {
  activity: ActivityEvent[];
  today: string;
}

/**
 * The practice's recent trail — live store events first, then the seeded
 * engagement history. Newest at the top.
 */
export function TeamActivityCard({ activity, today }: TeamActivityCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">Team activity</h2>
        <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          Latest
        </span>
      </div>

      <ul className="divide-y divide-border">
        {activity.slice(0, 6).map((event) => (
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
              className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground"
            >
              {relativeTime(event.at, today)}
            </time>
          </li>
        ))}
      </ul>
    </section>
  );
}
