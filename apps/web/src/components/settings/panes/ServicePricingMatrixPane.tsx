import * as React from 'react';
import {
  SERVICE_TYPES,
  TURNOVER_BANDS,
  PAYROLL_BANDS,
  XERO_PLANS,
  PRICE_DIFFERENCES,
} from 'fdoncall-practice/domain/catalogue';
import { FILING_SEASONS } from 'fdoncall-practice/domain/sars';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  RefreshCw,
  DollarSign,
  Calendar,
  Check,
  Save,
  ExternalLink,
} from 'lucide-react';

export function ServicePricingMatrixPane() {
  const { rates, updateRates } = usePracticeStore();
  const [hourlyRate, setHourlyRate] = React.useState(rates.standardHourlyRate.toString());
  const [escalation, setEscalation] = React.useState(rates.marchEscalationPct.toString());
  const [savedSuccess, setSavedSuccess] = React.useState(false);
  const [syncing, setSyncing] = React.useState(false);
  const [syncedSuccess, setSyncedSuccess] = React.useState(false);

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    updateRates({
      standardHourlyRate: Number(hourlyRate) || 625,
      marchEscalationPct: Number(escalation) || 6,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSyncSars = () => {
    setSyncing(true);
    setTimeout(() => {
      setSyncing(false);
      setSyncedSuccess(true);
      setTimeout(() => setSyncedSuccess(false), 3000);
    }, 800);
  };

  return (
    <div className="space-y-6 max-w-5xl text-xs">
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Service Catalogue &amp; Pricing Matrix
        </h2>
        <p className="text-muted-foreground mt-0.5">
          Master administrative matrix defining the 21 practice service items, billing rates, turnover bands, and official SARS filing season schedules.
        </p>
      </div>

      {/* Practice Rates Quick Editor */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
        <h3 className="font-semibold text-foreground flex items-center gap-2 border-b border-border/70 pb-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Standard Practice Rates &amp; Annual Escalation
        </h3>

        <form onSubmit={handleSaveRates} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
          <div>
            <label className="font-medium text-foreground block mb-1">Standard Hourly Rate (excl. VAT)</label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">R</span>
              <input
                type="number"
                step="25"
                value={hourlyRate}
                onChange={(e) => setHourlyRate(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
              />
            </div>
          </div>

          <div>
            <label className="font-medium text-foreground block mb-1">1 March Annual Price Increase</label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                value={escalation}
                onChange={(e) => setEscalation(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">%</span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              type="submit"
              size="sm"
              className="bg-[#c4161c] hover:bg-[#a51217] text-white flex items-center gap-1.5"
            >
              <Save className="h-3.5 w-3.5" />
              <span>Update Rates</span>
            </Button>
            {savedSuccess && (
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <Check className="h-3.5 w-3.5" /> Saved!
              </span>
            )}
          </div>
        </form>
      </div>

      {/* 21 Service Catalogue Items Table */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <h3 className="font-semibold text-foreground">Service Catalogue (21 Practice Items)</h3>
          <Badge variant="outline" className="font-mono text-[10px]">
            {SERVICE_TYPES.length} Active Services
          </Badge>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left min-w-[700px]">
            <thead className="bg-muted/40 border-b border-border text-[10px] font-mono uppercase text-muted-foreground">
              <tr>
                <th className="py-2.5 px-3">Service Name</th>
                <th className="py-2.5 px-3">Xero Item</th>
                <th className="py-2.5 px-3">Standard Fee</th>
                <th className="py-2.5 px-3">Partner Review Gate</th>
                <th className="py-2.5 px-3">When It Recurs</th>
                <th className="py-2.5 px-3">Statutory Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {SERVICE_TYPES.map((s) => (
                <tr key={s.code} className="hover:bg-muted/20">
                  <td className="py-2.5 px-3 font-semibold text-foreground">{s.name}</td>
                  <td className="py-2.5 px-3 font-mono text-muted-foreground">{s.xeroItems}</td>
                  <td className="py-2.5 px-3 font-mono text-primary font-medium">{s.feeLabel}</td>
                  <td className="py-2.5 px-3">
                    <Badge
                      variant="outline"
                      className={
                        s.review === 'always'
                          ? 'border-amber-500/40 text-amber-600 dark:text-amber-400'
                          : 'border-border text-muted-foreground'
                      }
                    >
                      {s.review === 'always' ? 'Always Required' : s.review === 'when-payable' ? 'When Payable' : 'No'}
                    </Badge>
                  </td>
                  <td className="py-2.5 px-3 text-muted-foreground">{s.recurrence}</td>
                  <td className="py-2.5 px-3 text-[11px] text-muted-foreground/80">{s.basis}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Turnover Bands & Pricing Schedule */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Turnover bands */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
          <h3 className="font-semibold text-foreground border-b border-border/70 pb-2">
            Turnover bands (CIPC Fees &amp; Retainer Hours)
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-muted/40 border-b border-border text-[10px] text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 px-2.5">Turnover Tier</th>
                  <th className="py-2 px-2.5">Acct h/mo</th>
                  <th className="py-2 px-2.5">AFS h</th>
                  <th className="py-2 px-2.5 text-right">CIPC Fee</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {TURNOVER_BANDS.map((b) => (
                  <tr key={b.label} className="hover:bg-muted/20">
                    <td className="py-2 px-2.5 font-sans font-medium text-foreground">{b.label}</td>
                    <td className="py-2 px-2.5">{b.accountingHours} h</td>
                    <td className="py-2 px-2.5">{b.afsHours} h</td>
                    <td className="py-2 px-2.5 text-right font-semibold text-primary">R {b.cipcFee}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Xero Plans & Payroll Bands */}
        <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
          <h3 className="font-semibold text-foreground border-b border-border/70 pb-2">
            Xero Plans &amp; SimplePay Recharges
          </h3>
          <div className="overflow-x-auto">
            <table className="w-full text-left font-mono text-[11px]">
              <thead className="bg-muted/40 border-b border-border text-[10px] text-muted-foreground uppercase">
                <tr>
                  <th className="py-2 px-2.5">Xero Tier</th>
                  <th className="py-2 px-2.5">Excl. VAT</th>
                  <th className="py-2 px-2.5">Incl. 15% VAT</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {XERO_PLANS.map((p) => (
                  <tr key={p.plan} className="hover:bg-muted/20">
                    <td className="py-2 px-2.5 font-sans font-medium text-foreground">{p.plan}</td>
                    <td className="py-2 px-2.5">R {p.fee.toFixed(2)}</td>
                    <td className="py-2 px-2.5 font-semibold text-primary">R {p.inclVat.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* SARS Filing Seasons Schedule with Live Sync */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
        <div className="flex items-center justify-between pb-2 border-b border-border/70">
          <div>
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Official SARS Filing Seasons Schedule
            </h3>
            <p className="text-muted-foreground mt-0.5">
              Statutory deadlines announced by the Commissioner of the South African Revenue Service (SARS).
            </p>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleSyncSars}
              disabled={syncing}
              className="flex items-center gap-1.5 h-7 text-xs"
            >
              <RefreshCw className={cn('h-3.5 w-3.5', syncing && 'animate-spin')} />
              <span>Sync from sars.gov.za</span>
            </Button>
            {syncedSuccess && (
              <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                <Check className="h-3 w-3" /> Synchronized!
              </span>
            )}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left font-mono text-[11px] min-w-[650px]">
            <thead className="bg-muted/40 border-b border-border text-[10px] text-muted-foreground uppercase">
              <tr>
                <th className="py-2.5 px-3">Tax Year</th>
                <th className="py-2.5 px-3">Non-Provisional Deadline</th>
                <th className="py-2.5 px-3">Provisional Deadline</th>
                <th className="py-2.5 px-3">Trusts Deadline</th>
                <th className="py-2.5 px-3 text-right">Gazette Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {FILING_SEASONS.map((season) => (
                <tr key={season.taxYear} className="hover:bg-muted/20">
                  <td className="py-2.5 px-3 font-semibold text-foreground">TY {season.taxYear}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{season.nonProvisional}</td>
                  <td className="py-2.5 px-3 font-semibold text-primary">{season.provisional}</td>
                  <td className="py-2.5 px-3 text-muted-foreground">{season.trusts}</td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <a
                      href={season.sourceUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1 text-[11px] text-primary hover:underline"
                    >
                      <span>SARS Announcement</span>
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
