import * as React from 'react';
import type { Client } from 'fdoncall-practice/domain/types';
import { MONTHS_LONG } from 'fdoncall-practice/domain/dates';
import { STAFF, GROUPS } from 'fdoncall-practice/data/seed';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Building2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface ProfileDetails {
  entityType: string;
  yearEndLabel: string;
  yearEndAssumed: boolean;
  vatLabel: string;
  efilingProfileLabel: string;
  turnoverLabel: string;
  partnerLabel: string;
  subcontractorLabel: string;
  groupLabel?: string;
  boStatusLabel: string;
  lastAfsYear: string;
  lastIncomeTaxYear: string;
}

export function buildProfileDetails(client: Client): ProfileDetails {
  const monthName = MONTHS_LONG[client.yearEndMonth - 1] ?? `Month ${client.yearEndMonth}`;
  const yearEndLabel = client.yearEndAssumed ? `${monthName.slice(0, 3)}* (Assumed)` : monthName;

  let vatLabel = 'Non-VAT (Not Registered)';
  if (client.vatCategory) {
    vatLabel = `Category ${client.vatCategory} (${
      client.vatCategory === 'A'
        ? 'Odd Months'
        : client.vatCategory === 'B'
        ? 'Even Months'
        : client.vatCategory === 'C'
        ? 'Monthly'
        : 'Six-Monthly'
    })`;
  }

  const efilingProfileLabel =
    client.efilingProfile === 'firm'
      ? 'Firm Profile (FD on Call Managed)'
      : 'Client Profile (SARS Managed)';

  const turnoverLabel = client.turnover
    ? `R ${client.turnover.toLocaleString('en-ZA')} (${client.turnoverSource ?? 'Estimate'})`
    : 'Turnover Not Recorded';

  const staff = STAFF.find((s) => s.id === client.staffId);
  const partnerLabel = staff ? `${staff.name} (${staff.role})` : 'Practice Pool';

  const sub = client.subcontractorId ? STAFF.find((s) => s.id === client.subcontractorId) : undefined;
  const subcontractorLabel = sub ? `${sub.name} (${sub.role})` : 'None';

  const group = GROUPS.find((g) => g.id === client.groupId);

  const boStatusLabel =
    client.beneficialOwnershipFiled === true
      ? 'Filed with CIPC'
      : client.beneficialOwnershipFiled === false
      ? 'Filing Overdue / Required'
      : 'Not Applicable';

  return {
    entityType: client.entityType,
    yearEndLabel,
    yearEndAssumed: !!client.yearEndAssumed,
    vatLabel,
    efilingProfileLabel,
    turnoverLabel,
    partnerLabel,
    subcontractorLabel,
    groupLabel: group?.name,
    boStatusLabel,
    lastAfsYear: client.lastAfsYear ? String(client.lastAfsYear) : 'Not on file',
    lastIncomeTaxYear: client.lastIncomeTaxYear ? String(client.lastIncomeTaxYear) : 'Not on file',
  };
}

