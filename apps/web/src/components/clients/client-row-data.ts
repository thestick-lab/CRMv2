import { STAFF, GROUPS } from 'fdoncall-practice/data/seed';
import { MONTHS } from 'fdoncall-practice/domain/dates';
import { defaultServices, generateTasks, urgency, type Urgency } from 'fdoncall-practice/domain/rules';
import type { Client, EntityType, ServiceCode, VatCategory } from 'fdoncall-practice/domain/types';

export interface NextDeadlineSummary {
  service: ServiceCode;
  due: string;
  period: string;
  urgency: Urgency;
}

export interface EnrichedClientRow {
  code: string;
  name: string;
  groupId?: string;
  groupName?: string;
  entityType: EntityType;
  staffId: string;
  subcontractorId?: string;
  staffName: string;
  yearEndMonth: number;
  yearEndLabel: string;
  yearEndAssumed: boolean;
  vatCategory?: VatCategory;
  vatLabel: string;
  payroll: boolean;
  payrollLabel: string;
  employeeCount?: number;
  services: ServiceCode[];
  nextDeadline?: NextDeadlineSummary;
}

export function enrichClientRows(clients: Client[], asOfDate: string): EnrichedClientRow[] {
  return clients.map((client) => {
    // Staff & Subcontractor
    const staff = STAFF.find((s) => s.id === client.staffId);
    const subcontractor = client.subcontractorId
      ? STAFF.find((s) => s.id === client.subcontractorId)
      : undefined;

    const staffName = staff
      ? subcontractor
        ? `${staff.name} with ${subcontractor.name}`
        : staff.name
      : 'Practice Pool';

    // Group
    const group = GROUPS.find((g) => g.id === client.groupId);
    const groupName = group ? group.name : undefined;

    // Year End (1-12 mapped to Jan-Dec)
    const monthName = MONTHS[client.yearEndMonth - 1] ?? `Month ${client.yearEndMonth}`;
    const yearEndLabel = client.yearEndAssumed ? `${monthName}*` : monthName;

    // VAT label (Cat A, Cat B, Cat C, or —)
    const vatLabel = client.vatCategory ? `Cat ${client.vatCategory}` : '—';

    // Payroll label (only show staff count when employeeCount is recorded)
    const payrollLabel = client.payroll
      ? client.employeeCount !== undefined
        ? `Yes (${client.employeeCount} staff)`
        : 'Yes'
      : '—';

    // Services
    const services = defaultServices(client);

    // Compute next statutory deadline (statutory tasks only)
    const tasks = generateTasks(client, services, asOfDate);
    const datedTasks = tasks.filter((t) => t.statutory !== false && t.due && t.due >= asOfDate);
    datedTasks.sort((a, b) => (a.due! < b.due! ? -1 : a.due! > b.due! ? 1 : 0));

    let nextDeadline: NextDeadlineSummary | undefined = undefined;
    if (datedTasks.length > 0) {
      const earliest = datedTasks[0];
      nextDeadline = {
        service: earliest.service,
        due: earliest.due!,
        period: earliest.period,
        urgency: urgency(earliest, 'Not started', asOfDate),
      };
    } else {
      // Fallback to earliest dated statutory task overall if none >= asOfDate
      const allDated = tasks.filter((t) => t.statutory !== false && t.due);
      allDated.sort((a, b) => (a.due! < b.due! ? -1 : a.due! > b.due! ? 1 : 0));
      if (allDated.length > 0) {
        nextDeadline = {
          service: allDated[0].service,
          due: allDated[0].due!,
          period: allDated[0].period,
          urgency: urgency(allDated[0], 'Not started', asOfDate),
        };
      }
    }

    return {
      code: client.code,
      name: client.name,
      groupId: client.groupId,
      groupName,
      entityType: client.entityType,
      staffId: client.staffId,
      subcontractorId: client.subcontractorId,
      staffName,
      yearEndMonth: client.yearEndMonth,
      yearEndLabel,
      yearEndAssumed: client.yearEndAssumed,
      vatCategory: client.vatCategory,
      vatLabel,
      payroll: client.payroll,
      payrollLabel,
      employeeCount: client.employeeCount,
      services,
      nextDeadline,
    };
  });
}
