import { Clock3, Trophy } from 'lucide-react';
import type { KanbanCardBase } from '@/components/kanban/KanbanBoard';
import type { QuoteStage } from '@/context/PracticeStoreContext';
import { AvatarChip, type AvatarTint } from '@/components/ui/list-primitives';
import { formatZar } from '@/components/quote/estimate-form';
import { AGING_AMBER_FROM_DAYS } from './pipeline-logic';
import { cn } from '@/lib/utils';

/** Everything a pipeline card needs, resolved once by the view. */
export interface PipelineCard extends KanbanCardBase {
  quoteId: string;
  name: string;
  number: string;
  clientCode?: string;
  stage: QuoteStage;
  monthlyFee: number;
  annualValue: number;
  ownerName: string;
  ownerInitials: string;
  ownerTint: AvatarTint;
  ageDays: number;
  nextStep?: string;
}

/** Days in stage; amber from fifteen days, never a red alarm. */
export function AgingChip({ days }: { days: number }) {
  const amber = days >= AGING_AMBER_FROM_DAYS;
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 rounded-full border px-1.5 py-0.5 font-mono text-[11px] leading-none',
        amber
          ? 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400'
          : 'border-border bg-muted/60 text-muted-foreground'
      )}
      title={`${days} ${days === 1 ? 'day' : 'days'} in this stage${amber ? ' — needs a nudge' : ''}`}
    >
      <Clock3 className="h-2.5 w-2.5" aria-hidden="true" />
      {days}d
    </span>
  );
}

export function QuoteCard({ card }: { card: PipelineCard }) {
  const won = card.stage === 'Active Client';
  const lost = card.stage === 'Closed Lost';

  return (
    <div className="space-y-2">
      <div className="flex items-start justify-between gap-2 pr-5">
        <div className="min-w-0">
          <p
            className={cn(
              'truncate text-xs font-semibold text-foreground',
              lost && 'text-muted-foreground line-through decoration-border'
            )}
          >
            {card.name}
          </p>
          <p className="font-mono text-[11px] text-muted-foreground">
            {card.number}
            {card.clientCode ? ` · ${card.clientCode}` : ''}
          </p>
        </div>
        {won && (
          <span className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#c4161c]/25 bg-[#c4161c]/10 px-1.5 py-0.5 font-mono text-[11px] font-medium uppercase tracking-wide leading-none text-[#c4161c] dark:text-[#f87171]">
            <Trophy className="h-2.5 w-2.5" aria-hidden="true" />
            Won
          </span>
        )}
      </div>

      <div className="flex items-end justify-between gap-2">
        <p
          className={cn(
            'font-mono text-sm font-semibold tabular-nums text-foreground',
            lost && 'text-muted-foreground'
          )}
        >
          {formatZar(card.monthlyFee, 0)}
          <span className="ml-0.5 text-[11px] font-normal text-muted-foreground">/mo</span>
        </p>
        <span className="flex min-w-0 items-center gap-1.5" title={card.ownerName}>
          <span className="hidden truncate text-[11px] text-muted-foreground min-[1420px]:inline">
            {card.ownerName.split(/\s+/)[0]}
          </span>
          <AvatarChip initials={card.ownerInitials} tint={card.ownerTint} />
        </span>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {card.nextStep && (
          <span className="inline-flex max-w-full items-center gap-1 truncate rounded-full border border-border bg-muted/40 px-1.5 py-0.5 text-[11px] leading-none text-muted-foreground">
            {card.nextStep}
          </span>
        )}
        {!won && <AgingChip days={card.ageDays} />}
        {lost && (
          <span className="inline-flex items-center rounded-full border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] uppercase tracking-wide leading-none text-muted-foreground">
            Lost
          </span>
        )}
      </div>
    </div>
  );
}
