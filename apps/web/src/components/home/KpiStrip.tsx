import { CalendarClock, ListChecks, ShieldCheck, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import type { DeadlineKpiFilter } from '@/types/navigation';
import type { HomeKpis } from './home-logic';

export interface KpiStripProps {
  kpis: HomeKpis;
  onOpenDeadlines: (filter: DeadlineKpiFilter) => void;
}

interface KpiTile {
  key: keyof HomeKpis;
  label: string;
  caption: string;
  icon: LucideIcon;
  filter: DeadlineKpiFilter;
}

const TILES: KpiTile[] = [
  { key: 'totalTasks', label: 'Total tasks', caption: 'Open obligations', icon: ListChecks, filter: 'all' },
  { key: 'dueThisWeek', label: 'Due this week', caption: 'Next seven days', icon: CalendarClock, filter: 'due7' },
  { key: 'inReview', label: 'In review', caption: 'Partner sign-off', icon: ShieldCheck, filter: 'all' },
  { key: 'teamMembers', label: 'Team members', caption: 'Practice staff', icon: Users, filter: 'all' },
];

/** Four practice counts, each a door into the deadlines board. */
export function KpiStrip({ kpis, onOpenDeadlines }: KpiStripProps) {
  return (
    <div className="grid grid-cols-2 divide-x divide-y divide-border overflow-hidden rounded-xl border border-border bg-card lg:grid-cols-4">
      {TILES.map(({ key, label, caption, icon: Icon, filter }) => (
        <button
          key={key}
          type="button"
          onClick={() => onOpenDeadlines(filter)}
          title={`${label}: open the deadlines board`}
          className="group flex flex-col gap-2 px-4 py-3.5 text-left outline-none transition-colors hover:bg-muted/40 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c4161c]"
        >
          <span className="flex items-center justify-between gap-2">
            <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              {label}
            </span>
            <Icon className="h-3.5 w-3.5 text-muted-foreground transition-colors group-hover:text-[#c4161c]" />
          </span>
          <span className="font-mono text-2xl leading-none tabular-nums text-foreground">
            {kpis[key]}
          </span>
          <span className="text-[11px] text-muted-foreground">{caption}</span>
        </button>
      ))}
    </div>
  );
}
