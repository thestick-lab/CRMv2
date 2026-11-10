import type {
  Estimate,
  EstimateInput,
  RegularKey,
  Schedule,
} from 'fdoncall-practice/domain/estimate';
import { effectiveSchedule, formatMonthShort, suggestedSelection } from 'fdoncall-practice/domain/estimate';
import { MONTHS } from 'fdoncall-practice/domain/dates';
import { AlertTriangle, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import {
  FIELD_INPUT_CLASS,
  FIELD_LABEL_CLASS,
  FREQUENCY_OPTIONS,
  REGULAR_KEYS,
  REGULAR_LABELS,
  formatZar,
  startMonthOptions,
} from './estimate-form';

export interface QuoteFeeScheduleStepProps {
  input: EstimateInput;
  estimate: Estimate;
  onChange: (next: EstimateInput) => void;
  retainerHours: number;
  onRetainerHours: (hours: number) => void;
  adHocRate: number;
  onAdHocRate: (rate: number) => void;
  vatInclusive: boolean;
  onVatInclusive: (inclusive: boolean) => void;
  onResetToBands: () => void;
  /** Practice Rules fees — the IRP6 labels show what the engine actually charges. */
  serviceFees: Record<string, number>;
}

const monthOptions = MONTHS.map((month, index) => ({
  value: index + 1,
  label: month,
}));

/**
 * Step 3 of the quote builder: the 12-month fee engine's controls. Every field
 * writes an `EstimateInput`; the domain's `computeEstimate` produces the matrix
 * and the document preview consumes the same result.
 */
export function QuoteFeeScheduleStep({
  input,
  estimate,
  onChange,
  retainerHours,
  onRetainerHours,
  adHocRate,
  onAdHocRate,
  vatInclusive,
  onVatInclusive,
  onResetToBands,
  serviceFees,
}: QuoteFeeScheduleStepProps) {
  const selection = { ...suggestedSelection(input), ...input.selected };

  const updateSchedule = (key: RegularKey, patch: Partial<Schedule>) => {
    const current = effectiveSchedule(input, key);
    onChange({ ...input, schedule: { ...input.schedule, [key]: { ...current, ...patch } } });
  };

  const setHours = (key: keyof EstimateInput['hours'], value: number) => {
    onChange({ ...input, hours: { ...input.hours, [key]: value } });
  };

  const setMonth = (key: keyof EstimateInput['months'], value: number) => {
    onChange({ ...input, months: { ...input.months, [key]: value } });
  };

  return (
    <div className="space-y-5">
      <section className="rounded-xl border border-border bg-card shadow-xs">
        <header className="flex flex-wrap items-center justify-between gap-2 border-b border-border px-4 py-3">
          <div>
            <h3 className="text-sm font-semibold text-foreground">Quote settings</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              The maths comes from the practice pricing engine — these controls feed it.
            </p>
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={onResetToBands}
            className="h-7 gap-1.5 text-[11px]"
            title="Restore the standard hourly rate, March escalation and banded hours"
          >
            <RotateCcw className="h-3 w-3" />
            Reset to pricing bands
          </Button>
        </header>

        <div className="grid grid-cols-1 gap-4 px-4 py-4 sm:grid-cols-2 xl:grid-cols-3">
          <label className={FIELD_LABEL_CLASS}>
            Start month
            <select
              value={input.startMonth}
              onChange={(event) => onChange({ ...input, startMonth: event.target.value })}
              className={FIELD_INPUT_CLASS}
            >
              {startMonthOptions().map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>

          <label className={FIELD_LABEL_CLASS}>
            Directors
            <input
              type="number"
              min={0}
              step={1}
              value={input.directors}
              onChange={(event) =>
                onChange({ ...input, directors: Math.max(0, Number(event.target.value)) })
              }
              className={cn(FIELD_INPUT_CLASS, 'font-mono')}
            />
          </label>

          <label className={FIELD_LABEL_CLASS}>
            IRP6 outcome
            <select
              value={input.irp6Payable ? 'payable' : 'nil'}
              onChange={(event) =>
                onChange({ ...input, irp6Payable: event.target.value === 'payable' })
              }
              className={FIELD_INPUT_CLASS}
            >
              <option value="payable">
                Tax payable ({formatZar(serviceFees.IRP6_PAYABLE, 0)} a return)
              </option>
              <option value="nil">Nil return ({formatZar(serviceFees.IRP6_NIL, 0)} a return)</option>
            </select>
          </label>

          <label className={FIELD_LABEL_CLASS}>
            Hourly rate (ZAR)
            <input
              type="number"
              min={0}
              step={25}
              value={input.rate}
              onChange={(event) => onChange({ ...input, rate: Number(event.target.value) })}
              className={cn(FIELD_INPUT_CLASS, 'font-mono')}
            />
          </label>

          <label className={FIELD_LABEL_CLASS}>
            March increase (%)
            <input
              type="number"
              min={0}
              step={0.5}
              value={input.marchIncreasePct}
              onChange={(event) =>
                onChange({ ...input, marchIncreasePct: Number(event.target.value) })
              }
              className={cn(FIELD_INPUT_CLASS, 'font-mono')}
            />
          </label>

          <label
            className={cn(FIELD_LABEL_CLASS, 'flex items-start gap-2 rounded-lg border border-border bg-muted/20 px-3 py-2')}
          >
            <input
              type="checkbox"
              checked={input.provisionalTaxpayer}
              onChange={(event) =>
                onChange({ ...input, provisionalTaxpayer: event.target.checked })
              }
              className="mt-0.5 h-3.5 w-3.5 rounded border-border accent-[#c4161c] focus-visible:ring-1 focus-visible:ring-[#c4161c]"
            />
            <span>
              Provisional taxpayer
              <span className="mt-0.5 block font-normal text-[11px] text-muted-foreground">
                Adds IRP6 returns for individuals and trusts
              </span>
            </span>
          </label>

          <label className={FIELD_LABEL_CLASS}>
            Monthly retainer allowance (hours)
            <input
              type="number"
              min={0}
              step={0.25}
              value={retainerHours}
              onChange={(event) => onRetainerHours(Number(event.target.value))}
              className={cn(FIELD_INPUT_CLASS, 'font-mono')}
            />
          </label>

          <label className={FIELD_LABEL_CLASS}>
            Ad-hoc hourly rate (ZAR)
            <input
              type="number"
              min={0}
              step={25}
              value={adHocRate}
              onChange={(event) => onAdHocRate(Number(event.target.value))}
              className={cn(FIELD_INPUT_CLASS, 'font-mono')}
            />
          </label>

          <div className={FIELD_LABEL_CLASS}>
            Quote shows
            <div className="mt-1 flex rounded-lg border border-border bg-background p-0.5">
              {[
                { value: false, label: 'Excl. VAT' },
                { value: true, label: 'Incl. VAT' },
              ].map((option) => (
                <button
                  key={option.label}
                  type="button"
                  onClick={() => onVatInclusive(option.value)}
                  className={cn(
                    'flex-1 rounded-md px-2 py-1 text-[11px] font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-[#c4161c]',
                    vatInclusive === option.value
                      ? 'bg-[#c4161c] text-white'
                      : 'text-muted-foreground hover:text-foreground'
                  )}
                  aria-pressed={vatInclusive === option.value}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-xs">
        <header className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Regular work schedule</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            Hours and when they happen. Chosen months bill only in those months.
          </p>
        </header>
        <div className="divide-y divide-border/70">
          {REGULAR_KEYS.map((key) => {
            const on = Boolean(selection[key]);
            const schedule = effectiveSchedule(input, key);
            return (
              <div key={key} className="grid grid-cols-1 gap-3 px-4 py-3 md:grid-cols-[minmax(0,1fr)_auto_auto] md:items-end">
                <div>
                  <p className="text-xs font-medium text-foreground">{REGULAR_LABELS[key]}</p>
                  <p className="mt-0.5 text-[11px] text-muted-foreground">
                    {on ? `${formatZar(input.rate, 0)} an hour` : 'Not in scope'}
                  </p>
                </div>
                <label className={cn(FIELD_LABEL_CLASS, 'w-24')}>
                  Hours
                  <input
                    type="number"
                    min={0}
                    step={0.25}
                    value={input.hours[key]}
                    disabled={!on}
                    onChange={(event) => setHours(key, Number(event.target.value))}
                    className={cn(FIELD_INPUT_CLASS, 'font-mono')}
                  />
                </label>
                <label className={cn(FIELD_LABEL_CLASS, 'w-full md:w-48')}>
                  Schedule
                  <select
                    value={schedule.when}
                    disabled={!on}
                    onChange={(event) =>
                      updateSchedule(key, {
                        when: event.target.value as Schedule['when'],
                        months:
                          event.target.value === 'custom' && schedule.months.length === 0
                            ? [Number(input.startMonth.slice(5))]
                            : schedule.months,
                      })
                    }
                    className={FIELD_INPUT_CLASS}
                  >
                    {FREQUENCY_OPTIONS.map((option) => (
                      <option
                        key={option.value}
                        value={option.value}
                        disabled={option.value === 'vat' && !input.vatCategory}
                      >
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>

                {on && schedule.when === 'custom' && (
                  <div className="md:col-span-3">
                    <p className="mb-1 text-[11px] font-medium text-muted-foreground">
                      Chosen months
                    </p>
                    <div className="flex flex-wrap gap-1">
                      {monthOptions.map((month) => {
                        const active = schedule.months.includes(month.value);
                        return (
                          <button
                            key={month.value}
                            type="button"
                            onClick={() =>
                              updateSchedule(key, {
                                months: active
                                  ? schedule.months.filter((value) => value !== month.value)
                                  : [...schedule.months, month.value].sort((a, b) => a - b),
                              })
                            }
                            className={cn(
                              'rounded-md border px-2 py-0.5 font-mono text-[11px] transition-colors focus-visible:ring-1 focus-visible:ring-[#c4161c]',
                              active
                                ? 'border-[#c4161c]/40 bg-[#c4161c]/10 text-[#c4161c]'
                                : 'border-border bg-background text-muted-foreground hover:text-foreground'
                            )}
                            aria-pressed={active}
                          >
                            {month.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>

      <section className="rounded-xl border border-border bg-card shadow-xs">
        <header className="border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">Annual work</h3>
          <p className="mt-0.5 text-[11px] text-muted-foreground">
            When the annual work happens and how many hours it takes.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-4 px-4 py-4 sm:grid-cols-3 xl:grid-cols-6">
          <label className={FIELD_LABEL_CLASS}>
            AFS hours
            <input
              type="number"
              min={0}
              step={1}
              value={input.hours.AFS}
              onChange={(event) => setHours('AFS', Number(event.target.value))}
              className={cn(FIELD_INPUT_CLASS, 'font-mono')}
            />
          </label>
          <label className={FIELD_LABEL_CLASS}>
            Review hours
            <input
              type="number"
              min={0}
              step={1}
              value={input.hours.REVIEW}
              disabled={!selection.REVIEW}
              onChange={(event) => setHours('REVIEW', Number(event.target.value))}
              className={cn(FIELD_INPUT_CLASS, 'font-mono')}
            />
          </label>
          <label className={FIELD_LABEL_CLASS}>
            AFS month
            <select
              value={input.months.AFS}
              onChange={(event) => setMonth('AFS', Number(event.target.value))}
              className={FIELD_INPUT_CLASS}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label className={FIELD_LABEL_CLASS}>
            ITR month
            <select
              value={input.months.ITR}
              onChange={(event) => setMonth('ITR', Number(event.target.value))}
              className={FIELD_INPUT_CLASS}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label className={FIELD_LABEL_CLASS}>
            CIPC month
            <select
              value={input.months.CIPC_AR}
              onChange={(event) => setMonth('CIPC_AR', Number(event.target.value))}
              className={FIELD_INPUT_CLASS}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
          <label className={FIELD_LABEL_CLASS}>
            Review month
            <select
              value={input.months.REVIEW}
              disabled={!selection.REVIEW}
              onChange={(event) => setMonth('REVIEW', Number(event.target.value))}
              className={FIELD_INPUT_CLASS}
            >
              {monthOptions.map((month) => (
                <option key={month.value} value={month.value}>
                  {month.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      </section>

      {estimate.warnings.length > 0 && (
        <ul className="space-y-1.5 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3">
          {estimate.warnings.map((warning) => (
            <li key={warning} className="flex items-start gap-2 text-[11px] text-amber-700 dark:text-amber-400">
              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              {warning}
            </li>
          ))}
        </ul>
      )}

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Smoothed monthly retainer
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
            {formatZar(estimate.average)}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            {formatZar(estimate.averageInclVat)} incl. 15% VAT
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            12-month value
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-[#c4161c]">
            {formatZar(estimate.annual)}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            {formatZar(estimate.annualInclVat)} incl. 15% VAT
          </p>
        </div>
        <div className="rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
          <p className="font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
            Fee lines
          </p>
          <p className="mt-1 font-mono text-lg font-semibold tabular-nums text-foreground">
            {estimate.lines.length}
          </p>
          <p className="text-[11px] font-mono text-muted-foreground">
            {estimate.increaseApplied ? `March increase from ${estimate.increaseFrom}` : 'No March increase applied'}
          </p>
        </div>
      </div>

      <section className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
        <header className="flex items-center justify-between border-b border-border px-4 py-3">
          <h3 className="text-sm font-semibold text-foreground">12-month fee schedule</h3>
          <span className="font-mono text-[11px] text-muted-foreground">
            {estimate.months[0]} – {estimate.months[11]}
          </span>
        </header>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[420px] text-left text-[11px] font-mono">
            <thead className="border-b border-border bg-muted/40 text-[11px] uppercase text-muted-foreground">
              <tr>
                <th className="px-4 py-2">Month</th>
                <th className="px-4 py-2 text-right">Excl. VAT</th>
                <th className="px-4 py-2 text-right">Incl. 15% VAT</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {estimate.months.map((month, index) => (
                <tr key={month} className="hover:bg-muted/20">
                  <td className="px-4 py-1.5 font-semibold text-foreground">
                    {formatMonthShort(month)}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-foreground">
                    {formatZar(estimate.totals[index])}
                  </td>
                  <td className="px-4 py-1.5 text-right tabular-nums text-muted-foreground">
                    {formatZar(estimate.totalsInclVat[index])}
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot className="border-t border-border bg-muted/30 font-semibold">
              <tr>
                <td className="px-4 py-2 text-foreground">Year total</td>
                <td className="px-4 py-2 text-right tabular-nums text-foreground">
                  {formatZar(estimate.annual)}
                </td>
                <td className="px-4 py-2 text-right tabular-nums text-foreground">
                  {formatZar(estimate.annualInclVat)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </section>
    </div>
  );
}
