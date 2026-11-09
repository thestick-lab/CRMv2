import { CalendarDays } from 'lucide-react';
import type { HolidayItem } from './home-logic';

export interface HolidaysCardProps {
  holidays: HolidayItem[];
}

/** The next gazetted SA public holidays, carried forward from the old dashboard. */
export function HolidaysCard({ holidays }: HolidaysCardProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
        <h2 className="text-sm font-semibold text-foreground">SA public holidays</h2>
        <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
      </div>

      {holidays.length === 0 ? (
        <p className="px-4 py-4 text-xs text-muted-foreground">No gazetted holidays ahead.</p>
      ) : (
        <ul className="divide-y divide-border">
          {holidays.map((holiday) => (
            <li key={holiday.date} className="flex items-center justify-between gap-3 px-4 py-2.5">
              <span className="min-w-0 truncate text-[13px] text-foreground">{holiday.name}</span>
              <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
                {holiday.day} {holiday.month}
              </span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
