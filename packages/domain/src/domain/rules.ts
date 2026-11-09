import {
  MONTHS,
  type ISODate,
  addBusinessDays,
  addMonths,
  businessDayOnOrBefore,
  daysInMonth,
  diffDays,
  endOfMonth,
  iso,
  lastBusinessDayOfMonth,
  parts,
  shiftMonth,
  yearOf,
} from './dates';
import { emp501Tier, serviceType } from './catalogue';
import { FIRST_LOADED_SEASON, filingSeason } from './sars';
import { rand, turnoverBand } from './pricing';
import type { Client, ServiceCode, Task, TaskStatus, VatCategory } from './types';

/** Months in each VAT period, by SARS category. */
export const VAT_SPAN: Record<VatCategory, number> = { A: 2, B: 2, C: 1, D: 6, E: 12, F: 4 };

/** Whether a VAT period ends in calendar month m. Category E follows the financial year end. */
export function vatPeriodEnds(cat: VatCategory, m: number, yearEndMonth: number): boolean {
  switch (cat) {
    case 'A':
      return m % 2 === 1;
    case 'B':
      return m % 2 === 0;
    case 'C':
      return true;
    case 'D':
      return m === 2 || m === 8;
    case 'E':
      return m === yearEndMonth;
    case 'F':
      return m === 2 || m === 6 || m === 10;
  }
}

const isCompanyLike = (c: Client) => c.entityType === 'Company' || c.entityType === 'Close corporation';

/** The services a client gets by default, read from what we know about them. Onboarding can switch any on or off. */
export function defaultServices(c: Client): ServiceCode[] {
  // An explicit scope — recorded by quote conversion or the client record's
  // service checkboxes — wins over the attribute-derived defaults.
  if (c.services) return [...c.services];

  const s: ServiceCode[] = [];
  if (c.entityType !== 'Individual' && c.lastAfsYear !== null) s.push('AFS');
  if (!c.taxElsewhere) {
    if (isCompanyLike(c) && c.lastIncomeTaxYear !== null) s.push('ITR14');
    if (c.entityType === 'Individual' && c.lastIncomeTaxYear !== null) s.push('ITR12');
    if (c.entityType === 'Trust' && c.lastIncomeTaxYear !== null) s.push('ITR12T');
    if (isCompanyLike(c) || c.entityType === 'Trust' || (c.entityType === 'Individual' && c.provisionalTaxpayer)) s.push('IRP6');
  }
  if (c.vatCategory) s.push('VAT201');
  if (c.payroll) s.push('EMP201', 'EMP501');
  if (isCompanyLike(c) && c.lastAnnualReturnYear !== null) s.push('CIPC_AR');
  if (isCompanyLike(c) && c.beneficialOwnershipFiled !== null) s.push('BO');
  return s;
}

interface Draft {
  key: string;
  period: string;
  part?: string;
  due?: ISODate;
  dueNote?: string;
  estimated?: boolean;
  likelyLate?: boolean;
  statutory?: boolean;
  feeLabel?: string;
  info?: string;
  missing?: string;
}

/**
 * Every deadline the client's services create: work still outstanding from past periods,
 * plus everything due within the horizon (12 months by default).
 * Recurring returns with no history in the register (VAT, EMP201, IRP6, EMP501) start from today.
 */
