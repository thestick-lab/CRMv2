import { ArrowUpRight } from 'lucide-react';
import type { QuoteStage } from '@/context/PracticeStoreContext';
import { formatZar } from '@/components/quote/estimate-form';
import { cn } from '@/lib/utils';
import { AgingChip, type PipelineCard } from './QuoteCard';

/* ---------------------------------------------------------------------------
 * Quote register: the table view of the sales board. Rows open the quote
 * builder, same as the cards.
 * ------------------------------------------------------------------------- */

function stagePill(stage: QuoteStage): string {
  if (stage === 'Closed Lost') return 'border-border bg-muted/60 text-muted-foreground';
  if (stage === 'Active Client')
    return 'border-[#c4161c]/25 bg-[#c4161c]/10 text-[#c4161c] dark:text-[#f87171]';
  if (stage === 'Draft Quote') return 'border-border bg-card text-muted-foreground';
  return 'border-border bg-muted/40 text-foreground';
}

export interface QuotesListProps {
  rows: PipelineCard[];
  onOpenQuote: (quoteId: string) => void;
}

export function QuotesList({ rows, onOpenQuote }: QuotesListProps) {
  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[760px] text-left text-xs">
        <thead>
          <tr className="border-b border-border">
            {['Quote', 'Stage', 'Monthly fee', 'Annual value', 'Owner', 'Next step', 'Age', ''].map(
              (label) => (
                <th
                  key={label}
                  scope="col"
                  className="whitespace-nowrap px-3 py-2 font-mono text-[9px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
                >
                  {label}
                </th>
              )
            )}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr
              key={row.id}
              tabIndex={0}
              onClick={() => onOpenQuote(row.quoteId)}
              onKeyDown={(event) => {
                if (event.key !== 'Enter' && event.key !== ' ') return;
                event.preventDefault();
                onOpenQuote(row.quoteId);
              }}
              className="group cursor-pointer border-b border-border/60 outline-none transition-colors last:border-b-0 hover:bg-muted/40 focus-visible:bg-muted/40"
              aria-label={`Open quote ${row.number} for ${row.name}`}
            >
              <td className="max-w-[240px] px-3 py-2.5">
                <p
                  className={cn(
                    'truncate font-medium text-foreground',
                    row.stage === 'Closed Lost' && 'text-muted-foreground line-through decoration-border'
                  )}
                >
                  {row.name}
                </p>
                <p className="font-mono text-[10px] text-muted-foreground">
                  {row.number}
                  {row.clientCode ? ` · ${row.clientCode}` : ''}
                </p>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                <span
                  className={cn(
                    'inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[10px] leading-none',
                    stagePill(row.stage)
                  )}
                >
                  {row.stage}
                </span>
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-foreground">
                {formatZar(row.monthlyFee, 0)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-muted-foreground">
                {formatZar(row.annualValue, 0)}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-muted-foreground">{row.ownerName}</td>
              <td className="max-w-[180px] truncate px-3 py-2.5 text-muted-foreground">
                {row.nextStep || '—'}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5">
                {/* Same precedence as the card: a won client never needs a nudge. */}
                {row.stage !== 'Active Client' && <AgingChip days={row.ageDays} />}
              </td>
              <td className="whitespace-nowrap px-3 py-2.5 text-right">
                <span className="inline-flex items-center gap-0.5 text-[11px] text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100 group-focus-visible:opacity-100">
                  Open
                  <ArrowUpRight className="h-3 w-3" aria-hidden="true" />
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
