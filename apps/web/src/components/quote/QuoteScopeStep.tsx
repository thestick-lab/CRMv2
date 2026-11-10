import type { EstimateInput, EstimateKey } from 'fdoncall-practice/domain/estimate';
import { suggestedSelection } from 'fdoncall-practice/domain/estimate';
import { XERO_PLANS } from 'fdoncall-practice/domain/pricing';
import { cn } from '@/lib/utils';
import {
  ESTIMATE_GROUPS,
  SERVICE_LABELS,
  formatZar,
  inapplicableReason,
} from './estimate-form';
import { Info } from 'lucide-react';

export interface QuoteScopeStepProps {
  input: EstimateInput;
  onChange: (next: EstimateInput) => void;
}

function serviceNote(key: EstimateKey, input: EstimateInput): string | undefined {
  switch (key) {
    case 'BOOKKEEPING':
    case 'PAYROLL':
    case 'MGMT':
      return `${input.hours[key] || 0} h`;
    case 'XERO':
      return input.recharges.XERO > 0 ? `${formatZar(input.recharges.XERO)}/mo at cost` : 'Off';
    case 'SIMPLEPAY':
      return input.recharges.SIMPLEPAY > 0
        ? `${formatZar(input.recharges.SIMPLEPAY)}/mo at cost`
        : 'Off';
    case 'CIPC_AR':
      return 'Fee paid to CIPC carries no VAT';
    default:
      return undefined;
  }
}

/**
 * Step 2 of the quote builder: the five service groups from the client
 * prototype as add-on toggles. Applicability comes from the domain engine, so a
 * payroll line cannot be quoted for a client who does not run payroll.
 */
export function QuoteScopeStep({ input, onChange }: QuoteScopeStepProps) {
  const selection = { ...suggestedSelection(input), ...input.selected };

  const toggle = (key: EstimateKey) => {
    onChange({ ...input, selected: { ...selection, [key]: !selection[key] } });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-muted/30 px-4 py-3">
        <p className="text-xs leading-relaxed text-muted-foreground">
          Tick what the engagement covers. The domain engine decides applicability — for example,
          VAT returns need a VAT category on record and payroll needs employees.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-2">
        {ESTIMATE_GROUPS.map((group) => {
          const selectedCount = group.keys.filter(
            (key) => selection[key] && !inapplicableReason(key, input)
          ).length;
          return (
            <section
              key={group.label}
              className={cn(
                'rounded-xl border border-border bg-card shadow-xs',
                group.keys.length > 4 && 'xl:col-span-2'
              )}
            >
              <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-3">
                <div className="min-w-0">
                  <h3 className="text-sm font-semibold text-foreground">{group.label}</h3>
                  <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                    {group.note}
                  </p>
                </div>
                <span className="shrink-0 rounded-full border border-border bg-muted/60 px-2 py-0.5 font-mono text-[11px] text-muted-foreground">
                  {selectedCount} on
                </span>
              </header>

              <ul className="divide-y divide-border/70">
                {group.keys.map((key) => {
                  const reason = inapplicableReason(key, input);
                  const checked = Boolean(selection[key]) && !reason;
                  const note = serviceNote(key, input);
                  return (
                    <li key={key}>
                      <label
                        title={reason ?? undefined}
                        className={cn(
                          'flex items-center justify-between gap-3 px-4 py-2.5 transition-colors',
                          reason
                            ? 'cursor-not-allowed opacity-60'
                            : 'cursor-pointer hover:bg-muted/40'
                        )}
                      >
                        <span className="flex min-w-0 items-start gap-2.5">
                          <input
                            type="checkbox"
                            checked={checked}
                            disabled={Boolean(reason)}
                            onChange={() => toggle(key)}
                            className="mt-0.5 h-3.5 w-3.5 shrink-0 rounded border-border accent-[#c4161c] focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                          />
                          <span className="min-w-0">
                            <span className="block text-xs text-foreground">
                              {SERVICE_LABELS[key]}
                            </span>
                            {reason && (
                              <span className="mt-0.5 flex items-center gap-1 text-[11px] text-muted-foreground">
                                <Info className="h-3 w-3" />
                                {reason}
                              </span>
                            )}
                          </span>
                        </span>
                        {note && (
                          <span className="shrink-0 font-mono text-[11px] text-muted-foreground">
                            {note}
                          </span>
                        )}
                      </label>
                    </li>
                  );
                })}
              </ul>

              {group.label === 'Recharges' && (
                <div className="grid grid-cols-1 gap-3 border-t border-border px-4 py-3 sm:grid-cols-2">
                  <label className="block text-[11px] font-medium text-foreground">
                    Xero plan
                    <select
                      value={
                        XERO_PLANS.find((plan) => plan.fee === input.recharges.XERO)?.plan ??
                        'Standard'
                      }
                      disabled={!selection.XERO}
                      onChange={(event) => {
                        const plan = XERO_PLANS.find((entry) => entry.plan === event.target.value);
                        if (plan) {
                          onChange({
                            ...input,
                            recharges: { ...input.recharges, XERO: plan.fee },
                          });
                        }
                      }}
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none transition-colors focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {XERO_PLANS.map((plan) => (
                        <option key={plan.plan} value={plan.plan}>
                          {plan.plan} · {formatZar(plan.fee)}/mo at cost
                        </option>
                      ))}
                    </select>
                  </label>
                  <label className="block text-[11px] font-medium text-foreground">
                    SimplePay fee
                    <input
                      type="number"
                      min={0}
                      step={0.01}
                      value={input.recharges.SIMPLEPAY}
                      disabled={!selection.SIMPLEPAY}
                      onChange={(event) =>
                        onChange({
                          ...input,
                          recharges: {
                            ...input.recharges,
                            SIMPLEPAY: Number(event.target.value),
                          },
                        })
                      }
                      className="mt-1 w-full rounded-lg border border-border bg-background px-2.5 py-1.5 font-mono text-xs text-foreground outline-none transition-colors focus-visible:border-[#c4161c]/60 focus-visible:ring-1 focus-visible:ring-[#c4161c]/40 disabled:cursor-not-allowed disabled:opacity-60"
                    />
                  </label>
                </div>
              )}
            </section>
          );
        })}
      </div>
    </div>
  );
}
