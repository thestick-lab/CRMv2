import * as React from 'react';
import type { Client, ClientContact, ServiceCode, VatCategory } from 'fdoncall-practice/domain/types';
import { MONTHS_LONG, todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { defaultServices } from 'fdoncall-practice/domain/rules';
import { STAFF, GROUPS } from 'fdoncall-practice/data/seed';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Building2, ShieldCheck } from 'lucide-react';
import { cn } from '@/lib/utils';
import { StatutoryActionModal } from '@/components/deadlines/StatutoryActionModal';
import type { PracticeTaskItem } from '@/components/deadlines/practice-tasks';
import {
  buildMissingInformation,
  buildClientTimeline,
  boFilingState,
  clientTags,
  nextOpenTask,
  type MissingInformationItem,
} from '../client-record-data';
import {
  ContactDetailsPanel,
  type ContactChannel,
} from '../panels/ContactDetailsPanel';
import { MissingInformationPanel } from '../panels/MissingInformationPanel';
import { OrganizationPanel } from '../panels/OrganizationPanel';
import { RelationshipHistoryPanel } from '../panels/RelationshipHistoryPanel';
import { NextActionPanel } from '../panels/NextActionPanel';
import { InternalNotesPanel } from '../panels/InternalNotesPanel';
import { TagsPanel } from '../panels/TagsPanel';

/**
 * Add or remove services in a recorded scope, keeping its order stable. The
 * service checkboxes and the VAT/payroll switches all write through this so an
 * explicit scope can never drift from the switches that feed it.
 */
export function setServices(
  services: ServiceCode[],
  codes: ServiceCode[],
  included: boolean
): ServiceCode[] {
  if (!included) return services.filter((service) => !codes.includes(service));
  const next = [...services];
  for (const code of codes) {
    if (!next.includes(code)) next.push(code);
  }
  return next;
}

/**
 * The patch a service checkbox (or the VAT/payroll switch) writes. VAT and
 * payroll are registration facts the deadline calendar needs: ticking those
 * boxes records what is missing, and unticking clears it symmetrically — so a
 * scope change can never leave a phantom registration behind.
 */
export function serviceTogglePatch(
  current: {
    services: ServiceCode[];
    vatCategory?: VatCategory;
    payroll: boolean;
    employeeCount?: number;
  },
  code: ServiceCode,
  checked: boolean
): Partial<Client> {
  if (code === 'VAT201') {
    return checked
      ? {
          vatCategory: current.vatCategory ?? 'B',
          services: setServices(current.services, ['VAT201'], true),
        }
      : { vatCategory: undefined, services: setServices(current.services, ['VAT201'], false) };
  }

  if (code === 'EMP201') {
    return checked
      ? {
          payroll: true,
          employeeCount: current.payroll ? current.employeeCount : current.employeeCount || 8,
          services: setServices(current.services, ['EMP201', 'EMP501'], true),
        }
      : {
          payroll: false,
          employeeCount: 0,
          services: setServices(current.services, ['EMP201', 'EMP501'], false),
        };
  }

  return { services: setServices(current.services, [code], checked) };
}

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
    : '—';

  const staff = STAFF.find((s) => s.id === client.staffId);
  const partnerLabel = staff ? `${staff.name} (${staff.role})` : 'Practice Pool';

  const sub = client.subcontractorId ? STAFF.find((s) => s.id === client.subcontractorId) : undefined;
  const subcontractorLabel = sub ? `${sub.name} (${sub.role})` : 'None';

  const group = GROUPS.find((g) => g.id === client.groupId);

  const boState = boFilingState(client);
  const boStatusLabel =
    boState === 'filed'
      ? 'Filed with CIPC'
      : boState === 'required'
        ? 'Filing required'
        : 'Not applicable';

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

export interface StatutoryProfileTabProps {
  client: Client;
  /** Jump to the Organization tab (used by the Missing Information Add links). */
  onOpenOrganization?: () => void;
  /** Jump to the Tasks tab from the Next Action panel. */
  onOpenTasks?: () => void;
  /**
   * `Clients — create/edit` is not granted: every field renders as recorded
   * and no handler may write through `updateClient`.
   */
  readOnly?: boolean;
}

