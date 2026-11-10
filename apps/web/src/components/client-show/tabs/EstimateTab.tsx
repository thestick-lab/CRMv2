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
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { downloadExcelQuote, downloadPdfQuote } from '@/lib/export-actions';
import { XeroSyncDialog } from '@/components/integrations/XeroSyncDialog';
import { QuoteBuilderView } from '@/components/quote/QuoteBuilderView';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  CalendarClock,
  Coins,
  Download,
  FileSpreadsheet,
  RefreshCw,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { usePracticeStore } from '@/context/PracticeStoreContext';

export function buildEstimateForClient(
  client: Client,
  startMonth = '2026-12',
  rate = STANDARD_RATE,
  marchIncreasePct = 6
): Estimate {
  const turnover = client.turnover ?? 4_000_000;
  const employeeCount = client.employeeCount ?? (client.payroll ? 8 : 0);

  const tBand = turnoverBand(turnover);
  const pBand = payrollBand(employeeCount);

  const services = defaultServices(client);
  const serviceSet = new Set(services);
  const selected: Partial<Record<EstimateKey, boolean>> = {
    BOOKKEEPING: client.entityType !== 'Individual',
    PAYROLL: client.payroll,
    AFS: serviceSet.has('AFS'),
    ITR: serviceSet.has('ITR14') || serviceSet.has('ITR12') || serviceSet.has('ITR12T'),
    IRP6: serviceSet.has('IRP6'),
    VAT201: serviceSet.has('VAT201'),
    EMP201: serviceSet.has('EMP201'),
    EMP501: serviceSet.has('EMP501'),
    CIPC_AR: serviceSet.has('CIPC_AR'),
    BO: serviceSet.has('BO'),
  };

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
    rate,
    marchIncreasePct,
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
  const [xeroOpen, setXeroOpen] = React.useState(false);
  const [builderOpen, setBuilderOpen] = React.useState(false);
  const { rates } = usePracticeStore();
  const estimate = React.useMemo(
    () => buildEstimateForClient(client, startMonth, rates.standardHourlyRate, rates.marchEscalationPct),
    [client, startMonth, rates]
  );

  const handlePdf = onDownloadPdf ?? (() => downloadPdfQuote(client, estimate, todayInSouthAfrica()));
  const handleExcel = onDownloadExcel ?? (() => downloadExcelQuote(client, estimate, todayInSouthAfrica()));

  return (
    <div className="space-y-6">
      {/* Retainer KPI Summary Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Retainer excl. VAT */}
        <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
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
        <div className="rounded-xl border border-border bg-card p-4 space-y-1.5">
          <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
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
        <div className="flex flex-col justify-between space-y-2 rounded-xl border border-border bg-card p-4">
          <div>
            <div className="text-[11px] font-mono uppercase tracking-wider text-muted-foreground flex items-center justify-between">
              <span>Annual Price Increase</span>
              <TrendingUp className="h-4 w-4 text-[#c4161c]" />
            </div>
            <div className="text-base font-semibold text-foreground mt-1 flex items-center gap-1.5">
              <span>+{rates.marchEscalationPct}% from {estimate.increaseFrom}</span>
              <Badge variant="secondary" className="text-[11px] py-0 px-1 font-mono">
                Active
              </Badge>
            </div>
            <div className="text-[11px] text-muted-foreground mt-0.5">
              Standard practice rate: R {rates.standardHourlyRate}/hr
            </div>
          </div>

          <div className="flex items-center gap-2 pt-1 border-t border-border/50">
            <Button
              variant="outline"
              size="sm"
              onClick={handleExcel}
              className="h-7 text-[11px] gap-1 px-2 font-mono flex-1"
            >
              <FileSpreadsheet className="h-3 w-3 text-muted-foreground" />
              Excel
            </Button>
            <Button
              size="sm"
              onClick={handlePdf}
              className="h-7 text-[11px] gap-1 px-2 font-mono flex-1"
            >
              <Download className="h-3 w-3" />
              PDF
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setXeroOpen(true)}
              className="h-7 text-[11px] gap-1 px-2 font-mono flex-1 text-[#c4161c] hover:text-[#c4161c] border-[#c4161c]/30 hover:bg-[#c4161c]/10"
            >
              <RefreshCw className="h-3 w-3" />
              Xero
            </Button>
          </div>
        </div>
      </div>

      {/* 12-Month Matrix Table */}
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="p-4 border-b border-border/60 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              12-Month Rolling Practice Economics Matrix
            </h2>
            <p className="text-xs text-muted-foreground mt-0.5">
              Monthly service breakdown ({estimate.months[0]} to {estimate.months[11]}) with statutory filings and Xero pricing.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[11px] font-mono text-muted-foreground bg-muted px-2 py-0.5 rounded">
              All figures in ZAR (excl. VAT)
            </span>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setBuilderOpen(true)}
              className="h-7 gap-1 text-[11px] font-mono px-2"
            >
              <RefreshCw className="h-3 w-3" />
              Re-quote
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left min-w-[900px]">
            <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[11px] border-b border-border font-mono">
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
                    <div className="text-[11px] text-muted-foreground">{line.detail}</div>
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
      <XeroSyncDialog
        open={xeroOpen}
        onOpenChange={setXeroOpen}
        target={{ kind: 'estimate', client, estimate }}
      />
      {builderOpen && (
        <QuoteBuilderView
          initialClientCode={client.code}
          onClose={() => setBuilderOpen(false)}
        />
      )}
    </div>
  );
}
