import { ReceiptText } from 'lucide-react';
import type { Client } from 'fdoncall-practice/domain/types';
import { diffDays, todayInSouthAfrica, type ISODate } from 'fdoncall-practice/domain/dates';
import type { Invoice, InvoiceStatus, Quote } from '@/context/PracticeStoreContext';
import { EmptyStateCard } from '@/components/ui/list-primitives';
import { formatZar } from '@/components/quote/estimate-form';
import { cn } from '@/lib/utils';
import { computeInvoiceStatus } from '@/components/invoice/invoice-logic';

/* ---------------------------------------------------------------------------
 * Invoice register for the sales pipeline. Rows hand the invoice id to the
 * invoice editor through `onOpenInvoice` — the editor itself is a separate
 * screen, so this list never owns invoice state. `Overdue` is derived here;
 * the stored status stays whatever the editor saved.
 * ------------------------------------------------------------------------- */

const STATUS_STYLES: Record<InvoiceStatus | 'Overdue', string> = {
  Draft: 'border-border bg-card text-muted-foreground',
  Sent: 'border-[#c4161c]/25 bg-[#c4161c]/10 text-[#c4161c] dark:text-[#f87171]',
  Overdue: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  // Paid reads as settled with ink, not a green accent (brand rule).
  Paid: 'border-foreground/20 bg-foreground/[0.06] text-foreground',
};

export interface InvoicesListProps {
  invoices: Invoice[];
  clients: Client[];
  /** Quotes let a prospect-origin invoice resolve its trading name. */
  quotes?: Quote[];
  /** Seam for the invoice editor; the row is inert while it is absent. */
  onOpenInvoice?: (invoiceId: string) => void;
  today?: ISODate;
}

export function InvoicesList({
  invoices,
  clients,
  quotes = [],
  onOpenInvoice,
  today = todayInSouthAfrica(),
}: InvoicesListProps) {
  if (invoices.length === 0) {
    return (
      <EmptyStateCard
        icon={ReceiptText}
        title="No invoices yet"
        subtitle="An invoice raised from an accepted quote appears here with its number, client, total and status."
      />
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border bg-card">
      <table className="w-full min-w-[680px] text-left text-xs">
        <thead>
          <tr className="border-b border-border">
            {['Invoice', 'Client', 'Issued', 'Due', 'Total', 'Status', 'Age'].map((label) => (
              <th
                key={label}
                scope="col"
                className="whitespace-nowrap px-3 py-2 font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-muted-foreground"
              >
                {label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {invoices.map((invoice) => {
            const clientName =
              clients.find((client) => client.code === invoice.clientCode)?.name ??
              quotes.find((quote) => quote.id === invoice.quoteId)?.prospect?.name ??
              invoice.clientCode;
            const displayStatus = computeInvoiceStatus(invoice, today);
            const age = Math.max(0, diffDays(today, invoice.issueDate));

            return (
              <tr
                key={invoice.id}
                tabIndex={onOpenInvoice ? 0 : undefined}
                onClick={onOpenInvoice ? () => onOpenInvoice(invoice.id) : undefined}
                onKeyDown={
                  onOpenInvoice
                    ? (event) => {
                        if (event.key !== 'Enter' && event.key !== ' ') return;
                        event.preventDefault();
                        onOpenInvoice(invoice.id);
                      }
                    : undefined
                }
                aria-label={onOpenInvoice ? `Open invoice ${invoice.number}` : undefined}
                className={cn(
                  'border-b border-border/60 bg-transparent outline-none transition-colors last:border-b-0',
                  onOpenInvoice && 'cursor-pointer hover:bg-muted/40 focus-visible:bg-muted/40'
                )}
              >
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] font-medium text-foreground">
                  {invoice.number}
                </td>
                <td className="max-w-[260px] px-3 py-2.5">
                  <p className="truncate text-foreground">{clientName}</p>
                  <p className="font-mono text-[11px] text-muted-foreground">{invoice.clientCode}</p>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                  {invoice.issueDate}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] text-muted-foreground">
                  {invoice.dueDate}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono tabular-nums text-foreground">
                  {formatZar(invoice.total)}
                </td>
                <td className="whitespace-nowrap px-3 py-2.5">
                  <span
                    className={cn(
                      'inline-flex items-center rounded-full border px-1.5 py-0.5 font-mono text-[11px] leading-none',
                      STATUS_STYLES[displayStatus]
                    )}
                    data-invoice-list-status={displayStatus}
                  >
                    {displayStatus}
                  </span>
                </td>
                <td className="whitespace-nowrap px-3 py-2.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {age}d
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