export function StatutoryProfileTab({
  client,
  onOpenOrganization,
  onOpenTasks,
  readOnly = false,
}: StatutoryProfileTabProps) {
  const { clients, staff, updateClient, taskStatusOverrides, activity, quotes, invoices } =
    usePracticeStore();
  const asOf = todayInSouthAfrica();

  const isCompany = client.entityType === 'Company' || client.entityType === 'Close corporation';
  /** Explicit scope when recorded, otherwise the attribute-derived list. */
  const services = defaultServices(client);
  /** What the service checkboxes and switches read and write. */
  const scopeState = {
    services,
    vatCategory: client.vatCategory,
    payroll: client.payroll,
    employeeCount: client.employeeCount,
  };

  const [turnoverInput, setTurnoverInput] = React.useState(client.turnover?.toString() || '');
  const [incDate, setIncDate] = React.useState(client.incorporationDate || '');
  const [editingChannel, setEditingChannel] = React.useState<ContactChannel | null>(null);
  const [activeTask, setActiveTask] = React.useState<PracticeTaskItem | null>(null);

  // Keep local input in sync with store
  React.useEffect(() => {
    setTurnoverInput(client.turnover?.toString() || '');
    setIncDate(client.incorporationDate || '');
  }, [client]);

  const details = React.useMemo(() => buildProfileDetails(client), [client]);
  const missing = React.useMemo(() => buildMissingInformation(client), [client]);
  const tags = React.useMemo(() => clientTags(client), [client]);
  const timeline = React.useMemo(
    () =>
      buildClientTimeline(client, activity, taskStatusOverrides, {
        clients,
        staff,
        quotes,
        invoices,
      }),
    [client, activity, taskStatusOverrides, clients, staff, quotes, invoices]
  );
  const nextTask = React.useMemo(
    () => nextOpenTask(client, taskStatusOverrides, asOf),
    [client, taskStatusOverrides, asOf]
  );
  const groupMembers = React.useMemo(() => {
    if (!client.groupId) return [];
    return clients
      .filter((c) => c.groupId === client.groupId && c.code !== client.code)
      .map((c) => ({ code: c.code, name: c.name }));
  }, [clients, client]);

  const handleYearEndChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    if (readOnly) return;
    updateClient(client.code, {
      yearEndMonth: Number(e.target.value),
      yearEndAssumed: false,
    });
  };

  const handleIncDateBlur = () => {
    if (readOnly) return;
    updateClient(client.code, {
      incorporationDate: incDate.trim() || undefined,
    });
  };

  const handleTurnoverBlur = () => {
    if (readOnly) return;
    const val = Number(turnoverInput);
    updateClient(client.code, {
      turnover: isNaN(val) || val <= 0 ? undefined : val,
    });
  };

  const handleVatToggle = (checked: boolean) => {
    if (readOnly) return;
    updateClient(client.code, serviceTogglePatch(scopeState, 'VAT201', checked));
  };

  const handlePayrollToggle = (checked: boolean) => {
    if (readOnly) return;
    updateClient(client.code, serviceTogglePatch(scopeState, 'EMP201', checked));
  };

  /**
   * The service checkboxes write the client's explicit scope, which replaces
   * the attribute-derived list for deadline generation. VAT and payroll also
   * carry the registration facts the deadline calendar needs, and clearing the
   * box clears them again (see `serviceTogglePatch`).
   */
  const handleServiceToggle = (code: ServiceCode, checked: boolean) => {
    if (readOnly) return;
    updateClient(client.code, serviceTogglePatch(scopeState, code, checked));
  };

  const handleEfilingToggle = (checked: boolean) => {
    if (readOnly) return;
    updateClient(client.code, {
      efilingProfile: checked ? 'firm' : 'client',
      efilingTransferredOn: checked ? new Date().toISOString().split('T')[0] : undefined,
    });
  };

  const handleChannelSave = (channel: ContactChannel, value: string) => {
    if (readOnly) return;
    updateClient(client.code, { [channel]: value || undefined });
  };

  const handleMissingAdd = (item: MissingInformationItem) => {
    if (item.kind === 'contact') {
      setEditingChannel(item.id as ContactChannel);
      return;
    }
    if (item.kind === 'organization') {
      onOpenOrganization?.();
      return;
    }
    const control = document.getElementById(item.id);
    if (control) {
      control.scrollIntoView({ behavior: 'smooth', block: 'center' });
      (control as HTMLElement).focus();
    }
  };

  const handleContactsChange = (contacts: ClientContact[]) => {
    if (readOnly) return;
    updateClient(client.code, { contacts });
  };

  const handleNotesSave = (notes: string | undefined) => {
    if (readOnly) return;
    updateClient(client.code, { notes });
  };

  const handleManageTags = () => {
    const card = document.getElementById('statutory-services');
    card?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    const firstCheckbox = card?.querySelector<HTMLInputElement>('input[type="checkbox"]');
    firstCheckbox?.focus();
  };

  // Statutory Services Checklist — every tick writes the client's explicit scope.
  const servicesList: { code: ServiceCode; label: string; fee: string; disabled: boolean }[] = [
    {
      code: 'AFS',
      label: 'Annual financial statements',
      fee: 'Hourly, R625',
      disabled: client.entityType === 'Individual',
    },
    {
      code: 'ITR14',
      label: 'Company income tax return',
      fee: 'R1,500',
      disabled: false,
    },
    {
      code: 'IRP6',
      label: 'Provisional tax (IRP6)',
      fee: 'R575 nil / R650 payable',
      disabled: false,
    },
    {
      code: 'VAT201',
      label: 'VAT return (VAT201)',
      fee: 'R545 each',
      disabled: false,
    },
    {
      code: 'EMP201',
      label: 'Monthly employer declaration (EMP201)',
      fee: 'R495 each',
      disabled: false,
    },
    {
      code: 'CIPC_AR',
      label: 'CIPC annual return and FAS',
      fee: 'R525 + CIPC fee',
      disabled: !isCompany,
    },
    {
      code: 'BO',
      label: 'Beneficial ownership (CIPC)',
      fee: 'R2,000',
      disabled: !isCompany,
    },
  ];

  return (
    <div className="grid grid-cols-1 items-start gap-4 text-xs lg:grid-cols-3">
      {/* Left column — contact channels and what is still missing */}
      <div className="space-y-4">
        <ContactDetailsPanel
          readOnly={readOnly}
          channels={{
            email: client.email,
            phone: client.phone,
            location: client.location,
            timezone: client.timezone,
          }}
          editing={editingChannel}
          onEditingChange={setEditingChannel}
          onSave={handleChannelSave}
          details={details}
        />

        <MissingInformationPanel items={missing} onAdd={handleMissingAdd} />

        <section className="overflow-hidden rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between gap-2 border-b border-border px-4 py-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <Building2 className="h-3.5 w-3.5 text-[#c4161c]" />
              Statutory profile
            </h3>
            <Badge variant="outline" className="font-mono text-[10px]">
              {client.code}
            </Badge>
          </div>

          <div className="space-y-3.5 px-4 py-3">
            {/* Financial Year End */}
            <div>
              <label htmlFor="yearEndMonth" className="mb-1 block font-medium text-foreground">
                Financial Year End
              </label>
              <select
                id="yearEndMonth"
                value={client.yearEndMonth}
                disabled={readOnly}
                onChange={handleYearEndChange}
                className="w-full rounded-lg border border-border bg-background px-3 py-1.5 text-foreground"
              >
                {MONTHS_LONG.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m} {idx === 1 ? '(Standard Tax Year End)' : ''}
                  </option>
                ))}
              </select>
              {client.yearEndAssumed && (
                <span className="mt-0.5 block font-mono text-[10px] text-amber-500">
                  * Assumed February: unconfirmed by client CIPC incorporation papers
                </span>
              )}
            </div>

            {/* Incorporation Date */}
            {isCompany && (
              <div>
                <label htmlFor="incorporationDate" className="mb-1 block font-medium text-foreground">
                  Incorporation Date
                </label>
                <input
                  id="incorporationDate"
                  type="date"
                  value={incDate}
                  disabled={readOnly}
                  onChange={(e) => setIncDate(e.target.value)}
                  onBlur={handleIncDateBlur}
                  className="w-full rounded-lg border border-border bg-background px-3 py-1.5 font-mono text-foreground"
                />
                {!client.incorporationDate && (
                  <span className="mt-0.5 block text-[10px] text-muted-foreground">
                    Required to determine exact CIPC Annual Return statutory filing window
                  </span>
                )}
              </div>
            )}

            {/* Turnover Input */}
            <div>
              <label htmlFor="turnover" className="mb-1 block font-medium text-foreground">
                Annual Turnover (Last Known)
              </label>
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">
                  R
                </span>
                <input
                  id="turnover"
                  type="number"
                  placeholder="e.g. 4000000"
                  disabled={readOnly}
                  value={turnoverInput}
                  onChange={(e) => setTurnoverInput(e.target.value)}
                  onBlur={handleTurnoverBlur}
                  className="w-full rounded-lg border border-border bg-background py-1.5 pl-8 pr-3 font-mono text-foreground"
                />
              </div>
              <span className="mt-0.5 block font-mono text-[10px] text-muted-foreground">
                Determines CIPC filing fee band and accounting turnover tier
              </span>
            </div>

            {/* VAT Switch */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
              <div>
                <div className="font-medium text-foreground">VAT Registration</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {client.vatCategory ? `Category ${client.vatCategory} (Registered)` : 'Not Registered'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(client.vatCategory)}
                disabled={readOnly}
                onClick={() => handleVatToggle(!client.vatCategory)}
                className={cn(
                  'flex h-5 w-10 items-center rounded-full p-0.5 transition-colors',
                  client.vatCategory ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded-full bg-white shadow-xs transition-transform',
                    client.vatCategory ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* Payroll Switch */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
              <div>
                <div className="font-medium text-foreground">Payroll Processing</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {client.payroll ? `Active (${client.employeeCount ?? 8} employees)` : 'No Payroll'}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={Boolean(client.payroll)}
                disabled={readOnly}
                onClick={() => handlePayrollToggle(!client.payroll)}
                className={cn(
                  'flex h-5 w-10 items-center rounded-full p-0.5 transition-colors',
                  client.payroll ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded-full bg-white shadow-xs transition-transform',
                    client.payroll ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>

            {/* eFiling Profile Switch */}
            <div className="flex items-center justify-between rounded-lg border border-border/60 bg-muted/30 p-3">
              <div>
                <div className="font-medium text-foreground">SARS eFiling Profile</div>
                <div className="font-mono text-[11px] text-muted-foreground">
                  {client.efilingProfile === 'firm' ? "FD on Call's Firm Profile" : "Client's Own Profile"}
                </div>
              </div>
              <button
                type="button"
                role="switch"
                aria-checked={client.efilingProfile === 'firm'}
                disabled={readOnly}
                onClick={() => handleEfilingToggle(client.efilingProfile !== 'firm')}
                className={cn(
                  'flex h-5 w-10 items-center rounded-full p-0.5 transition-colors',
                  client.efilingProfile === 'firm' ? 'bg-primary' : 'bg-muted-foreground/30'
                )}
              >
                <div
                  className={cn(
                    'h-4 w-4 rounded-full bg-white shadow-xs transition-transform',
                    client.efilingProfile === 'firm' ? 'translate-x-5' : 'translate-x-0'
                  )}
                />
              </button>
            </div>
          </div>
        </section>
      </div>

      {/* Middle column — who the client is and what has happened */}
      <div className="space-y-4">
        <OrganizationPanel
          readOnly={readOnly}
          entityType={client.entityType}
          groupName={details.groupLabel}
          groupMembers={groupMembers}
          employeeCount={client.payroll ? client.employeeCount : undefined}
          contacts={client.contacts ?? []}
          onContactsChange={handleContactsChange}
        />

        <RelationshipHistoryPanel entries={timeline} limit={4} />

        <section
          id="statutory-services"
          className="overflow-hidden rounded-xl border border-border bg-card"
        >
          <div className="border-b border-border px-4 py-3">
            <h3 className="flex items-center gap-1.5 text-sm font-semibold text-foreground">
              <ShieldCheck className="h-3.5 w-3.5 text-[#c4161c]" />
              Statutory compliance services
            </h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              Switch a service on or off and its compliance deadlines automatically update on the
              Deadlines board.
            </p>
          </div>

          <div className="space-y-1.5 px-4 py-3">
            {servicesList.map((svc) => {
              const enabled = services.includes(svc.code);
              return (
                <div
                  key={svc.code}
                  className={cn(
                    'flex items-center justify-between gap-2 rounded-lg border p-2.5 transition-colors',
                    enabled
                      ? 'border-[#c4161c]/30 bg-[#c4161c]/5'
                      : 'border-border/60 bg-muted/20 opacity-70'
                  )}
                >
                  <div className="flex min-w-0 items-center gap-2.5">
                    <input
                      type="checkbox"
                      id={`svc-${svc.code}`}
                      checked={enabled}
                      disabled={svc.disabled || readOnly}
                      onChange={(e) => handleServiceToggle(svc.code, e.target.checked)}
                      className="h-4 w-4 shrink-0 cursor-pointer rounded border-border text-primary focus:ring-primary disabled:cursor-not-allowed"
                    />
                    <label htmlFor={`svc-${svc.code}`} className="min-w-0 cursor-pointer select-none">
                      <span className="block truncate font-medium text-foreground">{svc.label}</span>
                      <span className="font-mono text-[10px] text-muted-foreground">{svc.code}</span>
                    </label>
                  </div>

                  <Badge variant="outline" className="shrink-0 font-mono text-[10px]">
                    {svc.fee}
                  </Badge>
                </div>
              );
            })}

            {/* Historical Governance Records */}
            <div className="space-y-1.5 border-t border-border/70 pt-2.5 font-mono text-[11px] text-muted-foreground">
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
        </section>
      </div>

      {/* Right column — what happens next and the internal context */}
      <div className="space-y-4">
        <NextActionPanel
          task={nextTask}
          onComplete={setActiveTask}
          onViewAll={onOpenTasks}
        />
        <InternalNotesPanel notes={client.notes} onSave={handleNotesSave} readOnly={readOnly} />
        <TagsPanel tags={tags} onManage={handleManageTags} />
      </div>

      <StatutoryActionModal
        task={activeTask}
        open={Boolean(activeTask)}
        onOpenChange={(open) => {
          if (!open) setActiveTask(null);
        }}
      />
    </div>
  );
}
