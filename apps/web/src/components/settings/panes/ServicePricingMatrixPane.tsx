import * as React from 'react';
import { SERVICE_TYPES } from 'fdoncall-practice/domain/catalogue';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  FileSpreadsheet,
  DollarSign,
  Check,
  Save,
} from 'lucide-react';

export function ServicePricingMatrixPane() {
  const { rates, updateRates, updateServiceFee } = usePracticeStore();
  const [hourlyRate, setHourlyRate] = React.useState(rates.standardHourlyRate.toString());
  const [escalation, setEscalation] = React.useState(rates.marchEscalationPct.toString());
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  // Local editable fee states mapped by code
  const [feeInputs, setFeeInputs] = React.useState<Record<string, string>>({
    VAT201: (rates.serviceFees.VAT201 ?? 545).toString(),
    EMP201: (rates.serviceFees.EMP201 ?? 495).toString(),
    IRP6: (rates.serviceFees.IRP6_PAYABLE ?? 650).toString(),
    ITR14: (rates.serviceFees.ITR14 ?? 1500).toString(),
    ITR12: (rates.serviceFees.ITR12 ?? 1050).toString(),
    ITR12T: (rates.serviceFees.ITR12T ?? 1500).toString(),
    CIPC_AR: (rates.serviceFees.CIPC_SUBMISSION ?? 525).toString(),
    BO: (rates.serviceFees.BO ?? 2000).toString(),
    EMP501: (rates.serviceFees.EMP501_SMALL ?? 1900).toString(),
  });

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    updateRates({
      standardHourlyRate: Number(hourlyRate) || 625,
      marchEscalationPct: Number(escalation) || 6,
    });
    // Save individual service fees
    if (feeInputs.VAT201) updateServiceFee('VAT201', Number(feeInputs.VAT201));
    if (feeInputs.EMP201) updateServiceFee('EMP201', Number(feeInputs.EMP201));
    if (feeInputs.IRP6) {
      updateServiceFee('IRP6_PAYABLE', Number(feeInputs.IRP6));
      updateServiceFee('IRP6_NIL', Math.round(Number(feeInputs.IRP6) * 0.88));
    }
    if (feeInputs.ITR14) updateServiceFee('ITR14', Number(feeInputs.ITR14));
    if (feeInputs.ITR12) updateServiceFee('ITR12', Number(feeInputs.ITR12));
    if (feeInputs.ITR12T) updateServiceFee('ITR12T', Number(feeInputs.ITR12T));
    if (feeInputs.CIPC_AR) updateServiceFee('CIPC_SUBMISSION', Number(feeInputs.CIPC_AR));
    if (feeInputs.BO) updateServiceFee('BO', Number(feeInputs.BO));
    if (feeInputs.EMP501) {
      updateServiceFee('EMP501_SMALL', Number(feeInputs.EMP501));
      updateServiceFee('EMP501_MEDIUM', Number(feeInputs.EMP501) * 1.315);
      updateServiceFee('EMP501_LARGE', Number(feeInputs.EMP501) * 1.71);
    }

    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-5xl text-xs">
      <div>
        <h2 className="text-base font-semibold text-foreground flex items-center gap-2">
          <FileSpreadsheet className="h-4 w-4 text-primary" />
          Service Catalogue &amp; Pricing Matrix
        </h2>
        <p className="text-muted-foreground mt-0.5">
          Master administrative matrix defining practice service items, billing rates, turnover bands, and official SARS filing schedules.
        </p>
      </div>

      {/* Practice Rates & Fees Editor */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-4 shadow-xs">
        <h3 className="font-semibold text-foreground flex items-center gap-2 border-b border-border/70 pb-2">
          <DollarSign className="h-4 w-4 text-primary" />
          Standard Rates &amp; Editable Service Fees (Excl. VAT)
        </h3>

        <form onSubmit={handleSaveRates} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
            <div>
              <label className="font-medium text-foreground block mb-1">Standard Hourly Rate (R)</label>
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
              <label className="font-medium text-foreground block mb-1">1 March Annual Price Increase (%)</label>
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
                className="bg-[#c4161c] hover:bg-[#a51217] text-white flex items-center gap-1.5 cursor-pointer"
              >
                <Save className="h-3.5 w-3.5" />
                <span>Save All Matrix Fees</span>
              </Button>
              {savedSuccess && (
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-[11px] flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Saved!
                </span>
              )}
            </div>
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
                <th className="py-2.5 px-3">Standard Fee (R)</th>
                <th className="py-2.5 px-3">Partner Review Gate</th>
                <th className="py-2.5 px-3">When It Recurs</th>
                <th className="py-2.5 px-3">Statutory Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {SERVICE_TYPES.map((s) => {
                const feeKey = s.code === 'VAT201' ? 'VAT201' : s.code === 'EMP201' ? 'EMP201' : s.code === 'IRP6' ? 'IRP6' : s.code === 'ITR14' ? 'ITR14' : s.code === 'ITR12' ? 'ITR12' : s.code === 'ITR12T' ? 'ITR12T' : s.code === 'CIPC_AR' ? 'CIPC_AR' : s.code === 'BO' ? 'BO' : s.code === 'EMP501' ? 'EMP501' : null;
                const currentVal = feeKey && feeInputs[feeKey] !== undefined ? feeInputs[feeKey] : '';

                return (
                  <tr key={s.code} className="hover:bg-muted/20">
                    <td className="py-2.5 px-3 font-semibold text-foreground">{s.name}</td>
                    <td className="py-2.5 px-3 font-mono text-muted-foreground">{s.xeroItems}</td>
                    <td className="py-2.5 px-3 font-mono text-primary font-medium">
                      {feeKey ? (
                        <div className="flex items-center gap-1 max-w-[140px]">
                          <span className="text-muted-foreground">R</span>
                          <input
                            type="number"
                            value={currentVal}
                            onChange={(e) =>
                              setFeeInputs((prev) => ({ ...prev, [feeKey]: e.target.value }))
                            }
                            className="w-full px-2 py-0.5 rounded border border-border bg-background font-mono text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-primary"
                          />
                        </div>
                      ) : (
                        s.feeLabel
                      )}
                    </td>
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
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
