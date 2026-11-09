import type { StaffMember } from 'fdoncall-practice/domain/types';
import type { ISODate } from 'fdoncall-practice/domain/dates';
import type { PracticeUser, StaffProfile } from '@/context/PracticeStoreContext';
import { personInitials } from '@/lib/initials';

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
  /** Internal notes recorded on the staff profile. */
  notes?: string;
}

/* ---------------------------------------------------------------------------
 * Build the staff-side user records the register reads: contact details plus
 * the contract terms actually on record. Nothing is invented — a subcontractor
 * with no rate on file reads `—`, and no start date appears where none exists.
 * ------------------------------------------------------------------------- */

export function buildStaffUsers(
  staff: StaffMember[],
  currentUser: PracticeUser | undefined,
  staffProfiles: Record<string, StaffProfile> = {}
): PracticeUser[] {
  return staff.map((member) => {
    const isCurrent = currentUser?.id === member.id;
    const contractType = contractTypeForKind(member.kind);
    const recorded = staffProfiles[member.id];

    return {
      id: member.id,
      name: isCurrent && currentUser ? currentUser.name : member.name,
      role: roleFor(member),
      email:
        isCurrent && currentUser?.email ? currentUser.email : `${member.id}@fdoncall.co.za`,
      kind: member.kind,
      contract: {
        ...recorded,
        contractType,
        ...(isCurrent ? currentUser?.contract ?? {} : {}),
      },
    };
  });
}

/** The persisted profile for one staff member, for the edit dialog. */
export function staffProfileOf(
  staffId: string,
  kind: StaffMember['kind'],
  profiles: Record<string, StaffProfile>,
  currentUser?: PracticeUser
): StaffProfile {
  return {
    ...profiles[staffId],
    contractType: contractTypeForKind(kind),
    ...(currentUser?.id === staffId ? currentUser.contract ?? {} : {}),
  };
}

/**
 * Whether a role change may run. Role changes are a `Settings — manage`
 * decision, and nobody may change their own role (no self-elevation into the
 * Partner sign-off).
 */
export function staffRoleChangeBlock(
  actorId: string,
  targetId: string,
  canManage: boolean
): string | null {
  if (targetId === actorId) return 'You cannot change your own role.';
  if (!canManage) return 'Role changes need Settings — manage permissions.';
  return null;
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
      initials: personInitials(member.name),
      role: user?.role ?? member.role,
      kind: member.kind,
      email: user?.email,
      phone: contract?.phone,
      startDate: contract?.startDate,
      contractType,
      // Only subcontracted hours carry a rate; employees show `—`, and a
      // subcontractor with no recorded rate shows `—` rather than a guess.
      hourlyRate: contractType === 'subcontractor' ? contract?.hourlyRate : undefined,
      notes: (contract as StaffProfile | undefined)?.notes,
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
