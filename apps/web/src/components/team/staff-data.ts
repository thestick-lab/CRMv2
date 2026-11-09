import type { StaffMember } from 'fdoncall-practice/domain/types';
import type { ISODate } from 'fdoncall-practice/domain/dates';
import type { PracticeUser } from '@/context/PracticeStoreContext';

/* ---------------------------------------------------------------------------
 * Staff register data (Team view): a dense, HR-style view of the practice
 * team. Client directors are NOT here — those records live on each client's
 * `contacts` and surface in the client Organization tab.
 * ------------------------------------------------------------------------- */

const PRACTICE_ROLES: Array<PracticeUser['role']> = [
  'Partner',
  'Compliance Officer',
  'Accountant',
  'Team member',
  'Subcontractor',
];

export function contractTypeForKind(kind: StaffMember['kind']): 'employee' | 'subcontractor' {
  return kind === 'subcontractor' ? 'subcontractor' : 'employee';
}

function roleFor(member: StaffMember): PracticeUser['role'] {
  return PRACTICE_ROLES.includes(member.role as PracticeUser['role'])
    ? (member.role as PracticeUser['role'])
    : 'Team member';
}

function initialsFor(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return '—';
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0]}${parts[parts.length - 1][0]}`.toUpperCase();
}

export interface StaffRow {
  id: string;
  name: string;
  initials: string;
  role: string;
  kind: StaffMember['kind'];
  email?: string;
  phone?: string;
  startDate?: ISODate;
  contractType: 'employee' | 'subcontractor';
  hourlyRate?: number;
}

/* ---------------------------------------------------------------------------
 * Build the staff-side user records the register reads: contact details plus
 * contract terms. Only facts already on record are filled in — subcontracted
 * hours bill at the practice's standard hourly rate (the seeded rate), and no
 * start date is invented where the seed has none.
 * ------------------------------------------------------------------------- */

export function buildStaffUsers(
  staff: StaffMember[],
  currentUser: PracticeUser | undefined,
  standardHourlyRate: number
): PracticeUser[] {
  return staff.map((member) => {
    const isCurrent = currentUser?.id === member.id;
    const contractType = contractTypeForKind(member.kind);

    return {
      id: member.id,
      name: isCurrent && currentUser ? currentUser.name : member.name,
      role: roleFor(member),
      email:
        isCurrent && currentUser?.email ? currentUser.email : `${member.id}@fdoncall.co.za`,
      kind: member.kind,
      contract: {
        contractType,
        ...(contractType === 'subcontractor' ? { hourlyRate: standardHourlyRate } : {}),
        ...(isCurrent ? currentUser?.contract ?? {} : {}),
      },
    };
  });
}

/** Join the staff register with its user records (contact + contract terms). */
export function staffRows(staff: StaffMember[], users: PracticeUser[]): StaffRow[] {
  const usersById = new Map(users.map((user) => [user.id, user]));

  return staff.map((member) => {
    const user = usersById.get(member.id);
    const contractType = user?.contract?.contractType ?? contractTypeForKind(member.kind);
    const contract = user?.contract;

    return {
      id: member.id,
      name: member.name,
      initials: initialsFor(member.name),
      role: member.role,
      kind: member.kind,
      email: user?.email,
      phone: contract?.phone,
      startDate: contract?.startDate,
      contractType,
      // Only subcontracted hours carry a rate; employees show `—`.
      hourlyRate: contractType === 'subcontractor' ? contract?.hourlyRate : undefined,
    };
  });
}

export function filterStaffRows(rows: StaffRow[], query: string): StaffRow[] {
  const q = query.trim().toLowerCase();
  if (!q) return rows;
  return rows.filter(
    (row) =>
      row.name.toLowerCase().includes(q) ||
      row.role.toLowerCase().includes(q) ||
      row.kind.toLowerCase().includes(q) ||
      Boolean(row.email?.toLowerCase().includes(q))
  );
}

/** `R 625/h` for subcontracted rows. */
export function formatHourlyRate(rate?: number): string {
  if (rate === undefined) return '—';
  return `R ${rate.toLocaleString('en-ZA', { maximumFractionDigits: 2 })}/h`;
}

/** `1 Mar 2024` from an ISO date, or `—`. */
export function formatStartDate(date?: ISODate): string {
  if (!date) return '—';
  const parsed = new Date(date);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleDateString('en-ZA', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
