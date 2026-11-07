import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import type { Client } from 'fdoncall-practice/domain/types';
import type { Estimate } from 'fdoncall-practice/domain/estimate';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  FileSpreadsheet,
  RefreshCw,
  X,
} from 'lucide-react';

export interface XeroInvoiceLine {
  description: string;
  accountCode: string;
  amount: number;
  taxType: '15% VAT on Income' | 'Zero Rated / Exempt';
}

export interface XeroInvoiceDraft {
  contactName: string;
  clientCode: string;
  frequency: string;
  lines: XeroInvoiceLine[];
  subtotal: number;
  vat: number;
  total: number;
}

export function buildXeroInvoiceDraft(client: Client, est: Estimate): XeroInvoiceDraft {
  const activeLines = est.lines.filter((l) => l.total > 0);

  const invoiceLines: XeroInvoiceLine[] = activeLines.map((line) => {
    // Pro-rata monthly portion of this service line
    const monthlyShare = Math.round((line.total / 12) * 100) / 100;

    let accountCode = '200 - Accounting Fees';
    if (line.group === 'Compliance') accountCode = '210 - Tax & Statutory';
    if (line.group === 'Annual work') accountCode = '220 - Annual Financial Statements';
    if (line.group === 'Recharges') accountCode = '230 - Software Subscriptions';

    const taxType = line.vatable ? '15% VAT on Income' : 'Zero Rated / Exempt';

    return {
      description: `Monthly Retainer: ${line.label}`,
      accountCode,
      amount: monthlyShare,
      taxType,
    };
  });

  // Reconcile rounding pennies with est.average
  const lineSum = invoiceLines.reduce((sum, l) => sum + l.amount, 0);
  const diff = Math.round((est.average - lineSum) * 100) / 100;
  if (diff !== 0 && invoiceLines.length > 0) {
    invoiceLines[0].amount = Math.round((invoiceLines[0].amount + diff) * 100) / 100;
  }

  const vat = Math.round((est.vat / 12) * 100) / 100;
  const total = est.averageInclVat;

  return {
    contactName: client.name,
    clientCode: client.code,
    frequency: 'Monthly Repeating (Billed 1st of each month)',
    lines: invoiceLines,
    subtotal: est.average,
    vat,
    total,
  };
}

export interface XeroSyncDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  client: Client;
  estimate: Estimate;
  onSynced?: () => void;
}

export function XeroSyncDialog({
  open,
  onOpenChange,
  client,
  estimate,
  onSynced,
}: XeroSyncDialogProps) {
  const draft = React.useMemo(() => buildXeroInvoiceDraft(client, estimate), [client, estimate]);
  const [isSynced, setIsSynced] = React.useState(false);

  const handleSync = () => {
    setIsSynced(true);
    if (onSynced) onSynced();
  };

  const handleClose = () => {
    onOpenChange(false);
    setTimeout(() => setIsSynced(false), 300);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs transition-opacity" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-full max-w-xl -translate-x-1/2 -translate-y-1/2 rounded-lg border border-border bg-card p-6 shadow-2xl transition-all outline-none space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-border/80">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-[#13b5ea]/15 text-[#13b5ea] flex items-center justify-center shrink-0">
                <FileSpreadsheet className="h-4 w-4" />
              </div>
              <div>
                <DialogPrimitive.Title className="text-sm font-semibold text-foreground">
                  Sync Xero 15% VAT Repeating Draft Invoice
                </DialogPrimitive.Title>
                <DialogPrimitive.Description className="text-xs text-muted-foreground font-mono">
                  Xero API v2 • Partner Cloud Ledger Sync
                </DialogPrimitive.Description>
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-1 rounded text-muted-foreground hover:bg-muted hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {isSynced ? (
            <div className="py-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/15 text-emerald-500 mx-auto flex items-center justify-center">
                <CheckCircle2 className="h-6 w-6" />
              </div>
              <h3 className="text-base font-semibold text-foreground">
                Draft Repeating Invoice Created in Xero
              </h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto font-sans">
                Monthly repeating invoice synced to Xero organization ledger for {draft.contactName} with 15% VAT and chart of accounts mapping.
              </p>
              <Button size="sm" onClick={handleClose} className="mt-2 text-xs">
                Close
              </Button>
            </div>
          ) : (
            <div className="space-y-4 text-xs font-sans">
              {/* Draft Info Header */}
              <div className="flex items-center justify-between p-3 rounded-md border border-border/80 bg-muted/20 text-xs">
                <div>
                  <div className="font-semibold text-foreground">{draft.contactName}</div>
                  <div className="text-[11px] font-mono text-muted-foreground">{draft.frequency}</div>
                </div>
                <Badge variant="outline" className="font-mono text-xs text-[#c4161c]">
                  {draft.clientCode}
                </Badge>
              </div>

              {/* Line Items Table */}
              <div className="border border-border/80 rounded-md overflow-hidden max-h-56 overflow-y-auto">
                <table className="w-full text-left text-xs">
                  <thead className="bg-muted/40 text-muted-foreground uppercase text-[10px] font-mono border-b border-border">
                    <tr>
                      <th className="py-2 px-3 font-medium">Description</th>
                      <th className="py-2 px-2 font-medium">Account</th>
                      <th className="py-2 px-2 font-medium">Tax Rate</th>
                      <th className="py-2 px-3 text-right font-medium">Amount</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/60 font-mono text-[11px]">
                    {draft.lines.map((l, idx) => (
                      <tr key={idx} className="hover:bg-muted/30">
                        <td className="py-1.5 px-3 font-sans truncate max-w-[200px] text-foreground">
                          {l.description}
                        </td>
                        <td className="py-1.5 px-2 text-muted-foreground">{l.accountCode.split(' - ')[0]}</td>
                        <td className="py-1.5 px-2 text-muted-foreground font-sans text-[10px]">{l.taxType.split(' ')[0]}</td>
                        <td className="py-1.5 px-3 text-right font-semibold text-foreground">
                          R {l.amount.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Totals */}
              <div className="pt-2 border-t border-border/80 space-y-1 font-mono text-xs">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal (excl. VAT):</span>
                  <span>R {draft.subtotal.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>SARS VAT 15%:</span>
                  <span>R {draft.vat.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                </div>
                <div className="flex justify-between text-foreground font-bold pt-1 border-t border-border/50 text-sm">
                  <span>Repeating Monthly Total:</span>
                  <span className="text-[#c4161c]">
                    R {draft.total.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </span>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center justify-end gap-2 pt-2 border-t border-border/80">
                <Button variant="outline" size="sm" onClick={handleClose} className="text-xs">
                  Cancel
                </Button>
                <Button size="sm" onClick={handleSync} className="text-xs gap-1.5 font-mono bg-[#13b5ea] hover:bg-[#0fa0cf] text-white">
                  <RefreshCw className="h-3 w-3" />
                  Sync to Xero
                </Button>
              </div>
            </div>
          )}
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
