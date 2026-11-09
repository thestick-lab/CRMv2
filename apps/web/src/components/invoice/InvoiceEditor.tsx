import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { Client } from 'fdoncall-practice/domain/types';
import { computeEstimate, cents, formatMonthShort } from 'fdoncall-practice/domain/estimate';
import {
  addDays,
  formatDate,
  formatMonthKey,
  todayInSouthAfrica,
} from 'fdoncall-practice/domain/dates';
import type {
  Invoice,
  InvoiceLine,
  InvoiceStatus,
  Quote,
} from '@/context/PracticeStoreContext';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import {
  buildXeroDraftInvoicePayload,
  simulateXeroSync,
  summariseXeroDraft,
  type XeroSyncResult,
} from '@/lib/integrations/xero';
import { cn } from '@/lib/utils';
import {
  billingMonthRange,
  entryDay,
  formatHours,
  releasedTimeEntries,
  timeInvoiceFeed,
} from '@/lib/billing';
import { Button } from '@/components/ui/button';
import { formatZar } from '@/components/quote/estimate-form';
import {
  Check,
  Clock,
  Cloud,
  Plus,
  Receipt,
  Send,
  Trash2,
  X,
} from 'lucide-react';
import {
  INVOICE_TAX_RATE,
  UNREGISTERED_CLIENT_CODE,
  computeInvoiceStatus,
  createInvoiceFromQuote,
  invoiceMonth,
  invoicePaymentDetails,
  nextUnbilledMonth,
  paymentTermsDays,
  reconcileInvoice,
} from './invoice-logic';
import { InvoiceDocumentPreview } from './InvoiceDocumentPreview';

export interface InvoiceEditorProps {
  /** Existing invoice to edit (Sales Pipeline → Invoices). */
  invoiceId?: string;
  /** Quote to raise the next unbilled month against (quote builder → Create Invoice). */
  initialQuote?: Quote;
  onClose: () => void;
}

const PAYMENT_TERMS = ['On presentation', '14 days', '30 days', '60 days'];
const PAYMENT_METHODS = ['EFT', 'Card', 'Debit order'];

const STATUS_PILL: Record<InvoiceStatus | 'Overdue', string> = {
  Draft: 'border-border bg-muted text-muted-foreground',
  Sent: 'border-[#c4161c]/25 bg-[#c4161c]/10 text-[#c4161c] dark:text-[#f87171]',
  Overdue: 'border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-400',
  Paid: 'border-foreground/20 bg-foreground/[0.06] text-foreground',
};

/**
 * Parse a numeric input without swallowing a leading minus while typing. The
 * uncontrolled input keeps the raw keystrokes, so "-" stays visible while the
 * field waits for its digits; only a finite value reaches the line.
 */
function parseAmount(raw: string): number | null {
  if (raw.trim() === '' || raw === '-' || raw === '-.') return null;
  const value = Number(raw);
  return Number.isFinite(value) ? value : null;
}

function initials(name: string): string {
  return name
    .split(/\s+/)
    .map((part) => part[0])
    .join('')
    .slice(0, 2)
    .toUpperCase();
}

/**
 * The invoice-builder pattern: an editable form on the left (client block, line
 * items, payment details) and the live branded document on the right. Totals
 * reconcile on every keystroke through `reconcileInvoice`, which shares the
 * per-line VAT basis with the Xero draft preview. `Overdue` is derived at
 * render time and is never written to the record.
 */
