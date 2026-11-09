import { CardHeaderWithLink } from '@/components/ui/list-primitives';
import { CalendarCheck } from 'lucide-react';
import type { ClientTimelineEntry } from '../client-record-data';

export interface RelationshipHistoryPanelProps {
  entries: ClientTimelineEntry[];
  /** Overview shows the four most recent entries; the History tab shows all. */
  limit?: number;
}

function formatWhen(at: string): string {
  if (!at) return '';
  const date = new Date(at);
  if (Number.isNaN(date.getTime())) return at;
  return date.toLocaleDateString('en-ZA', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function RelationshipHistoryPanel({ entries, limit }: RelationshipHistoryPanelProps) {
  const visible = limit ? entries.slice(0, limit) : entries;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CardHeaderWithLink title="Relationship history" />

      {visible.length === 0 ? (
        <div className="flex flex-col items-center gap-2 px-4 py-8 text-center">
          <CalendarCheck className="h-4 w-4 text-muted-foreground" />
          <p className="text-xs text-muted-foreground">
            No interactions recorded yet. Filings, sign-offs, quotes and invoices appear here as
            they happen.
          </p>
        </div>
      ) : (
        <ol className="px-4 py-3">
          {visible.map((entry, index) => (
            <li key={entry.id} className="relative flex gap-3 pb-3 last:pb-0">
              {index < visible.length - 1 && (
                <span
                  aria-hidden="true"
                  className="absolute left-[3px] top-3 h-full w-px bg-border"
                />
              )}
              <span
                aria-hidden="true"
                className="relative mt-1.5 h-[7px] w-[7px] shrink-0 rounded-full border border-[#c4161c]/40 bg-[#c4161c]/20"
              />
              <div className="min-w-0 flex-1">
                <p className="text-xs leading-snug text-foreground">{entry.title}</p>
                <p className="mt-0.5 flex flex-wrap items-center gap-x-2 font-mono text-[10px] text-muted-foreground">
                  {entry.at && <span className="tabular-nums">{formatWhen(entry.at)}</span>}
                  {entry.at && <span aria-hidden="true">·</span>}
                  <span className="uppercase tracking-wider">{entry.action}</span>
                  {entry.subline && <span aria-hidden="true">·</span>}
                  <span className="truncate">{entry.subline}</span>
                </p>
              </div>
            </li>
          ))}
        </ol>
      )}
    </section>
  );
}
