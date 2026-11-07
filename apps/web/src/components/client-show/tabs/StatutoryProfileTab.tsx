import type { Client } from 'fdoncall-practice/domain/types';
import { MONTHS_LONG } from 'fdoncall-practice/domain/dates';
import { STAFF, GROUPS } from 'fdoncall-practice/data/seed';
import { Badge } from '@/components/ui/badge';
import {
  AlertTriangle,
  Building,
  FileCheck,
  Landmark,
  Users,
} from 'lucide-react';

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
    const cycleDesc =
      client.vatCategory === 'A'
        ? 'Odd Months'
        : client.vatCategory === 'B'
        ? 'Even Months'
        : client.vatCategory === 'C'
        ? 'Monthly'
        : `Category ${client.vatCategory}`;
    vatLabel = `Category ${client.vatCategory} (${cycleDesc})`;
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

  const boStatusLabel = client.beneficialOwnershipFiled === true
    ? 'Filed with CIPC'
    : client.beneficialOwnershipFiled === false
    ? 'Filing Overdue / Required'
    : 'Not Applicable';

  return {
    entityType: client.entityType,
    yearEndLabel,
    yearEndAssumed: client.yearEndAssumed,
    vatLabel,
    efilingProfileLabel,
    turnoverLabel,
    partnerLabel,
    subcontractorLabel,
    groupLabel: group?.name,
    boStatusLabel,
    lastAfsYear: client.lastAfsYear ? String(client.lastAfsYear) : 'Not Provided',
    lastIncomeTaxYear: client.lastIncomeTaxYear ? String(client.lastIncomeTaxYear) : 'Not Provided',
  };
}

export function StatutoryProfileTab({ client }: { client: Client }) {
  const p = buildProfileDetails(client);

  return (
    <div className="space-y-6">
      {/* 3 Grid Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Card 1: Statutory & CIPC Secretarial */}
        <div className="border border-border/80 rounded-lg p-5 bg-card/60 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Building className="h-4 w-4 text-[#c4161c]" />
            <h2 className="text-sm font-semibold text-foreground">CIPC &amp; Secretarial Profile</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-muted-foreground text-[11px]">Entity Classification</div>
              <div className="font-medium text-foreground mt-0.5">{p.entityType}</div>
            </div>

            <div>
              <div className="text-muted-foreground text-[11px]">Financial Year-End</div>
              <div className="flex items-center gap-1.5 font-mono text-foreground mt-0.5">
                <span>{p.yearEndLabel}</span>
                {p.yearEndAssumed && (
                  <Badge variant="warning" className="text-[10px] py-0 px-1 font-sans gap-1">
                    <AlertTriangle className="h-3 w-3" /> Unverified
                  </Badge>
                )}
              </div>
            </div>

            <div>
              <div className="text-muted-foreground text-[11px]">Beneficial Ownership Register</div>
              <div className="font-medium text-foreground mt-0.5 flex items-center gap-1.5">
                <FileCheck className="h-3.5 w-3.5 text-emerald-500" />
                <span>{p.boStatusLabel}</span>
              </div>
            </div>

            <div>
              <div className="text-muted-foreground text-[11px]">CIPC Incorporation Date</div>
              <div className="font-mono text-foreground mt-0.5">{client.incorporationDate ?? 'Pre-1994 / Unrecorded'}</div>
            </div>

            <div>
              <div className="text-muted-foreground text-[11px]">Last Annual Financial Statements (AFS)</div>
              <div className="font-mono text-foreground mt-0.5">FY {p.lastAfsYear}</div>
            </div>
          </div>
        </div>

        {/* Card 2: SARS Tax & Revenue Governance */}
        <div className="border border-border/80 rounded-lg p-5 bg-card/60 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Landmark className="h-4 w-4 text-[#c4161c]" />
            <h2 className="text-sm font-semibold text-foreground">SARS Tax &amp; eFiling</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-muted-foreground text-[11px]">SARS eFiling Administration</div>
              <div className="font-medium text-foreground mt-0.5">{p.efilingProfileLabel}</div>
            </div>

            <div>
              <div className="text-muted-foreground text-[11px]">Value-Added Tax (VAT)</div>
              <div className="font-medium font-mono text-foreground mt-0.5">{p.vatLabel}</div>
            </div>

            <div>
              <div className="text-muted-foreground text-[11px]">Declared Practice Turnover</div>
              <div className="font-mono text-foreground font-semibold mt-0.5">{p.turnoverLabel}</div>
            </div>

            <div>
              <div className="text-muted-foreground text-[11px]">Last Income Tax Assessment Year</div>
              <div className="font-mono text-foreground mt-0.5">Tax Year {p.lastIncomeTaxYear}</div>
            </div>
          </div>
        </div>

        {/* Card 3: Practice Governance & Staffing */}
        <div className="border border-border/80 rounded-lg p-5 bg-card/60 space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-border/60">
            <Users className="h-4 w-4 text-[#c4161c]" />
            <h2 className="text-sm font-semibold text-foreground">Practice Governance</h2>
          </div>

          <div className="space-y-3 text-xs">
            <div>
              <div className="text-muted-foreground text-[11px]">Managing Partner</div>
              <div className="font-medium text-foreground mt-0.5">{p.partnerLabel}</div>
            </div>

            <div>
              <div className="text-muted-foreground text-[11px]">Assigned Subcontractor</div>
              <div className="text-foreground mt-0.5">{p.subcontractorLabel}</div>
            </div>

            {p.groupLabel && (
              <div>
                <div className="text-muted-foreground text-[11px]">Associated Client Group</div>
                <div className="font-mono text-foreground mt-0.5">{p.groupLabel}</div>
              </div>
            )}

            <div>
              <div className="text-muted-foreground text-[11px]">Payroll Operations</div>
              <div className="text-foreground mt-0.5">
                {client.payroll ? `Active (${client.employeeCount ?? 0} employees)` : 'No Payroll Service'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