export function InvoiceEditor({ invoiceId, initialQuote, onClose }: InvoiceEditorProps) {
  const {
    clients,
    quotes,
    invoices,
    timeEntries,
    sequences,
    currentUser,
    addInvoice,
    updateInvoice,
    updateTimeEntry,
    logActivity,
  } = usePracticeStore();

  const today = todayInSouthAfrica();
  const [savedId, setSavedId] = React.useState<string | undefined>(invoiceId);
  const savedInvoice = invoices.find((invoice) => invoice.id === savedId);
  const quote =
    initialQuote ??
    (savedInvoice?.quoteId ? quotes.find((candidate) => candidate.id === savedInvoice.quoteId) : undefined);

  const clientCode =
    savedInvoice?.clientCode ?? quote?.clientCode ?? UNREGISTERED_CLIENT_CODE;
  const client = clients.find((candidate) => candidate.code === clientCode);
  const clientName = client?.name ?? quote?.prospect?.name ?? clientCode;
  const contactName = client?.contacts?.[0]?.name ?? quote?.prospect?.contactPerson;

  const initialMonth = savedInvoice
    ? invoiceMonth(savedInvoice)
    : quote
      ? nextUnbilledMonth(quote, invoices, today)
      : today.slice(0, 7);

  const seeded = React.useMemo(() => {
    if (savedInvoice) return savedInvoice;
    if (initialQuote) return createInvoiceFromQuote(initialQuote, initialMonth, sequences.invoice);
    return undefined;
    // Seeded once: later edits to the invoice are held in local state.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [lines, setLines] = React.useState<InvoiceLine[]>(seeded?.lineItems ?? []);
  const number = seeded?.number ?? 'INV-1';
  const [issueDate, setIssueDate] = React.useState(seeded?.issueDate ?? today);
  const [dueDate, setDueDate] = React.useState(seeded?.dueDate ?? addDays(today, 30));
  const [status, setStatus] = React.useState<InvoiceStatus>(seeded?.status ?? 'Draft');
  const initialPayment = invoicePaymentDetails(savedInvoice, quote?.paymentTerms);
  const [paymentTerms, setPaymentTerms] = React.useState(initialPayment.terms);
  const [paymentMethods, setPaymentMethods] = React.useState<string[]>(initialPayment.methods);
  const [month, setMonth] = React.useState(initialMonth);
  const [xeroResult, setXeroResult] = React.useState<XeroSyncResult | null>(null);
  const [feedback, setFeedback] = React.useState<{ tone: 'success' | 'error'; text: string } | null>(
    null
  );
  const [timePanelOpen, setTimePanelOpen] = React.useState(false);
  /**
   * Unbilled-time lines staged in this edit session: line id → the time-entry
   * ids the line bills. Entries only carry `invoiceId` once the invoice is
   * saved, so abandoning the editor leaves them unbilled.
   */
  const [stagedTime, setStagedTime] = React.useState<Record<string, string[]>>({});

  const totals = reconcileInvoice(lines, INVOICE_TAX_RATE);
  const months = quote ? computeEstimate(quote.estimateInput).months : [];
  const displayStatus = computeInvoiceStatus(
    { status, dueDate },
    today
  );

  const stagedEntryIds = React.useMemo(
    () => new Set(Object.values(stagedTime).flat()),
    [stagedTime]
  );

  /**
   * The client's unbilled billable time for the invoice month, split against
   * the quote's retainer allowance. `null` when no quote sets the billing
   * baseline — the panel then has nothing honest to offer.
   */
  const unbilledTime = React.useMemo(() => {
    if (!quote || clientCode === UNREGISTERED_CLIENT_CODE) return null;
    return timeInvoiceFeed(
      clientCode,
      billingMonthRange(month),
      timeEntries.filter((entry) => !stagedEntryIds.has(entry.id)),
      quote.monthlyRetainerHours,
      quote.adHocHourlyRate
    );
  }, [quote, clientCode, month, timeEntries, stagedEntryIds]);

  const draftInvoice: Invoice = {
    id: savedId ?? seeded?.id ?? `invoice-${quote?.id ?? 'manual'}-${month}`,
    number,
    quoteId: savedInvoice?.quoteId ?? quote?.id,
    clientCode,
    lineItems: lines,
    taxRate: INVOICE_TAX_RATE,
    ...totals,
    status,
    issueDate,
    dueDate,
    paymentTerms,
    paymentMethods,
    xeroSync: savedInvoice?.xeroSync,
    createdAt: savedInvoice?.createdAt ?? new Date().toISOString(),
  };

  const xeroClient = resolveXeroClient(client, quote, clientCode);
  const xeroPayload = xeroClient ? buildXeroDraftInvoicePayload(draftInvoice, xeroClient) : null;
  const xeroTotals = xeroPayload ? summariseXeroDraft(xeroPayload.Invoices[0]) : null;

  const log = (text: string, subline: string) => {
    logActivity({
      type: 'invoice',
      actorName: currentUser.name,
      actorInitials: initials(currentUser.name),
      tint: 'crimson',
      text,
      subline,
    });
  };

  const persist = (nextStatus: InvoiceStatus = status): Invoice => {
    const nextTotals = reconcileInvoice(lines, INVOICE_TAX_RATE);
    const record: Invoice = {
      ...draftInvoice,
      ...nextTotals,
      status: nextStatus,
    };

    if (savedInvoice) {
      updateInvoice(savedInvoice.id, {
        number: record.number,
        quoteId: record.quoteId,
        clientCode: record.clientCode,
        lineItems: record.lineItems,
        taxRate: record.taxRate,
        subtotal: record.subtotal,
        vat: record.vat,
        total: record.total,
        status: record.status,
        issueDate: record.issueDate,
        dueDate: record.dueDate,
        paymentTerms: record.paymentTerms,
        paymentMethods: record.paymentMethods,
        xeroSync: record.xeroSync,
      });
    } else {
      addInvoice(record);
      setSavedId(record.id);
    }

    // Time lines carry their entries with them: saving the invoice is what
    // marks those entries billed, so the next `Add unbilled time` pass cannot
    // offer them again.
    const billedEntryIds = Object.entries(stagedTime)
      .filter(([lineId]) => record.lineItems.some((line) => line.id === lineId))
      .flatMap(([, entryIds]) => entryIds);
    if (billedEntryIds.length > 0) {
      billedEntryIds.forEach((entryId) => updateTimeEntry(entryId, { invoiceId: record.id }));
      setStagedTime({});
      log(
        `Unbilled time added to ${record.number}`,
        `${billedEntryIds.length} entries · ${formatZar(record.total)} incl. 15% VAT`
      );
    }

    // The inverse: deleting a time line from a saved invoice must hand its
    // entries back to the unbilled feed. An entry left pointing at an invoice
    // that no longer bills it would never be offered again.
    if (savedInvoice) {
      const released = releasedTimeEntries(
        { id: record.id, lineItems: record.lineItems },
        timeEntries
      );
      if (released.length > 0) {
        released.forEach((entry) => updateTimeEntry(entry.id, { invoiceId: undefined }));
        log(
          `Time line removed from ${record.number}`,
          `${released.length} entries returned to the unbilled feed`
        );
      }
    }
    return record;
  };

  const handleSave = () => {
    persist();
    setFeedback({
      tone: 'success',
      text: savedInvoice ? `Changes to ${number} saved` : `Draft ${number} saved`,
    });
  };

  const handleSend = () => {
    if (status !== 'Draft') return;
    const record = persist('Sent');
    setStatus('Sent');
    setFeedback({ tone: 'success', text: `${record.number} sent to ${clientName}` });
    log(`Invoice ${record.number} sent to ${clientName}`, `${formatZar(record.total)} incl. 15% VAT`);
  };

  const handleMarkPaid = () => {
    if (status === 'Paid') return;
    const record = persist('Paid');
    setStatus('Paid');
    setFeedback({ tone: 'success', text: `${record.number} marked paid` });
    log(`Invoice ${record.number} marked paid`, `${formatZar(record.total)} received`);
  };

  const handlePushXero = () => {
    if (!xeroClient) {
      setFeedback({ tone: 'error', text: 'A client record is required before the Xero draft' });
      return;
    }
    const record = persist();
    const result = simulateXeroSync(record);
    updateInvoice(record.id, { xeroSync: 'synced' });
    setXeroResult(result);
    setFeedback({ tone: 'success', text: `${record.number} pushed to Xero as a draft` });
    log(`Invoice ${record.number} pushed to Xero`, `Draft ACCREC · ${result.xeroInvoiceId}`);
  };

  const handleMonthChange = (next: string) => {
    if (!quote || savedInvoice) return;
    setMonth(next);
    const regenerated = createInvoiceFromQuote(quote, next, sequences.invoice, { issueDate });
    setLines(regenerated.lineItems);
    // Regenerating the month's lines drops any staged time line, so release the
    // staging too — otherwise those still-unbilled entries stay hidden from the
    // feed the user has just switched away from and back to.
    setStagedTime({});
    setDueDate(addDays(issueDate, paymentTermsDays(paymentTerms)));
  };

  const handleLineChange = (id: string, patch: Partial<InvoiceLine>) => {
    setLines((previous) =>
      previous.map((line) => {
        if (line.id !== id) return line;
        const next = { ...line, ...patch };
        next.lineAmount = cents(next.quantity * cents(next.unitAmount));
        return next;
      })
    );
  };

  const addLine = () => {
    setLines((previous) => [
      ...previous,
      {
        id: `line-new-${Date.now()}-${previous.length + 1}`,
        description: '',
        quantity: 1,
        unitAmount: 0,
        taxType: 'OUTPUT2',
        lineAmount: 0,
      },
    ]);
  };

  const removeLine = (id: string) => {
    setLines((previous) => previous.filter((line) => line.id !== id));
    // Dropping the line also releases the entries it was going to bill.
    setStagedTime((previous) => {
      if (!previous[id]) return previous;
      const next = { ...previous };
      delete next[id];
      return next;
    });
  };

  /**
   * Confirm step's commit: append the overage line and remember which entries
   * it bills. Nothing is written to the store until the invoice is saved.
   */
  const addUnbilledTime = () => {
    if (!unbilledTime || unbilledTime.lines.length === 0) return;
    const [line] = unbilledTime.lines;
    setLines((previous) =>
      previous.some((existing) => existing.id === line.id) ? previous : [...previous, line]
    );
    setStagedTime((previous) => ({
      ...previous,
      [line.id]: unbilledTime.entries.map((entry) => entry.id),
    }));
    setTimePanelOpen(false);
    setFeedback({
      tone: 'success',
      text: `${formatHours(unbilledTime.overageMinutes)} overage added · ${formatZar(
        line.lineAmount
      )} excl. VAT`,
    });
  };

  const toggleMethod = (method: string) => {
    setPaymentMethods((previous) =>
      previous.includes(method)
        ? previous.filter((item) => item !== method)
        : [...previous, method]
    );
  };

  if (!seeded) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-background" data-invoice-editor>
        <div className="space-y-3 rounded-xl border border-border bg-card p-6 text-center">
          <p className="text-sm font-semibold text-foreground">No invoice to edit</p>
          <p className="text-xs text-muted-foreground">
            Raise an invoice from an accepted quote, or open one from the invoice register.
          </p>
          <Button type="button" variant="outline" size="sm" onClick={onClose}>
            Close
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-background" data-invoice-editor>
      <header className="flex items-center justify-between gap-3 border-b border-border bg-card px-4 py-2.5">
        <div className="flex min-w-0 items-center gap-3">
          <Button type="button" variant="ghost" size="icon" onClick={onClose} aria-label="Close invoice editor">
            <X className="h-4 w-4" />
          </Button>
          <div className="flex min-w-0 items-center gap-2">
            <span className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-muted/50">
              <Receipt className="h-3.5 w-3.5 text-[#c4161c]" />
            </span>
            <div className="min-w-0">
              <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                Invoice
              </p>
              <p className="truncate text-sm font-semibold text-foreground">{number}</p>
            </div>
            <span
              data-invoice-editor-status={displayStatus}
              className={cn(
                'ml-1 inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[10px] leading-none',
                STATUS_PILL[displayStatus]
              )}
            >
              {displayStatus}
            </span>
          </div>
        </div>
        <p className="hidden truncate text-[11px] text-muted-foreground sm:block">
          {clientName}
          {quote ? ` · from ${quote.number}` : ''}
        </p>
      </header>

      <div className="grid flex-1 overflow-hidden lg:grid-cols-2">
        <div className="space-y-4 overflow-y-auto border-border p-5 lg:border-r">
          {/* Client block — read-only, carried from the quote or client record. */}
          <section className="rounded-xl border border-border bg-card" data-invoice-client-block>
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-xs font-semibold text-foreground">Client</h2>
            </div>
            <dl className="grid grid-cols-2 gap-x-4 gap-y-2 px-4 py-3 text-[11px]">
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  Bill to
                </dt>
                <dd className="mt-0.5 font-medium text-foreground">{clientName}</dd>
                <dd className="font-mono text-[10px] text-muted-foreground">{clientCode}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  Entity
                </dt>
                <dd className="mt-0.5 text-foreground">
                  {client?.entityType ?? quote?.prospect?.entityType ?? '—'}
                </dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  Contact
                </dt>
                <dd className="mt-0.5 text-foreground">{contactName || '—'}</dd>
              </div>
              <div>
                <dt className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  Email
                </dt>
                <dd className="mt-0.5 truncate text-foreground">{client?.email ?? '—'}</dd>
              </div>
            </dl>
          </section>

          {/* Invoice details */}
          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-xs font-semibold text-foreground">Invoice details</h2>
            </div>
            <div className="grid grid-cols-2 gap-3 px-4 py-3">
              <label className="block text-[11px]">
                <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  Number
                </span>
                <input
                  value={number}
                  readOnly
                  aria-label="Invoice number"
                  className="mt-1 w-full rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-xs text-foreground"
                />
              </label>
              <label className="block text-[11px]">
                <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  Billing month
                </span>
                {quote && !savedInvoice ? (
                  <select
                    value={month}
                    aria-label="Billing month"
                    onChange={(event) => handleMonthChange(event.target.value)}
                    className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                  >
                    {months.map((option) => (
                      <option key={option} value={option}>
                        {formatMonthShort(option)}
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    value={formatMonthShort(month)}
                    readOnly
                    aria-label="Billing month"
                    className="mt-1 w-full rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-xs text-foreground"
                  />
                )}
              </label>
              <label className="block text-[11px]">
                <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  Issue date
                </span>
                <input
                  type="date"
                  value={issueDate}
                  aria-label="Issue date"
                  onChange={(event) => {
                    const value = event.target.value;
                    setIssueDate(value);
                    setDueDate(addDays(value, paymentTermsDays(paymentTerms)));
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                />
              </label>
              <label className="block text-[11px]">
                <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  Due date
                </span>
                <input
                  type="date"
                  value={dueDate}
                  aria-label="Due date"
                  onChange={(event) => setDueDate(event.target.value)}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 font-mono text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                />
              </label>
            </div>
          </section>

          {/* Line items */}
          <section className="rounded-xl border border-border bg-card" data-invoice-lines>
            <div className="flex items-center justify-between border-b border-border px-4 py-2.5">
              <h2 className="text-xs font-semibold text-foreground">Line items</h2>
              <div className="flex items-center gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  data-time-feed-open
                  onClick={() => setTimePanelOpen(true)}
                  disabled={!unbilledTime}
                  title={
                    unbilledTime
                      ? 'Bill the overage of this month’s unbilled time'
                      : 'A quote sets the retainer allowance and ad-hoc rate'
                  }
                  className="h-7 gap-1 px-2 text-[11px]"
                >
                  <Clock className="h-3 w-3" />
                  Add unbilled time
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addLine}
                  className="h-7 gap-1 px-2 text-[11px]"
                >
                  <Plus className="h-3 w-3" />
                  Add line
                </Button>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-left text-[11px]">
                <thead>
                  <tr className="border-b border-border/70">
                    {['Description', 'Qty', 'Unit price', 'Tax', 'Amount', ''].map((label) => (
                      <th
                        key={label || 'actions'}
                        scope="col"
                        className={cn(
                          'px-2 py-1.5 font-mono text-[9px] font-medium uppercase tracking-[0.1em] text-muted-foreground',
                          label === 'Qty' || label === 'Unit price' || label === 'Amount'
                            ? 'text-right'
                            : ''
                        )}
                      >
                        {label}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {lines.map((line, index) => (
                    <tr key={line.id} className="border-b border-border/50 last:border-b-0">
                      <td className="px-2 py-1.5">
                        <input
                          value={line.description}
                          aria-label={`Line ${index + 1} description`}
                          placeholder="Service or fee"
                          onChange={(event) =>
                            handleLineChange(line.id, { description: event.target.value })
                          }
                          className="w-full rounded border border-border bg-background px-1.5 py-1 text-[11px] text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                        />
                      </td>
                      <td className="w-16 px-2 py-1.5">
                        <input
                          type="number"
                          step="0.25"
                          defaultValue={line.quantity}
                          aria-label={`Line ${index + 1} quantity`}
                          onChange={(event) => {
                            const parsed = parseAmount(event.target.value);
                            if (parsed !== null) handleLineChange(line.id, { quantity: parsed });
                          }}
                          className="w-full rounded border border-border bg-background px-1.5 py-1 text-right font-mono text-[11px] tabular-nums text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                        />
                      </td>
                      <td className="w-24 px-2 py-1.5">
                        <input
                          type="number"
                          step="0.01"
                          defaultValue={line.unitAmount}
                          aria-label={`Line ${index + 1} unit price`}
                          onChange={(event) => {
                            const parsed = parseAmount(event.target.value);
                            if (parsed !== null) handleLineChange(line.id, { unitAmount: parsed });
                          }}
                          className="w-full rounded border border-border bg-background px-1.5 py-1 text-right font-mono text-[11px] tabular-nums text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                        />
                      </td>
                      <td className="w-24 px-2 py-1.5">
                        <select
                          value={line.taxType}
                          aria-label={`Line ${index + 1} tax type`}
                          onChange={(event) =>
                            handleLineChange(line.id, {
                              taxType: event.target.value as InvoiceLine['taxType'],
                            })
                          }
                          className="w-full rounded border border-border bg-background px-1 py-1 text-[10px] text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                        >
                          <option value="OUTPUT2">15%</option>
                          <option value="NONE">None</option>
                        </select>
                      </td>
                      <td className="whitespace-nowrap px-2 py-1.5 text-right font-mono tabular-nums text-foreground">
                        {formatZar(line.lineAmount)}
                      </td>
                      <td className="px-1 py-1.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          aria-label={`Remove line ${index + 1}`}
                          onClick={() => removeLine(line.id)}
                          className="h-7 w-7 text-muted-foreground hover:text-[#c4161c]"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="border-t border-border bg-muted/20 font-mono text-[11px]">
                    <td colSpan={4} className="px-2 py-1.5 text-right text-muted-foreground">
                      Subtotal excl. VAT
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-foreground">
                      {formatZar(totals.subtotal)}
                    </td>
                    <td />
                  </tr>
                  <tr className="bg-muted/20 font-mono text-[11px]">
                    <td colSpan={4} className="px-2 py-1.5 text-right text-muted-foreground">
                      VAT 15%
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-foreground">
                      {formatZar(totals.vat)}
                    </td>
                    <td />
                  </tr>
                  <tr className="border-t border-border bg-muted/30 font-mono text-xs font-semibold">
                    <td colSpan={4} className="px-2 py-1.5 text-right text-foreground">
                      Total
                    </td>
                    <td className="whitespace-nowrap px-2 py-1.5 text-right tabular-nums text-[#c4161c]">
                      {formatZar(totals.total)}
                    </td>
                    <td />
                  </tr>
                </tfoot>
              </table>
            </div>
            <p className="border-t border-border/60 px-4 py-2 text-[10px] leading-relaxed text-muted-foreground">
              VAT is fixed at 15% and reconciled per line. Only CIPC fees paid on the client's
              behalf use <span className="font-mono">None</span>.
            </p>
            {unbilledTime && quote && (
              <p
                data-time-feed-hint
                className="border-t border-border/60 px-4 py-2 font-mono text-[10px] leading-relaxed text-muted-foreground"
              >
                {formatHours(unbilledTime.billableMinutes)} unbilled billable ·{' '}
                {formatHours(unbilledTime.coveredMinutes)} inside the{' '}
                {formatHours(quote.monthlyRetainerHours * 60)} retainer
                {unbilledTime.overageMinutes > 0
                  ? ` · ${formatHours(unbilledTime.overageMinutes)} overage at ${formatZar(
                      quote.adHocHourlyRate
                    )}/h`
                  : ' · nothing to bill'}
              </p>
            )}
          </section>

          {/* Payment details */}
          <section className="rounded-xl border border-border bg-card">
            <div className="border-b border-border px-4 py-2.5">
              <h2 className="text-xs font-semibold text-foreground">Payment details</h2>
            </div>
            <div className="grid gap-3 px-4 py-3 sm:grid-cols-2">
              <label className="block text-[11px]">
                <span className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  Terms
                </span>
                <select
                  value={paymentTerms}
                  aria-label="Payment terms"
                  onChange={(event) => {
                    const terms = event.target.value;
                    setPaymentTerms(terms);
                    setDueDate(addDays(issueDate, paymentTermsDays(terms)));
                  }}
                  className="mt-1 w-full rounded-md border border-border bg-background px-2 py-1.5 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                >
                  {PAYMENT_TERMS.map((term) => (
                    <option key={term} value={term}>
                      {term}
                    </option>
                  ))}
                </select>
              </label>
              <fieldset>
                <legend className="font-mono text-[9px] uppercase tracking-wide text-muted-foreground">
                  Methods
                </legend>
                <div className="mt-1 flex flex-wrap gap-3">
                  {PAYMENT_METHODS.map((method) => (
                    <label key={method} className="inline-flex items-center gap-1.5 text-[11px] text-foreground">
                      <input
                        type="checkbox"
                        checked={paymentMethods.includes(method)}
                        onChange={() => toggleMethod(method)}
                        className="h-3.5 w-3.5 accent-[#c4161c]"
                      />
                      {method}
                    </label>
                  ))}
                </div>
              </fieldset>
            </div>
          </section>
        </div>

        {/* Live document + Xero draft pane */}
        <div className="space-y-4 overflow-y-auto bg-muted/20 p-5">
          <InvoiceDocumentPreview
            invoice={draftInvoice}
            clientName={clientName}
            clientCode={clientCode}
            status={displayStatus}
            paymentTerms={paymentTerms}
            paymentMethods={paymentMethods}
            contactName={contactName}
          />

          <section className="rounded-xl border border-border bg-card" data-xero-pane>
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-2.5">
              <div className="flex items-center gap-2">
                <Cloud className="h-3.5 w-3.5 text-muted-foreground" />
                <h2 className="text-xs font-semibold text-foreground">Xero</h2>
                <span
                  data-xero-sync={savedInvoice?.xeroSync ?? 'not-synced'}
                  className={cn(
                    'inline-flex rounded-full border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wide',
                    savedInvoice?.xeroSync === 'synced'
                      ? 'border-foreground/20 bg-foreground/[0.06] text-foreground'
                      : 'border-border bg-muted text-muted-foreground'
                  )}
                >
                  {savedInvoice?.xeroSync ?? 'Not pushed'}
                </span>
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handlePushXero}
                disabled={!xeroClient || savedInvoice?.xeroSync === 'synced'}
                className="h-7 gap-1 px-2 text-[11px]"
              >
                <Cloud className="h-3 w-3" />
                Push to Xero (draft)
              </Button>
            </div>
            <div className="space-y-2 px-4 py-3 text-[11px]">
              <p className="text-muted-foreground">
                ACCREC draft · amounts exclusive · every revenue line{' '}
                <span className="font-mono text-foreground">OUTPUT2</span>, CIPC disbursements{' '}
                <span className="font-mono text-foreground">NONE</span>.
              </p>
              {xeroTotals && (
                <p className="font-mono text-[10px] text-muted-foreground" data-xero-parity>
                  Xero totals: {formatZar(xeroTotals.exclusiveSubtotal)} +{' '}
                  {formatZar(xeroTotals.vat)} VAT = {formatZar(xeroTotals.total)}
                  {xeroTotals.total === totals.total ? ' · reconciled' : ' · differs from document'}
                </p>
              )}
              {xeroResult && (
                <p className="rounded-md border border-border bg-muted/40 px-2 py-1.5 font-mono text-[10px] text-foreground" data-xero-result>
                  Synced draft {xeroResult.xeroInvoiceId} · {formatDate(xeroResult.at.slice(0, 10))}
                </p>
              )}
              {xeroPayload ? (
                <details>
                  <summary className="cursor-pointer rounded-sm font-mono text-[10px] uppercase tracking-wide text-muted-foreground outline-none hover:text-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]">
                    Payload preview
                  </summary>
                  <pre
                    data-xero-payload
                    className="mt-2 max-h-64 overflow-auto rounded-md border border-border bg-background p-2 font-mono text-[9px] leading-relaxed text-foreground"
                  >
                    {JSON.stringify(xeroPayload, null, 2)}
                  </pre>
                </details>
              ) : (
                <p className="text-muted-foreground">
                  A client record (or a prospect on the quote) is required to build the Xero draft.
                </p>
              )}
            </div>
          </section>
        </div>
      </div>

      <DialogPrimitive.Root open={timePanelOpen} onOpenChange={setTimePanelOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-[60] bg-black/60 backdrop-blur-xs" />
          <DialogPrimitive.Content
            data-time-feed-panel
            className="fixed left-1/2 top-1/2 z-[60] max-h-[90vh] w-[calc(100vw-2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl outline-none"
          >
            <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
              <div className="flex items-start gap-3">
                <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#c4161c]/20 bg-[#c4161c]/10 text-[#c4161c]">
                  <Clock className="h-4 w-4" />
                </span>
                <div>
                  <p className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                    Unbilled time
                  </p>
                  <DialogPrimitive.Title className="font-serif text-lg leading-tight text-foreground">
                    Add unbilled time
                  </DialogPrimitive.Title>
                  <DialogPrimitive.Description className="max-w-xs text-xs leading-relaxed text-muted-foreground">
                    {clientName} · {formatMonthKey(month)}
                  </DialogPrimitive.Description>
                </div>
              </div>
              <DialogPrimitive.Close asChild>
                <button
                  type="button"
                  aria-label="Close unbilled time"
                  className="rounded-md p-1 text-muted-foreground outline-none transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </DialogPrimitive.Close>
            </header>

            {unbilledTime && quote && (
              <div className="space-y-3 px-5 py-4">
                <div className="grid grid-cols-3 divide-x divide-border rounded-lg border border-border">
                  {(
                    [
                      {
                        id: 'billable',
                        label: 'Billable this month',
                        value: formatHours(unbilledTime.billableMinutes),
                        tone: 'text-foreground',
                      },
                      {
                        id: 'covered',
                        label: 'Retainer covers',
                        value: formatHours(unbilledTime.coveredMinutes),
                        tone: 'text-muted-foreground',
                      },
                      {
                        id: 'overage',
                        label: 'Overage',
                        value: formatHours(unbilledTime.overageMinutes),
                        tone:
                          unbilledTime.overageMinutes > 0
                            ? 'text-[#c4161c] dark:text-[#f87171]'
                            : 'text-muted-foreground',
                      },
                    ] as const
                  ).map((cell) => (
                    <div key={cell.id} data-time-feed-cell={cell.id} className="px-3 py-2">
                      <p className="font-mono text-[9px] uppercase tracking-[0.1em] text-muted-foreground">
                        {cell.label}
                      </p>
                      <p className={cn('mt-0.5 font-mono text-sm tabular-nums', cell.tone)}>
                        {cell.value}
                      </p>
                    </div>
                  ))}
                </div>

                {unbilledTime.entries.length > 0 ? (
                  <ul className="divide-y divide-border/60 rounded-lg border border-border">
                    {unbilledTime.entries.slice(0, 5).map((entry) => (
                      <li
                        key={entry.id}
                        className="flex items-center justify-between gap-3 px-3 py-1.5 text-[11px]"
                      >
                        <span className="min-w-0">
                          <span className="font-mono text-[10px] text-muted-foreground">
                            {formatDate(entryDay(entry.startedAt))}
                          </span>
                          <span className="mx-1.5 text-muted-foreground/50">·</span>
                          <span className="truncate text-foreground">{entry.description}</span>
                        </span>
                        <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
                          {formatHours(entry.roundedMinutes)}
                        </span>
                      </li>
                    ))}
                    {unbilledTime.entries.length > 5 && (
                      <li className="px-3 py-1.5 font-mono text-[10px] text-muted-foreground">
                        +{unbilledTime.entries.length - 5} more entries in the month
                      </li>
                    )}
                  </ul>
                ) : (
                  <p className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground">
                    No billable time was logged for {clientName} in {formatMonthKey(month)}.
                  </p>
                )}

                {unbilledTime.lines.length > 0 ? (
                  <div
                    data-time-feed-line
                    className="rounded-lg border border-[#c4161c]/25 bg-[#c4161c]/5 px-3 py-2.5"
                  >
                    <p className="text-[11px] font-medium text-foreground">
                      {unbilledTime.lines[0].description}
                    </p>
                    <p className="mt-0.5 font-mono text-[10px] tabular-nums text-muted-foreground">
                      {formatHours(unbilledTime.overageMinutes)} ×{' '}
                      {formatZar(quote.adHocHourlyRate)} ={' '}
                      <span className="text-foreground">
                        {formatZar(unbilledTime.lines[0].lineAmount)}
                      </span>{' '}
                      excl. VAT ·{' '}
                      {formatZar(
                        cents(
                          unbilledTime.lines[0].quantity *
                            unbilledTime.lines[0].unitAmount *
                            INVOICE_TAX_RATE
                        )
                      )}{' '}
                      VAT
                    </p>
                  </div>
                ) : (
                  <p
                    data-time-feed-inside
                    className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[11px] leading-relaxed text-muted-foreground"
                  >
                    All logged time is inside the{' '}
                    {formatHours(quote.monthlyRetainerHours * 60)} retainer — the fee lines above
                    already pay for it, so no line is added.
                  </p>
                )}

                <p className="text-[10px] leading-relaxed text-muted-foreground">
                  The invoice month follows the issue date ({formatMonthShort(month)}). Entries are
                  marked invoiced when this invoice is saved, so they can never be billed twice.
                </p>
              </div>
            )}

            {unbilledTime && (
              <footer className="flex flex-wrap items-center justify-end gap-2 border-t border-border px-5 py-3">
                <DialogPrimitive.Close asChild>
                  <Button type="button" size="sm" variant="outline">
                    Cancel
                  </Button>
                </DialogPrimitive.Close>
                <Button
                  type="button"
                  size="sm"
                  data-time-feed-confirm
                  onClick={addUnbilledTime}
                  disabled={unbilledTime.lines.length === 0}
                >
                  {unbilledTime.lines.length === 0 ? 'Nothing to bill' : 'Add overage line'}
                </Button>
              </footer>
            )}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      {feedback && (
        <div
          role="status"
          aria-live="polite"
          className={cn(
            'fixed bottom-20 left-1/2 z-[60] -translate-x-1/2 rounded-lg border px-3.5 py-2 text-xs shadow-lg',
            feedback.tone === 'success'
              ? 'border-border bg-card text-foreground'
              : 'border-[#c4161c]/30 bg-card text-[#c4161c]'
          )}
        >
          {feedback.text}
        </div>
      )}

      <footer className="flex flex-wrap items-center justify-between gap-3 border-t border-border bg-card px-4 py-3">
        <p className="text-[10px] text-muted-foreground">
          Status changes save through <span className="font-mono">UPDATE_INVOICE</span> and appear in
          the Governance Log. Overdue is derived from the due date, never stored.
        </p>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleSave} className="gap-1.5 text-xs">
            <Check className="h-3.5 w-3.5" />
            Save
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSend}
            disabled={status !== 'Draft'}
            className="gap-1.5 text-xs"
          >
            <Send className="h-3.5 w-3.5" />
            Send
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleMarkPaid}
            disabled={status === 'Paid'}
            className="gap-1.5 text-xs"
          >
            <Receipt className="h-3.5 w-3.5" />
            Mark Paid
          </Button>
        </div>
      </footer>
    </div>
  );
}

/** Client shape for the Xero payload when the quote is still a prospect. */
function resolveXeroClient(
  client: Client | undefined,
  quote: Quote | undefined,
  clientCode: string
): Client | undefined {
  if (client) return client;
  const prospect = quote?.prospect;
  if (!prospect) return undefined;
  return {
    code: clientCode,
    name: prospect.name,
    entityType: prospect.entityType,
    yearEndMonth: prospect.yearEndMonth ?? 2,
    yearEndAssumed: true,
    turnover: prospect.turnover,
    vatCategory: prospect.vatCategory,
    payroll: Boolean(prospect.payroll),
    employeeCount: prospect.employeeCount,
    staffId: prospect.staffId ?? quote.ownerStaffId,
    status: 'Active',
    efilingProfile: 'client',
    lastAfsYear: null,
    lastIncomeTaxYear: null,
    lastAnnualReturnYear: null,
    beneficialOwnershipFiled: null,
    taxElsewhere: false,
  };
}
