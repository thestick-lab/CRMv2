import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { Client } from 'fdoncall-practice/domain/types';
import type { Estimate } from 'fdoncall-practice/domain/estimate';
import { cents } from 'fdoncall-practice/domain/estimate';
import type { Invoice } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CircleCheck, CloudUpload, Info, X } from 'lucide-react';
import {
  buildXeroDraftInvoicePayload,
  buildXeroEstimateDraftPayload,
  simulateXeroSync,
  type XeroSyncResult,
} from '@/lib/integrations/xero';

/**
 * What is being pushed: a saved invoice (the invoice editor path) or the
 * monthly retainer implied by a client's 12-month estimate (client Estimate tab).
 */
export type XeroSyncTarget =
  | { kind: 'invoice'; invoice: Invoice; client: Client }
  | { kind: 'estimate'; client: Client; estimate: Estimate };

export interface XeroSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: XeroSyncTarget;
  onSynced?: (result: XeroSyncResult) => void;
}

const zar = (value: number) =>
  `R ${value.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export function XeroSyncDialog({ open, onOpenChange, target, onSynced }: XeroSyncDialogProps) {
  const invoice = target.kind === 'invoice' ? target.invoice : undefined;
  const estimate = target.kind === 'estimate' ? target.estimate : undefined;
  const client = target.client;

  const [syncResult, setSyncResult] = React.useState<XeroSyncResult | null>(null);

  const payload = React.useMemo(() => {
    if (invoice) return buildXeroDraftInvoicePayload(invoice, client);
    if (estimate) return buildXeroEstimateDraftPayload(client, estimate);
    throw new Error('Xero sync needs an invoice or an estimate');
  }, [invoice, estimate, client]);

  const draft = payload.Invoices[0];
  const exclusiveSubtotal = cents(
    draft.LineItems.reduce((sum, line) => sum + line.Quantity * line.UnitAmount, 0)
  );
  const taxableSubtotal = cents(
    draft.LineItems.filter((line) => line.TaxType === 'OUTPUT2').reduce(
      (sum, line) => sum + line.Quantity * line.UnitAmount,
      0
    )
  );
  const vat = cents(taxableSubtotal * 0.15);

  React.useEffect(() => {
    if (!open) setSyncResult(null);
  }, [open]);

  const close = () => onOpenChange(false);

  const handleSync = () => {
    const source = invoice ?? { id: `estimate-${client.code}`, number: draft.Reference };
    const result = simulateXeroSync(source);
    setSyncResult(result);
    onSynced?.(result);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 max-h-[90vh] w-[calc(100vw-2rem)] max-w-2xl -translate-x-1/2 -translate-y-1/2 overflow-y-auto rounded-xl border border-border bg-card shadow-2xl outline-none">
          <header className="flex items-start justify-between gap-3 border-b border-border px-5 py-4">
            <div className="flex items-start gap-3">
              <span className="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-[#c4161c]/20 bg-[#c4161c]/10 text-[#c4161c]">
                <CloudUpload className="h-4 w-4" />
              </span>
              <div className="space-y-0.5">
                <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
                  Xero · accounting
                </p>
                <DialogPrimitive.Title className="font-serif text-lg leading-tight text-foreground">
                  Push draft invoice
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="max-w-md text-xs leading-relaxed text-muted-foreground">
                  ACCREC draft with exclusive amounts and per-line VAT treatment, exactly as the
                  practice bills in Xero.
                </DialogPrimitive.Description>
              </div>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded-md p-1.5 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
            >
              <X className="h-4 w-4" />
            </button>
          </header>

          {syncResult ? (
            <div className="space-y-4 px-5 py-8 text-center">
              <span className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#c4161c]/10 text-[#c4161c]">
                <CircleCheck className="h-6 w-6" />
              </span>
              <div className="space-y-1.5">
                <h3 className="text-sm font-semibold text-foreground">Draft invoice recorded</h3>
                <p className="mx-auto max-w-sm text-xs leading-relaxed text-muted-foreground">
                  {draft.Contact.Name} · {draft.Reference}. This is a simulated sync — nothing was
                  sent to Xero and the invoice id below is synthetic.
                </p>
              </div>
              <div className="mx-auto max-w-md space-y-2 rounded-lg border border-border bg-muted/30 px-4 py-3 text-left font-mono text-[11px]">
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Simulated Xero id</span>
                  <span className="truncate text-foreground">{syncResult.xeroInvoiceId}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Status</span>
                  <span className="text-foreground">{syncResult.status}</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-muted-foreground">Recorded at</span>
                  <span className="text-foreground">{syncResult.at}</span>
                </div>
              </div>
              <Button size="sm" onClick={close}>
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 px-5 py-4 text-xs">
              <div className="grid grid-cols-2 gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5 sm:grid-cols-4">
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Contact
                  </p>
                  <p className="mt-0.5 truncate font-medium text-foreground">
                    {draft.Contact.Name}
                  </p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Reference
                  </p>
                  <p className="mt-0.5 truncate font-mono text-foreground">{draft.Reference}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Type
                  </p>
                  <p className="mt-0.5 font-mono text-foreground">{draft.Type}</p>
                </div>
                <div>
                  <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">
                    Dates
                  </p>
                  <p className="mt-0.5 truncate font-mono text-foreground">
                    {draft.Date} → {draft.DueDate}
                  </p>
                </div>
              </div>

              <div className="overflow-hidden rounded-lg border border-border">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-border bg-muted/40 font-mono text-[10px] uppercase text-muted-foreground">
                    <tr>
                      <th className="px-3 py-2 font-medium">Description</th>
                      <th className="px-2 py-2 text-right font-medium">Qty</th>
                      <th className="px-2 py-2 text-right font-medium">Unit</th>
                      <th className="px-2 py-2 font-medium">Tax</th>
                      <th className="px-3 py-2 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60">
                    {draft.LineItems.map((line, index) => (
                      <tr key={`${line.Description}-${index}`} className="hover:bg-muted/20">
                        <td className="max-w-[16rem] truncate px-3 py-2 text-foreground" title={line.Description}>
                          {line.Description}
                          <span className="ml-1.5 font-mono text-[10px] text-muted-foreground">
                            {line.AccountCode}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-muted-foreground">
                          {line.Quantity}
                        </td>
                        <td className="px-2 py-2 text-right font-mono tabular-nums text-muted-foreground">
                          {zar(line.UnitAmount)}
                        </td>
                        <td className="px-2 py-2 font-mono text-[10px] text-muted-foreground">
                          {line.TaxType}
                        </td>
                        <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                          {zar(cents(line.Quantity * line.UnitAmount))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="space-y-1 border-t border-border/80 pt-2 font-mono text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal (excl. VAT)</span>
                  <span className="tabular-nums">{zar(exclusiveSubtotal)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>VAT 15% (OUTPUT2 lines)</span>
                  <span className="tabular-nums">{zar(vat)}</span>
                </div>
                <div className="flex justify-between border-t border-border/50 pt-1 text-sm font-bold text-foreground">
                  <span>Invoice total</span>
                  <span className="tabular-nums text-[#c4161c]">
                    {zar(cents(exclusiveSubtotal + vat))}
                  </span>
                </div>
              </div>

              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted-foreground">
                    API payload preview
                  </p>
                  <Badge variant="outline" className="font-mono text-[10px]">
                    POST /Invoices
                  </Badge>
                </div>
                <pre className="max-h-56 overflow-auto rounded-lg border border-border bg-muted/30 p-3 font-mono text-[10px] leading-relaxed text-foreground">
                  {JSON.stringify(payload, null, 2)}
                </pre>
              </div>

              <div className="flex items-start gap-2.5 rounded-lg border border-border/80 bg-muted/20 px-3 py-2.5">
                <Info className="mt-0.5 h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                <p className="leading-relaxed text-muted-foreground">
                  Simulated sync: the payload above is the real request body, but nothing is sent.
                  When the Xero connection in Settings → Integrations is enabled, the same payload
                  posts to the practice's tenant and Xero issues the invoice number.
                </p>
              </div>

              <footer className="flex items-center justify-end gap-2 border-t border-border pt-3">
                <Button variant="outline" size="sm" onClick={close}>
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSync} className="gap-1.5">
                  <CloudUpload className="h-3 w-3" />
                  Sync draft to Xero
                </Button>
              </footer>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