export function StatutoryProfileTab({ client }: { client: Client }) {
  const { updateClient } = usePracticeStore();

  const isCompany = client.entityType === 'Company' || client.entityType === 'Close corporation';

  const [turnoverInput, setTurnoverInput] = React.useState(client.turnover?.toString() || '');
  const [incDate, setIncDate] = React.useState(client.incorporationDate || '');

  // Keep local input in sync with store
  React.useEffect(() => {
    setTurnoverInput(client.turnover?.toString() || '');
    setIncDate(client.incorporationDate || '');
  }, [client]);

  const handleYearEndChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    updateClient(client.code, {
      yearEndMonth: Number(e.target.value),
      yearEndAssumed: false,
    });
  };

  const handleIncDateBlur = () => {
    updateClient(client.code, {
      incorporationDate: incDate.trim() || undefined,
    });
  };

  const handleTurnoverBlur = () => {
    const val = Number(turnoverInput);
    updateClient(client.code, {
      turnover: isNaN(val) || val <= 0 ? undefined : val,
    });
  };

  const handleVatToggle = (checked: boolean) => {
    updateClient(client.code, {
      vatCategory: checked ? 'B' : undefined,
    });
  };

  const handlePayrollToggle = (checked: boolean) => {
    updateClient(client.code, {
      payroll: checked,
      employeeCount: checked ? client.employeeCount || 8 : 0,
    });
  };

  const handleEfilingToggle = (checked: boolean) => {
    updateClient(client.code, {
      efilingProfile: checked ? 'firm' : 'client',
      efilingTransferredOn: checked ? new Date().toISOString().split('T')[0] : undefined,
    });
  };

  // Statutory Services Checklist
  const servicesList = [
    {
      code: 'AFS',
      label: 'Annual financial statements',
      fee: 'Hourly, R625',
      enabled: !client.taxElsewhere && client.entityType !== 'Individual',
      disabled: client.entityType === 'Individual',
    },
    {
      code: 'ITR14',
      label: 'Company income tax return',
      fee: 'R1,500',
      enabled: !client.taxElsewhere && isCompany,
      disabled: false,
    },
    {
      code: 'IRP6',
      label: 'Provisional tax (IRP6)',
      fee: 'R575 nil / R650 payable',
      enabled: client.provisionalTaxpayer ?? true,
      disabled: false,
    },
    {
      code: 'VAT201',
      label: 'VAT return (VAT201)',
      fee: 'R545 each',
      enabled: Boolean(client.vatCategory),
      disabled: !client.vatCategory,
    },
    {
      code: 'EMP201',
      label: 'Monthly employer declaration (EMP201)',
      fee: 'R495 each',
      enabled: Boolean(client.payroll),
      disabled: !client.payroll,
    },
    {
      code: 'CIPC_AR',
      label: 'CIPC annual return and FAS',
      fee: 'R525 + CIPC fee',
      enabled: isCompany,
      disabled: !isCompany,
    },
    {
      code: 'BO',
      label: 'Beneficial ownership (CIPC)',
      fee: 'R2,000',
      enabled: isCompany && client.beneficialOwnershipFiled !== false,
      disabled: !isCompany,
    },
  ];

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start text-xs">
      {/* Left Column: Editable Details Form */}
      <div className="lg:col-span-6 space-y-4">
        <div className="p-4 rounded-xl border border-border bg-card space-y-4 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <Building2 className="h-4 w-4 text-primary" />
              Statutory Profile Details
            </h2>
            <Badge variant="outline" className="font-mono text-[10px]">
              {client.code}
            </Badge>
          </div>

          <div className="space-y-3.5">
            {/* Financial Year End */}
            <div>
              <label htmlFor="yearEndMonth" className="font-medium text-foreground block mb-1">
                Financial Year End
              </label>
              <select
                id="yearEndMonth"
                value={client.yearEndMonth}
                onChange={handleYearEndChange}
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
              >
                {MONTHS_LONG.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m} {idx === 1 ? '(Standard Tax Year End)' : ''}
                  </option>
                ))}
              </select>
              {client.yearEndAssumed && (
                <span className="text-[10px] text-amber-500 block mt-0.5 font-mono">
                  * Assumed February: unconfirmed by client CIPC incorporation papers
                </span>
              )}
            </div>

            {/* Incorporation Date */}
            {isCompany && (
              <div>
                <label htmlFor="incorporationDate" className="font-medium text-foreground block mb-1">
                  Incorporation Date
                </label>
                <input
                  id="incorporationDate"
                  type="date"
                  value={incDate}
                  onChange={(e) => setIncDate(e.target.value)}
                  onBlur={handleIncDateBlur}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                />
                {!client.incorporationDate && (
                  <span className="text-[10px] text-muted-foreground block mt-0.5">
                    Required to determine exact CIPC Annual Return statutory filing window
                  </span>
                )}
              </div>
            )}

            {/* Turnover Input */}
            <div>
              <label htmlFor="turnover" className="font-medium text-foreground block mb-1">
                Annual Turnover (Last Known)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground font-mono">
                  R
                </span>
                <input
                  id="turnover"
                  type="number"
                  placeholder="e.g. 4000000"
                  value={turnoverInput}
                  onChange={(e) => setTurnoverInput(e.target.value)}
                  onBlur={handleTurnoverBlur}
                  className="w-full pl-8 pr-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                />
              </div>
              <span className="text-[10px] text-muted-foreground block mt-0.5 font-mono">
                Determines CIPC filing fee band and accounting turnover tier
              </span>
            </div>

            {/* VAT Switch */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">VAT Registration</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {client.vatCategory ? `Category ${client.vatCategory} (Registered)` : 'Not Registered'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(client.vatCategory)}
                onClick={() => handleVatToggle(!client.vatCategory)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative flex items-center p-0.5',
                  client.vatCategory ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full bg-white shadow-xs transition-transform',
                    client.vatCategory ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Payroll Switch */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">Payroll Processing</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {client.payroll ? `Active (${client.employeeCount ?? 8} employees)` : 'No Payroll'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(client.payroll)}
                onClick={() => handlePayrollToggle(!client.payroll)}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative flex items-center p-0.5',
                  client.payroll ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full bg-white shadow-xs transition-transform',
                    client.payroll ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* eFiling Profile Switch */}
            <div className="p-3 rounded-lg border border-border/60 bg-muted/30 flex items-center justify-between">
              <div>
                <div className="font-medium text-foreground">SARS eFiling Profile</div>
                <div className="text-[11px] text-muted-foreground font-mono">
                  {client.efilingProfile === 'firm' ? "FD on Call's Firm Profile" : "Client's Own Profile"}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={client.efilingProfile === 'firm'}
                onClick={() => handleEfilingToggle(client.efilingProfile !== 'firm')}
                className={cn(
                  'w-10 h-5 rounded-full transition-colors relative flex items-center p-0.5',
                  client.efilingProfile === 'firm' ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <div
                  className={cn(
                    'w-4 h-4 rounded-full bg-white shadow-xs transition-transform',
                    client.efilingProfile === 'firm' ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column: Statutory Services Switches */}
      <div className="lg:col-span-6 space-y-4">
        <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 shadow-xs">
          <div className="flex items-center justify-between pb-3 border-b border-border/70">
            <div>
              <h2 className="text-sm font-semibold text-foreground flex items-center gap-2">
                <ShieldCheck className="h-4 w-4 text-primary" />
                Statutory Compliance Services
              </h2>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Switch a service on or off and its compliance deadlines automatically update on the Deadlines board.
              </p>
            </div>
          </div>

          <div className="space-y-2">
            {servicesList.map((svc) => (
              <div
                key={svc.code}
                className={cn(
                  'p-3 rounded-lg border flex items-center justify-between transition-colors',
                  svc.enabled
                    ? 'border-primary/30 bg-primary/5'
                    : 'border-border/60 bg-muted/20 opacity-70'
                )}
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <input
                    type="checkbox"
                    id={`svc-${svc.code}`}
                    checked={svc.enabled}
                    disabled={svc.disabled}
                    onChange={(e) => {
                      if (svc.code === 'VAT201') handleVatToggle(e.target.checked);
                      else if (svc.code === 'EMP201') handlePayrollToggle(e.target.checked);
                      else if (svc.code === 'IRP6') updateClient(client.code, { provisionalTaxpayer: e.target.checked });
                    }}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary cursor-pointer disabled:cursor-not-allowed"
                  />
                  <label htmlFor={`svc-${svc.code}`} className="min-w-0 cursor-pointer select-none">
                    <span className="font-medium text-foreground block truncate">{svc.label}</span>
                    <span className="text-[10px] font-mono text-muted-foreground">{svc.code}</span>
                  </label>
                </div>

                <Badge variant="outline" className="font-mono text-[10px] shrink-0">
                  {svc.fee}
                </Badge>
              </div>
            ))}
          </div>

          {/* Historical Governance Records */}
          <div className="pt-3 border-t border-border/70 space-y-1.5 text-[11px] font-mono text-muted-foreground">
            <div className="flex justify-between">
              <span>Last AFS Signed Off:</span>
              <span className="text-foreground">{client.lastAfsYear ?? 'Pending'}</span>
            </div>
            <div className="flex justify-between">
              <span>Last Income Tax Filed:</span>
              <span className="text-foreground">{client.lastIncomeTaxYear ?? 'Pending'}</span>
            </div>
            <div className="flex justify-between">
              <span>CIPC Annual Return:</span>
              <span className="text-foreground">{client.lastAnnualReturnYear ?? 'Pending'}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
