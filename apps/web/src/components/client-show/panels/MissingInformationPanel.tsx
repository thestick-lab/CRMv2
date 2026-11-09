import { AlertCircle, CheckCircle2 } from 'lucide-react';
import { CardHeaderWithLink } from '@/components/ui/list-primitives';
import type { MissingInformationItem } from '../client-record-data';

export interface MissingInformationPanelProps {
  items: MissingInformationItem[];
  onAdd: (item: MissingInformationItem) => void;
  /**
   * The role cannot edit this record: the gap is still listed, but no `Add`
   * affordance is offered — the write would be dropped at save time.
   */
  readOnly?: boolean;
}

export function MissingInformationPanel({
  items,
  onAdd,
  readOnly = false,
}: MissingInformationPanelProps) {
  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CardHeaderWithLink title="Missing information" />

      {items.length === 0 ? (
        <div className="flex items-center gap-2 px-4 py-4 text-xs text-muted-foreground">
          <CheckCircle2 className="h-3.5 w-3.5 text-[#c4161c] dark:text-[#f87171]" />
          Every contact and statutory field is on file.
        </div>
      ) : (
        <ul className="divide-y divide-border/60">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-4 py-2.5">
              <div className="flex min-w-0 items-start gap-2">
                <AlertCircle className="mt-0.5 h-3 w-3 shrink-0 text-amber-600 dark:text-amber-400" />
                <div className="min-w-0">
                  <p className="text-xs font-medium text-foreground">{item.label}</p>
                  <p className="truncate text-[11px] text-muted-foreground">{item.hint}</p>
                </div>
              </div>
              {!readOnly && (
                <button
                  type="button"
                  onClick={() => onAdd(item)}
                  className="shrink-0 rounded-sm font-mono text-[11px] uppercase tracking-wide text-[#c4161c] outline-none transition-colors hover:text-[#a01217] focus-visible:ring-1 focus-visible:ring-[#c4161c] dark:text-[#f87171]"
                >
                  Add
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
