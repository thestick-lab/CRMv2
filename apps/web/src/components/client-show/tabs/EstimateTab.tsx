import * as React from 'react';
import type { Client } from 'fdoncall-practice/domain/types';
import {
  type Estimate,
  type EstimateInput,
  type EstimateKey,
  STANDARD_RATE,
  computeEstimate,
  suggestedMonths,
} from 'fdoncall-practice/domain/estimate';
import { payrollBand, turnoverBand } from 'fdoncall-practice/domain/pricing';
import { defaultServices } from 'fdoncall-practice/domain/rules';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarClock,
  Coins,
  Download,
  FileSpreadsheet,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function buildEstimateForClient(client: Client, startMonth = '2026-12'): Estimate {
  const turnover = client.turnover ?? 4_000_000;
  const employeeCount = client.employeeCount ?? (client.payroll ? 8 : 0);

  const tBand = turnoverBand(turnover);
  const pBand = payrollBand(employeeCount);

  const services = defaultServices(client);
  const selected: Partial<Record<EstimateKey, boolean>> = {};
  for (const s of services) {
    if (s === 'AFS') selected.AFS = true;
    if (s === 'ITR14') selected.ITR = true;
    if (s === 'IRP6') selected.IRP6 = true;
    if (s === 'VAT201') selected.VAT201 = true;
    if (s === 'EMP201') selected.EMP201 = true;
    if (s === 'EMP501') selected.EMP501 = true;
    if (s === 'CIPC_AR') selected.CIPC_AR = true;
    if (s === 'BO') selected.BO = true;
  }
  selected.BOOKKEEPING = true;
  if (client.payroll) selected.PAYROLL = true;

  const input: EstimateInput = {
    startMonth,
    entityType: client.entityType,
    yearEndMonth: client.yearEndMonth,
    vatCategory: client.vatCategory,
    turnover,
    payroll: client.payroll,
    employeeCount,
    provisionalTaxpayer: client.provisionalTaxpayer ?? true,
    directors: 2,
    rate: STANDARD_RATE,
    marchIncreasePct: 6,
    irp6Payable: true,
    selected,
    hours: {
      BOOKKEEPING: tBand?.accountingHours ?? 4,
      PAYROLL: pBand.band.payrollHours,
      MGMT: 0,
      AFS: tBand?.afsHours ?? 16,
      REVIEW: 0,
    },
    months: suggestedMonths({ entityType: client.entityType, yearEndMonth: client.yearEndMonth }),
    recharges: { XERO: 0, SIMPLEPAY: 0 },
  };

  return computeEstimate(input);
}