export function generateTasks(c: Client, services: ServiceCode[], asOf: ISODate, horizonMonths = 12): Task[] {
  const horizon = addMonths(asOf, horizonMonths);
  const tasks: Task[] = [];
  const assigneeId = c.subcontractorId ?? c.staffId;
  const taxYearEntity = c.entityType === 'Trust' || c.entityType === 'Individual';
  const yeMonth = taxYearEntity ? 2 : c.yearEndMonth;
  const fyEnd = (y: number) => endOfMonth(y, yeMonth);
  const fyLabel = (y: number) => (taxYearEntity ? `${y} tax year` : `FY ${MONTHS[yeMonth - 1]} ${y}`);
  let latestEnded = yearOf(asOf);
  while (fyEnd(latestEnded) > asOf) latestEnded--;

  const push = (service: ServiceCode, d: Draft) => {
    const type = serviceType(service);
    tasks.push({
      id: `${c.code}|${service}|${d.key}`,
      clientCode: c.code,
      service,
      period: d.period,
      part: d.part,
      due: d.due,
      dueNote: d.dueNote,
      estimated: d.estimated,
      likelyLate: d.likelyLate,
      info: d.info,
      missing: d.missing,
      statutory: d.statutory ?? type.statutory,
      review: type.review,
      feeLabel: d.feeLabel ?? type.feeLabel,
      assigneeId,
    });
  };

  /** Yearly work: outstanding years since the last one done, then upcoming ones; always at least the next one. */
  const yearly = (
    service: ServiceCode,
    lastDone: number,
    periodEnd: (y: number) => ISODate,
    make: (y: number) => Omit<Draft, 'key'>,
  ) => {
    let added = 0;
    for (let y = lastDone + 1; periodEnd(y) <= horizon; y++) {
      const d = make(y);
      const ended = periodEnd(y) <= asOf;
      const dueInWindow = d.due !== undefined && d.due <= horizon;
      if (ended || dueInWindow) {
        push(service, { key: String(y), ...d });
        added++;
      }
    }
    if (added === 0) {
      let y = lastDone + 1;
      while (periodEnd(y) <= asOf) y++;
      push(service, { key: String(y), ...make(y) });
    }
  };

  for (const service of services) {
    switch (service) {
      case 'AFS': {
        if (c.lastAfsYear === null) break;
        const trust = c.entityType === 'Trust';
        yearly('AFS', c.lastAfsYear, fyEnd, (y) => ({
          period: `FY ${MONTHS[yeMonth - 1]} ${y}`,
          due: addMonths(fyEnd(y), 6),
          statutory: !trust,
          dueNote: trust ? 'Internal target' : undefined,
        }));
        break;
      }
      case 'ITR14': {
        if (c.lastIncomeTaxYear === null) break;
        yearly('ITR14', c.lastIncomeTaxYear, fyEnd, (y) => ({
          period: fyLabel(y),
          due: businessDayOnOrBefore(addMonths(fyEnd(y), 12)),
        }));
        break;
      }
      case 'ITR12':
      case 'ITR12T': {
        if (c.lastIncomeTaxYear === null) break;
        const trust = service === 'ITR12T';
        yearly(service, c.lastIncomeTaxYear, (y) => endOfMonth(y, 2), (y) => {
          const season = filingSeason(y);
          const label = `${y} tax year`;
          if (season) {
            return {
              period: label,
              due: trust ? season.trusts : c.provisionalTaxpayer ? season.provisional : season.nonProvisional,
            };
          }
          if (y < FIRST_LOADED_SEASON) {
            return { period: label, dueNote: 'Filing season has closed', likelyLate: true };
          }
          // Not yet announced: estimate from the usual pattern (non-provisional in late October, others in late January).
          const est = trust || c.provisionalTaxpayer ? iso(y + 1, 1, 20) : iso(y, 10, 20);
          return { period: label, due: est, estimated: true, dueNote: 'Estimate until SARS announces the season' };
        });
        break;
      }
      case 'IRP6': {
        for (let y = latestEnded; y <= latestEnded + 2; y++) {
          const [p1y, p1m] = shiftMonth(y, yeMonth, -6);
          const payments: [string, ISODate][] = [
            ['1st payment', businessDayOnOrBefore(endOfMonth(p1y, p1m))],
            ['2nd payment', businessDayOnOrBefore(fyEnd(y))],
          ];
          for (const [part, due] of payments) {
            if (due >= asOf && due <= horizon) push('IRP6', { key: `${y}-${part}`, period: fyLabel(y), part, due });
          }
        }
        break;
      }
      case 'VAT201': {
        const cat = c.vatCategory;
        if (!cat) break;
        const span = VAT_SPAN[cat];
        const ends = (m: number) => vatPeriodEnds(cat, m, c.yearEndMonth);
        const [ay, am] = parts(asOf);
        let [y, m] = shiftMonth(ay, am, -2);
        const [hy, hm] = parts(horizon);
        while (y * 12 + m <= hy * 12 + hm) {
          const beforeRegistration = c.vatRegisteredOn !== undefined && endOfMonth(y, m) < c.vatRegisteredOn;
          if (ends(m) && !beforeRegistration) {
            const [ny, nm] = shiftMonth(y, m, 1);
            const due = lastBusinessDayOfMonth(ny, nm);
            if (due >= asOf && due <= horizon) {
              let period = `${MONTHS[m - 1]} ${y}`;
              if (span > 1) {
                const [sy, sm] = shiftMonth(y, m, -(span - 1));
                period = sy === y ? `${MONTHS[sm - 1]}–${MONTHS[m - 1]} ${y}` : `${MONTHS[sm - 1]} ${sy}–${MONTHS[m - 1]} ${y}`;
              }
              push('VAT201', { key: iso(y, m, 1).slice(0, 7), period, due });
            }
          }
          [y, m] = shiftMonth(y, m, 1);
        }
        break;
      }
      case 'EMP201': {
        const [ay, am] = parts(asOf);
        let [y, m] = shiftMonth(ay, am, -1);
        for (let i = 0; i < horizonMonths + 2; i++) {
          const [ny, nm] = shiftMonth(y, m, 1);
          const due = businessDayOnOrBefore(iso(ny, nm, 7));
          const beforeStart = c.payrollFrom !== undefined && endOfMonth(y, m) < c.payrollFrom;
          if (!beforeStart && due >= asOf && due <= horizon) push('EMP201', { key: iso(y, m, 1).slice(0, 7), period: `${MONTHS[m - 1]} ${y}`, due });
          [y, m] = [ny, nm];
        }
        break;
      }
      case 'EMP501': {
        const tier = emp501Tier(c.employeeCount);
        const feeLabel = tier ? tier.fee : 'Tier set from employee count';
        for (let y = yearOf(asOf); y <= yearOf(asOf) + 2; y++) {
          const recons: [string, string, ISODate, ISODate][] = [
            ['Interim', `Mar–Aug ${y - 1}`, endOfMonth(y - 1, 8), businessDayOnOrBefore(iso(y - 1, 10, 31))],
            ['Annual', `Mar ${y - 1}–Feb ${y}`, endOfMonth(y, 2), businessDayOnOrBefore(iso(y, 5, 31))],
          ];
          for (const [part, span, periodEnd, due] of recons) {
            const beforeStart = c.payrollFrom !== undefined && periodEnd < c.payrollFrom;
            if (!beforeStart && due >= asOf && due <= horizon) {
              push('EMP501', { key: `${y}-${part}`, period: `${y} tax year (${span})`, part, due, feeLabel });
            }
          }
        }
        break;
      }
      case 'CIPC_AR': {
        if (c.lastAnnualReturnYear === null) break;
        const last = c.lastAnnualReturnYear;
        // The CIPC fee depends on turnover, which the person filing also has to declare.
        const band = turnoverBand(c.turnover);
        const turnover = band
          ? {
              feeLabel: `R525 + ${rand(band.cipcFee)} CIPC fee`,
              info: `Turnover ${rand(c.turnover!)}${c.turnoverYear ? `, FY ${c.turnoverYear}` : ''}${c.turnoverSource ? `, from ${c.turnoverSource}` : ''}`,
            }
          : { feeLabel: 'R525 + CIPC fee by turnover', missing: 'Turnover not recorded' };
        if (c.incorporationDate) {
          const [, im, id] = parts(c.incorporationDate);
          const anniversary = (y: number) => iso(y, im, Math.min(id, daysInMonth(y, im)));
          yearly('CIPC_AR', last, anniversary, (y) => ({
            period: `${y} annual return`,
            due: addBusinessDays(anniversary(y), 30),
            ...turnover,
          }));
        } else {
          const thisYear = yearOf(asOf);
          for (let y = last + 1; y <= Math.max(last + 1, thisYear); y++) {
            push('CIPC_AR', {
              key: String(y),
              period: `${y} annual return`,
              dueNote: 'Add the incorporation date to set the deadline',
              likelyLate: y < thisYear,
              ...turnover,
            });
          }
        }
        break;
      }
      case 'BO':
        break;
    }
  }
  return tasks.sort(compareTasks);
}

export function compareTasks(a: Task, b: Task): number {
  const da = a.due ?? '9999-12-31';
  const db = b.due ?? '9999-12-31';
  if (da !== db) return da < db ? -1 : 1;
  return a.id < b.id ? -1 : 1;
}

export const isClosed = (status: TaskStatus) => status === 'Submitted' || status === 'Done';

export type Urgency = 'done' | 'overdue' | 'week' | 'month' | 'later' | 'no-date';

export function urgency(task: Task, status: TaskStatus, asOf: ISODate): Urgency {
  if (isClosed(status)) return 'done';
  if (!task.due) return task.likelyLate ? 'overdue' : 'no-date';
  const days = diffDays(task.due, asOf);
  if (days < 0) return 'overdue';
  if (days <= 7) return 'week';
  if (days <= 30) return 'month';
  return 'later';
}

/** Whether a task needs a partner's review before it is submitted. */
export function needsReview(task: Task, irp6Payable: boolean | undefined): boolean | undefined {
  if (task.review === 'always') return true;
  if (task.review === 'never') return false;
  return irp6Payable;
}
