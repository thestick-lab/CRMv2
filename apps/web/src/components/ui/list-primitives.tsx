import * as React from 'react';
import { ArrowRight } from 'lucide-react';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------------------
 * Shared list primitives for the reference card/list anatomy: a hairline card
 * header with an inline link, urgency pills, date chips, avatar chips and the
 * empty-state card. Used by Home, Analytics, Boards and the client record.
 * ------------------------------------------------------------------------- */

export interface CardHeaderWithLinkProps {
  title: string;
  linkLabel?: string;
  onLink?: () => void;
}

export function CardHeaderWithLink({ title, linkLabel, onLink }: CardHeaderWithLinkProps) {
  return (
    <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
      <h3 className="truncate text-sm font-semibold text-foreground">{title}</h3>
      {linkLabel && onLink && (
        <button
          type="button"
          onClick={onLink}
          className="group inline-flex shrink-0 items-center gap-1 rounded-sm text-xs font-medium text-muted-foreground outline-none transition-colors hover:text-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
        >
          {linkLabel}
          <ArrowRight className="h-3 w-3 transition-transform group-hover:translate-x-0.5" />
        </button>
      )}
    </div>
  );
}

export type PriorityLevel = 'High' | 'Medium' | 'Low';

const PRIORITY_STYLES: Record<PriorityLevel, string> = {
  High: 'border-[#c4161c]/25 bg-[#c4161c]/10 text-[#c4161c] dark:text-[#f87171]',
  Medium: 'border-amber-500/25 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  Low: 'border-border bg-muted/60 text-muted-foreground',
};

export interface PriorityPillProps {
  level: PriorityLevel;
}

export function PriorityPill({ level }: PriorityPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[11px] font-medium leading-none',
        PRIORITY_STYLES[level]
      )}
    >
      {level}
    </span>
  );
}

export interface DateChipProps {
  /** Short month label, e.g. `Nov`. */
  month: string;
  /** Day of month, e.g. `14`. */
  day: string;
}

export function DateChip({ month, day }: DateChipProps) {
  return (
    <div className="flex h-10 w-10 shrink-0 flex-col items-center justify-center rounded-lg border border-border bg-card">
      <span className="font-mono text-[11px] uppercase leading-none tracking-wide text-muted-foreground">
        {month}
      </span>
      <span className="font-mono text-sm font-semibold leading-tight text-foreground">{day}</span>
    </div>
  );
}

export type AvatarTint = 'crimson' | 'amber' | 'muted';

const AVATAR_TINTS: Record<AvatarTint, string> = {
  crimson: 'bg-[#c4161c]/12 text-[#c4161c] dark:text-[#f87171]',
  amber: 'bg-amber-500/15 text-amber-700 dark:text-amber-400',
  muted: 'bg-muted text-muted-foreground',
};

export interface AvatarChipProps {
  initials: string;
  tint: AvatarTint;
}

export function AvatarChip({ initials, tint }: AvatarChipProps) {
  return (
    <span
      className={cn(
        'inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full font-mono text-[11px] font-medium',
        AVATAR_TINTS[tint]
      )}
      aria-hidden="true"
    >
      {initials}
    </span>
  );
}

export interface EmptyStateCardProps {
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  subtitle: string;
  dashed?: boolean;
}

export function EmptyStateCard({ icon: Icon, title, subtitle, dashed }: EmptyStateCardProps) {
  return (
    <div
      className={cn(
        'flex flex-col items-center justify-center gap-2 rounded-xl px-6 py-10 text-center',
        dashed ? 'border border-dashed border-border bg-transparent' : 'border border-border bg-card'
      )}
    >
      <span className="flex h-9 w-9 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <Icon className="h-4 w-4" />
      </span>
      <h3 className="text-sm font-medium text-foreground">{title}</h3>
      <p className="max-w-sm text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
    </div>
  );
}
