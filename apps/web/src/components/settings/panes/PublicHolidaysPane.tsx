import * as React from 'react';
import { Calendar, DollarSign, Check, Save } from 'lucide-react';
import { publicHolidays } from 'fdoncall-practice/domain/dates';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export function PublicHolidaysPane() {
  const { rates, updateRates } = usePracticeStore();
  const [selectedYear, setSelectedYear] = React.useState<2026 | 2027>(2026);

  const [hourlyRate, setHourlyRate] = React.useState(rates.standardHourlyRate.toString());
  const [escalation, setEscalation] = React.useState(rates.marchEscalationPct.toString());
  const [savedSuccess, setSavedSuccess] = React.useState(false);

  const holidaysMap = React.useMemo(() => publicHolidays(selectedYear), [selectedYear]);
  const holidaysList = React.useMemo(() => {
    return Array.from(holidaysMap.entries()).map(([date, name]) => {
      const d = new Date(date);
      const weekday = d.toLocaleDateString('en-ZA', { weekday: 'short' });
      return { date, name, weekday };
    });
  }, [holidaysMap]);

  const handleSaveRates = (e: React.FormEvent) => {
    e.preventDefault();
    updateRates({
      standardHourlyRate: Number(hourlyRate) || 625,
      marchEscalationPct: Number(escalation) || 6,
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  return (
    <div className="space-y-6 max-w-4xl text-xs">
      <div>
        <h2 className="text-base font-semibold text-foreground">
          🇿🇦 South African Public Holidays &amp; Practice Rules
        </h2>
        <p className="text-muted-foreground mt-0.5">
          Public Holidays Act 36 of 1994 statutory holiday calendar with Computus Easter and practice billing rate schedules.
        </p>
      </div>

      {/* Practice Billing Rates Editor */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              <DollarSign className="h-4 w-4 text-primary" />
              Practice Billing Rates &amp; Annual Escalation
            </div>
            <p className="text-muted-foreground mt-0.5">
              Defines the standard hourly rate used across 12-month retainer calculations and quote generation.
            </p>
          </div>
        </div>

        <form onSubmit={handleSaveRates} className="grid grid-cols-1 sm:grid-cols-3 gap-3.5 items-end">
          <div>
            <label className="font-medium text-foreground block mb-1">
              Standard Hourly Rate (excl. VAT)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                R
              </span>
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
            <label className="font-medium text-foreground block mb-1">
              1 March Annual Escalation Rate
            </label>
            <div className="relative">
              <input
                type="number"
                step="0.5"
                value={escalation}
                onChange={(e) => setEscalation(e.target.value)}
                className="w-full pr-8 pl-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                %
              </span>
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

      {/* Gazette Public Holidays Calendar */}
      <div className="p-4 rounded-xl border border-border bg-card space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Calendar className="h-4 w-4 text-primary" />
              Statutory Gazette ({selectedYear})
            </div>
            <p className="text-muted-foreground mt-0.5">
              Filing deadlines falling on these dates automatically roll back to the preceding business day (SARS s25 TAA).
            </p>
          </div>

          <div className="inline-flex p-0.5 rounded-lg border border-border bg-muted/40 font-mono text-xs">
            <button
              onClick={() => setSelectedYear(2026)}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                selectedYear === 2026
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              2026
            </button>
            <button
              onClick={() => setSelectedYear(2027)}
              className={cn(
                'px-2.5 py-1 rounded-md transition-colors',
                selectedYear === 2027
                  ? 'bg-background text-foreground shadow-xs font-semibold'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              2027
            </button>
          </div>
        </div>

        <div className="rounded-lg border border-border overflow-hidden">
          <table className="w-full text-left">
            <thead className="bg-muted/40 border-b border-border text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-3.5 py-2">Statutory Date</th>
                <th className="px-3.5 py-2">Day</th>
                <th className="px-3.5 py-2">Public Holiday Name</th>
                <th className="px-3.5 py-2">Statutory Basis</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {holidaysList.map((h) => (
                <tr key={h.date} className="hover:bg-muted/20 transition-colors">
                  <td className="px-3.5 py-2 font-semibold text-foreground">{h.date}</td>
                  <td className="px-3.5 py-2 text-muted-foreground">{h.weekday}</td>
                  <td className="px-3.5 py-2 font-sans font-medium text-foreground">
                    {h.name}
                  </td>
                  <td className="px-3.5 py-2">
                    <Badge variant="outline" className="text-[10px] font-mono">
                      {h.name.includes('observed')
                        ? 'Sunday Substituted'
                        : h.name.includes('Easter') || h.name.includes('Friday') || h.name.includes('Family')
                        ? 'Computus Easter'
                        : 'Fixed Gazetted'}
                    </Badge>
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
