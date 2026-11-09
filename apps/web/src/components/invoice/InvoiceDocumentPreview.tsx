import { formatDate } from 'fdoncall-practice/domain/dates';
import type { Invoice, InvoiceStatus } from '@/context/PracticeStoreContext';
import { cn } from '@/lib/utils';
import { formatZar } from '@/components/quote/estimate-form';

export interface InvoiceDocumentPreviewProps {
  invoice: Invoice;
  clientName: string;
  clientCode: string;
  /** Derived display status: `Overdue` never lives on the record. */
  status: InvoiceStatus | 'Overdue';
  paymentTerms: string;
  paymentMethods: string[];
  contactName?: string;
}

const STATUS_PILL: Record<InvoiceStatus | 'Overdue', string> = {
  Draft: 'border-border bg-muted text-muted-foreground',
  Sent: 'border-[#c4161c]/25 bg-[#c4161c]/10 text-[#c4161c] dark:text-[#f87171]',
  Overdue: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  Paid: 'border-foreground/20 bg-foreground/[0.06] text-foreground',
};

/**
 * Live A4-style invoice document. Reads the same line items the editor
 * reconciles, so Subtotal / VAT / Total on the page always match the stored
 * invoice and the Xero preview.
 */
export function InvoiceDocumentPreview({
  invoice,
  clientName,
  clientCode,
  status,
  paymentTerms,
  paymentMethods,
  contactName,
}: InvoiceDocumentPreviewProps) {
  const draft = invoice.status === 'Draft';

  return (
    <article
      data-invoice-document
      data-invoice-status={status}
      className={cn(
        'mx-auto w-full max-w-[560px] rounded-xl border bg-card p-6 text-[11px] shadow-sm transition-colors',
        draft ? 'border-dashed border-border bg-muted/10' : 'border-border'
      )}
    >
      {draft && (
        <p
          data-invoice-draft
          className="mb-4 rounded-md border border-border bg-muted/50 px-2 py-1 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground"
        >
          Draft — not yet issued to the client
        </p>
      )}

      <header className="flex items-start justify-between gap-4 border-b border-border pb-4">
        <div className="flex items-center gap-2.5">
          <img
            src="/fd-on-call-logo.png"
            alt="FD on Call"
            className="h-9 w-9 rounded-md object-contain"
          />
          <div>
            <p className="font-serif text-base leading-tight text-foreground">FD on Call</p>
            <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
              Chartered Accountants (SA)
            </p>
          </div>
        </div>
        <div className="text-right">
          <p className="font-mono text-[9px] uppercase tracking-[0.16em] text-muted-foreground">
            Invoice
          </p>
          <p className="font-mono text-sm font-semibold text-[#c4161c]">{invoice.number}</p>
          <span
            data-invoice-status-pill
            className={cn(
              'mt-1 inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[9px]',
              STATUS_PILL[status]
            )}
          >
            {status}
          </span>
        </div>
      </header>

      <div className="grid grid-cols-2 gap-4 border-b border-border py-4">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            Bill to
          </p>
          <p className="mt-1 text-xs font-semibold text-foreground">{clientName}</p>
          {clientCode && <p className="font-mono text-[10px] text-muted-foreground">{clientCode}</p>}
          {contactName && <p className="mt-0.5 text-[10px] text-muted-foreground">Attn: {contactName}</p>}
        </div>
        <dl className="space-y-1 text-right font-mono text-[10px] text-muted-foreground">
          <div className="flex items-center justify-between gap-3">
            <dt>Issue date</dt>
            <dd className="text-foreground">{formatDate(invoice.issueDate)}</dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>Due date</dt>
            <dd className={cn(status === 'Overdue' ? 'text-amber-700 dark:text-amber-400' : 'text-foreground')}>
              {formatDate(invoice.dueDate)}
            </dd>
          </div>
          <div className="flex items-center justify-between gap-3">
            <dt>VAT</dt>
            <dd className="text-foreground">15%</dd>
          </div>
        </dl>
      </div>

      <table className="w-full border-collapse text-left">
        <thead>
          <tr className="border-y border-border bg-muted/40 font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            <th className="px-2 py-1.5">Service</th>
            <th className="px-2 py-1.5 text-right">Qty</th>
            <th className="px-2 py-1.5 text-right">Unit</th>
            <th className="px-2 py-1.5 text-right">Tax</th>
            <th className="px-2 py-1.5 text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {invoice.lineItems.length === 0 && (
            <tr>
              <td colSpan={5} className="px-2 py-6 text-center text-muted-foreground">
                No lines yet — add a fee line on the left.
              </td>
            </tr>
          )}
          {invoice.lineItems.map((line) => (
            <tr key={line.id} className="border-b border-border/60 align-top">
              <td className="px-2 py-1.5 text-foreground">{line.description || '—'}</td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                {line.quantity}
              </td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono tabular-nums text-muted-foreground">
                {formatZar(line.unitAmount)}
              </td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono text-[9px] uppercase text-muted-foreground">
                {line.taxType === 'OUTPUT2' ? '15%' : 'None'}
              </td>
              <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono tabular-nums text-foreground">
                {formatZar(line.lineAmount)}
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 space-y-1 border-t-2 border-foreground/80 pt-3 font-mono text-[11px]">
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">Subtotal (excl. VAT)</span>
          <span className="tabular-nums text-foreground">{formatZar(invoice.subtotal)}</span>
        </div>
        <div className="flex items-center justify-between gap-4">
          <span className="text-muted-foreground">VAT 15%</span>
          <span className="tabular-nums text-foreground">{formatZar(invoice.vat)}</span>
        </div>
        <div className="flex items-center justify-between gap-4 rounded-md bg-[#c4161c]/8 px-2 py-1.5 text-xs font-semibold">
          <span className="text-foreground">Total due</span>
          <span className="tabular-nums text-[#c4161c]">{formatZar(invoice.total)}</span>
        </div>
        <p className="pt-1 text-[9px] leading-snug text-muted-foreground">
          CIPC fees paid on your behalf carry no VAT. Amounts are exclusive of VAT unless the line
          reads None.
        </p>
      </div>

      <div className="mt-4 grid grid-cols-2 gap-4 border-t border-border py-3">
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            Payment terms
          </p>
          <p className="mt-0.5 text-foreground">{paymentTerms}</p>
        </div>
        <div>
          <p className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
            Payment method
          </p>
          <p className="mt-0.5 text-foreground">{paymentMethods.join(' · ') || '—'}</p>
        </div>
      </div>

      <p className="border-t border-border py-3 text-[10px] leading-relaxed text-muted-foreground">
        Thank you for your business. Please quote <span className="font-mono">{invoice.number}</span>{' '}
        with your payment. Queries about this invoice are welcome within 14 days of the issue date.
      </p>

      <footer className="mt-2 border-t border-border pt-3 text-center font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
        FD on Call · Chartered Accountants (SA) · fdoncall.co.za
      </footer>
    </article>
  );
}