export function EstimateTab({
  client,
  onDownloadPdf,
  onDownloadExcel,
}: {
  client: Client;
  onDownloadPdf?: () => void;
  onDownloadExcel?: () => void;
}) {
  const [startMonth] = React.useState('2026-12');
  const estimate = React.useMemo(
    () => buildEstimateForClient(client, startMonth),
    [client, startMonth]
  );

  return (
    <div className="space-y-6">
      {/* Retainer KPI Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Retainer excl. VAT */}
        <div className="border border-border/80 rounded-lg p-4 bg-card/60 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>Smoothed Monthly Retainer</span>
            <Coins className="h-4 w-4 text-[#c4161c]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            R {estimate.average.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            R {estimate.averageInclVat.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} incl. 15% VAT
          </div>
        </div>

        {/* 12-Month Total */}
        <div className="border border-border/80 rounded-lg p-4 bg-card/60 space-y-1.5">
          <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
            <span>12-Month Projected Value</span>
            <CalendarClock className="h-4 w-4 text-[#c4161c]" />
          </div>
          <div className="text-2xl font-bold font-mono tracking-tight text-foreground">
            R {estimate.annual.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </div>
          <div className="text-[11px] text-muted-foreground font-mono">
            R {estimate.annualInclVat.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} incl. 15% VAT
          </div>
        </div>

        {/* March Escalation Info */}
        <div className="border border-border/80 rounded-lg p-4 bg-card/60 space-y-2 flex flex-col justify-between">
          <div>
            <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Annual Price Increase</span>
              <TrendingUp className="h-4 w-4 text-emerald-500" />
            </div>
            <div className="text-base font-semibold text-foreground mt-1 flex items-center gap-1.5">
              <span>+6% from {estimate.increaseFrom}</span>
              <Badge variant="success" className="text-[10px] py-0 px-1 font-mono">
                Active
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Standard practice rate: R {STANDARD_RATE}/hr
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            {onDownloadExcel && (
              <Button
                variant="outline"
                size="sm"
                onClick={onDownloadExcel}
                className="h-7 text-[11px] gap-1 px-2 font-mono flex-1"
              >
                <FileSpreadsheet className="h-3 w-3 text-emerald-500" />
                Excel (.xlsx)
              </Button>
            )}
            {onDownloadPdf && (
              <Button
                size="sm"
                onClick={onDownloadPdf}
                className="h-7 text-[11px] gap-1 px-2 font-mono flex-1"
              >
                <Download className="h-3 w-3" />
                PDF Quote
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 12-Month Matrix Table */}
      <div className="border border-border/80 rounded-lg bg-card/60 overflow-hidden shadow-xs">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              12-Month Rolling Practice Economics Matrix
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monthly service breakdown ({estimate.months[0]} to {estimate.months[11]}) with statutory filings and Xero pricing.
            </p>
          </div>
          <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
            All figures in ZAR (excl. VAT)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[900px]">
            <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border font-mono">
              <tr>
                <th className="py-2.5 px-3 font-medium min-w-[200px]">Service Line</th>
                {estimate.months.map((m) => {
                  const isMarch = m.endsWith('-03');
                  return (
                    <th
                      key={m}
                      className={cn(
                        'py-2.5 px-2 text-right font-medium',
                        isMarch ? 'text-[#c4161c] bg-[#c4161c]/5 font-semibold' : ''
                      )}
                    >
                      {m.slice(2)}
                      {isMarch && '*'}
                    </th>
                  );
                })}
                <th className="py-2.5 px-3 text-right font-medium">12-Mo Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono text-[11px]">
              {estimate.lines.map((line) => (
                <tr key={line.key} className="hover:bg-muted/30 transition-colors">
                  <td className="py-2 px-3 font-sans">
                    <div className="font-medium text-foreground">{line.label}</div>
                    <div className="text-[10px] text-muted-foreground">{line.detail}</div>
                  </td>

                  {line.amounts.map((amt, idx) => (
                    <td
                      key={idx}
                      className={cn(
                        'py-2 px-2 text-right',
                        amt > 0 ? 'text-foreground' : 'text-muted-foreground/40'
                      )}
                    >
                      {amt > 0 ? amt.toLocaleString('en-ZA') : '—'}
                    </td>
                  ))}

                  <td className="py-2 px-3 text-right font-semibold text-foreground">
                    R {line.total.toLocaleString('en-ZA')}
                  </td>
                </tr>
              ))}

              {/* Monthly Subtotal Excl. VAT */}
              <tr className="bg-muted/20 font-semibold border-t-2 border-border">
                <td className="py-2.5 px-3 font-sans text-foreground">Monthly Total (excl. VAT)</td>
                {estimate.totals.map((t, idx) => (
                  <td key={idx} className="py-2.5 px-2 text-right text-foreground">
                    {t.toLocaleString('en-ZA')}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right text-[#c4161c] font-bold">
                  R {estimate.annual.toLocaleString('en-ZA')}
                </td>
              </tr>

              {/* 15% VAT */}
              <tr className="text-muted-foreground bg-muted/10">
                <td className="py-1.5 px-3 font-sans">VAT 15%</td>
                {estimate.vatByMonth.map((v, idx) => (
                  <td key={idx} className="py-1.5 px-2 text-right">
                    {v.toLocaleString('en-ZA')}
                  </td>
                ))}
                <td className="py-1.5 px-3 text-right font-medium">
                  R {estimate.vat.toLocaleString('en-ZA')}
                </td>
              </tr>

              {/* Monthly Total Incl. VAT */}
              <tr className="bg-muted/40 font-bold border-t border-border">
                <td className="py-2.5 px-3 font-sans text-foreground">Invoice Total (incl. VAT)</td>
                {estimate.totalsInclVat.map((t, idx) => (
                  <td key={idx} className="py-2.5 px-2 text-right text-foreground">
                    {t.toLocaleString('en-ZA')}
                  </td>
                ))}
                <td className="py-2.5 px-3 text-right text-foreground">
                  R {estimate.annualInclVat.toLocaleString('en-ZA')}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
