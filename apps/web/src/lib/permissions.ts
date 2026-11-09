/* ---------------------------------------------------------------------------
 * Permission model (design §6.8–6.9).
 *
 * One declaration drives everything: the default matrix the store ships with,
 * the `can()` checks the views enforce, the locked partner sign-off row, and
 * (later) the Roles & Permissions settings matrix. Rows keep the §6.9 table's
 * own row names — `Clients.view`, `Invoices.view`, `Settings.manage` — so a
 * persisted override is legible without translating it back to a UI concept.
 * ------------------------------------------------------------------------- */

export const ROLES: readonly Role[] = [
  'Partner',
  'Compliance Officer',
  'Accountant',
  'Team member',
  'Subcontractor',
  'Support Tech',
];

export type Role =
  | 'Partner'
  | 'Compliance Officer'
  | 'Accountant'
  | 'Team member'
  | 'Subcontractor'
  | 'Support Tech';

/** The six groups the settings matrix renders. */
export type PermissionGroup =
  | 'Clients'
  | 'Deadlines & Tasks'
  | 'Quotes & Invoices'
  | 'Time'
  | 'People'
  | 'Settings';

/**
 * The §6.9 row prefixes. Several rows share one settings group (Quotes and
 * Invoices both live under `Quotes & Invoices`), so `can()` accepts either the
 * group name or the row's own prefix as its `group` argument.
 */
export type PermissionSection =
  | 'Clients'
  | 'Deadlines'
  | 'Quotes'
  | 'Invoices'
  | 'Time'
  | 'People'
  | 'Settings'
  | 'Governance log';

export type PermissionCell =
  | 'Allowed'
  | 'Not allowed'
  | 'Limited'
  | 'Inherited'
  | 'Custom';

/**
 * What the matrix may persist. `Inherited` is the absence of an override and
 * `Custom` is a badge the matrix UI derives from a stored value that differs
 * from the default — neither is ever written.
 */
export const STORABLE_PERMISSION_CELLS: readonly PermissionCell[] = [
  'Allowed',
  'Not allowed',
  'Limited',
];

/**
 * Role → `<section>.<action>` → cell. Only overrides are persisted; the default
 * matrix is the fallback for every key a role has not been granted explicitly.
 */
export interface PermissionState {
  matrix: Partial<Record<Role, Record<string, PermissionCell>>>;
  lastEditedBy?: string;
  lastEditedAt?: string;
}

export type PermissionMatrix = Record<Role, Record<string, PermissionCell>>;

export interface PermissionRow {
  /** Persisted matrix key and the §6.9 row name (`Clients.view`). */
  id: string;
  section: PermissionSection;
  /** Settings group the row is rendered under. */
  group: PermissionGroup;
  action: string;
  label: string;
  /** Extra action words `can()` accepts for this row. */
  aliases: readonly string[];
  /** Practice rule, not matrix-overridable (partner sign-off). */
  locked?: boolean;
  defaults: Readonly<Record<Role, PermissionCell>>;
}

interface RowDefinition {
  section: PermissionSection;
  action: string;
  group: PermissionGroup;
  label: string;
  aliases: readonly string[];
  locked?: boolean;
  /** §6.9 columns in table order: Partner, Compliance, Accountant, Team member, Subcontractor, Support Tech. */
  cells: readonly [
    PermissionCell,
    PermissionCell,
    PermissionCell,
    PermissionCell,
    PermissionCell,
    PermissionCell,
  ];
}

const ALLOW: PermissionCell = 'Allowed';
const NOT: PermissionCell = 'Not allowed';
const LIMITED: PermissionCell = 'Limited';

/**
 * §6.9 default permission matrix, transcribed row by row. Notes on the cells
 * whose table value carries a parenthetical:
 * - `Deadlines — submit returns` for Compliance Officer / Accountant reads
 *   "A (non-gated)": the cell is Allowed and the partner gate on gated returns
 *   stays with `validateStatutorySubmission`, unchanged.
 * - `Time — log own` for Subcontractor reads "A (assigned)": a Limited cell in
 *   this matrix, allowed only for the subcontractor's assigned clients (see
 *   `isAssignedTo`). Support Tech's identical-looking cell is Not allowed.
 */
const ROW_DEFINITIONS: readonly RowDefinition[] = [
  {
    section: 'Clients',
    action: 'view',
    group: 'Clients',
    label: 'View clients',
    aliases: ['view'],
    cells: [ALLOW, ALLOW, ALLOW, ALLOW, LIMITED, NOT],
  },
  {
    section: 'Clients',
    action: 'create-edit',
    group: 'Clients',
    label: 'Create and edit clients',
    aliases: ['create', 'edit', 'create-edit'],
    cells: [ALLOW, ALLOW, ALLOW, NOT, NOT, NOT],
  },
  {
    section: 'Clients',
    action: 'view-billing',
    group: 'Clients',
    label: 'View client billing',
    aliases: ['view-billing', 'billing'],
    cells: [ALLOW, ALLOW, ALLOW, NOT, NOT, NOT],
  },
  {
    section: 'Deadlines',
    action: 'view',
    group: 'Deadlines & Tasks',
    label: 'View deadlines',
    aliases: ['view'],
    cells: [ALLOW, ALLOW, ALLOW, ALLOW, LIMITED, NOT],
  },
  {
    section: 'Deadlines',
    action: 'update-status',
    group: 'Deadlines & Tasks',
    label: 'Update task status',
    aliases: ['update-status', 'update'],
    cells: [ALLOW, ALLOW, ALLOW, ALLOW, LIMITED, NOT],
  },
  {
    section: 'Deadlines',
    action: 'submit-returns',
    group: 'Deadlines & Tasks',
    label: 'Submit returns',
    aliases: ['submit-returns', 'submit'],
    cells: [ALLOW, ALLOW, ALLOW, NOT, NOT, NOT],
  },
  {
    section: 'Deadlines',
    action: 'partner-sign-off',
    group: 'Deadlines & Tasks',
    label: 'Partner sign-off',
    aliases: ['partner-sign-off', 'sign-off', 'signoff'],
    locked: true,
    cells: [ALLOW, NOT, NOT, NOT, NOT, NOT],
  },
  {
    section: 'Quotes',
    action: 'view-create-send',
    group: 'Quotes & Invoices',
    label: 'View, create and send quotes',
    aliases: ['view-create-send', 'view', 'create', 'send'],
    cells: [ALLOW, ALLOW, ALLOW, ALLOW, NOT, NOT],
  },
  {
    section: 'Quotes',
    action: 'accept-sign',
    group: 'Quotes & Invoices',
    label: 'Accept and sign quotes',
    aliases: ['accept-sign', 'accept', 'sign'],
    cells: [ALLOW, ALLOW, NOT, NOT, NOT, NOT],
  },
  {
    section: 'Invoices',
    action: 'view',
    group: 'Quotes & Invoices',
    label: 'View invoices',
    aliases: ['view'],
    cells: [ALLOW, ALLOW, ALLOW, NOT, NOT, NOT],
  },
  {
    section: 'Invoices',
    action: 'create-send',
    group: 'Quotes & Invoices',
    label: 'Create, send and mark invoices paid',
    aliases: ['create-send', 'create', 'send', 'mark-paid'],
    cells: [ALLOW, ALLOW, NOT, NOT, NOT, NOT],
  },
  {
    section: 'Time',
    action: 'log-own',
    group: 'Time',
    label: 'Log own time',
    aliases: ['log-own', 'log'],
    // §6.9 "A (assigned)": allowed for the subcontractor's assigned clients
    // only, so the call sites pass `{ assigned }` (see `isAssignedTo`).
    cells: [ALLOW, ALLOW, ALLOW, ALLOW, LIMITED, NOT],
  },
  {
    section: 'Time',
    action: 'view-all',
    group: 'Time',
    label: 'View all time and edit rules',
    aliases: ['view-all', 'view'],
    cells: [ALLOW, ALLOW, NOT, NOT, NOT, NOT],
  },
  {
    section: 'People',
    action: 'view-invite',
    group: 'People',
    label: 'View people and invite',
    aliases: ['view-invite', 'view', 'invite'],
    cells: [ALLOW, ALLOW, NOT, NOT, NOT, ALLOW],
  },
  {
    section: 'Settings',
    action: 'view',
    group: 'Settings',
    label: 'View settings',
    aliases: ['view'],
    cells: [ALLOW, ALLOW, NOT, NOT, NOT, ALLOW],
  },
  {
    section: 'Settings',
    action: 'edit',
    group: 'Settings',
    label: 'Edit rules and pricing',
    aliases: ['edit', 'edit-rules', 'edit-pricing'],
    cells: [ALLOW, ALLOW, NOT, NOT, NOT, ALLOW],
  },
  {
    section: 'Settings',
    action: 'manage',
    group: 'Settings',
    label: 'Manage permissions',
    aliases: ['manage', 'manage-permissions'],
    cells: [ALLOW, NOT, NOT, NOT, NOT, ALLOW],
  },
  {
    section: 'Governance log',
    action: 'view',
    group: 'Settings',
    label: 'View governance log',
    aliases: ['view'],
    cells: [ALLOW, ALLOW, NOT, NOT, NOT, ALLOW],
  },
];

function defaultsFor(cells: RowDefinition['cells']): Record<Role, PermissionCell> {
  return {
    Partner: cells[0],
    'Compliance Officer': cells[1],
    Accountant: cells[2],
    'Team member': cells[3],
    Subcontractor: cells[4],
    'Support Tech': cells[5],
  };
}

export const PERMISSION_ROWS: readonly PermissionRow[] = ROW_DEFINITIONS.map(
  ({ section, action, group, label, aliases, locked, cells }) => ({
    id: `${section}.${action}`,
    section,
    group,
    action,
    label,
    aliases,
    locked,
    defaults: defaultsFor(cells),
  })
);

/** The matrix the store ships with; every role/row cell is spelled out. */
export const DEFAULT_PERMISSION_MATRIX: PermissionMatrix = ROLES.reduce(
  (matrix, role) => {
    matrix[role] = PERMISSION_ROWS.reduce<Record<string, PermissionCell>>((cells, row) => {
      cells[row.id] = row.defaults[role];
      return cells;
    }, {});
    return matrix;
  },
  {} as PermissionMatrix
);

/* ---------------------------------------------------------------------------
 * Invite policy (§6.9 / role-change gate).
 *
 * Minting an account into a role at or above Compliance Officer is a
 * `Settings — manage` decision — the same grant that guards role changes — so
 * a Compliance Officer cannot invite themselves a Partner account behind
 * `Settings — view` or `People — view-invite`. Both invite entry points and the
 * store's reducer resolve the rule here; there is no second copy.
 * ------------------------------------------------------------------------- */

export const MANAGE_REQUIRED_INVITE_ROLES: readonly Role[] = [
  'Partner',
  'Compliance Officer',
];

/** The one reason shown wherever an invite role is withheld. */
export const INVITE_ROLE_NOTE =
  'Partner and Compliance Officer invites need Settings — manage.';

export function canInviteWithRole(
  role: Role,
  targetRole: string,
  matrix: PermissionState['matrix'] = DEFAULT_PERMISSION_MATRIX
): boolean {
  if (!MANAGE_REQUIRED_INVITE_ROLES.includes(targetRole as Role)) return true;
  return can(role, 'Settings', 'manage', matrix);
}

export function inviteRoleBlock(
  role: Role,
  targetRole: string,
  matrix: PermissionState['matrix'] = DEFAULT_PERMISSION_MATRIX
): string | null {
  if (canInviteWithRole(role, targetRole, matrix)) return null;
  return INVITE_ROLE_NOTE;
}

/** The roles `role` may assign through either invite surface, in matrix order. */
export function assignableInviteRoles(
  role: Role,
  matrix: PermissionState['matrix'] = DEFAULT_PERMISSION_MATRIX
): Role[] {
  return ROLES.filter((candidate) => canInviteWithRole(role, candidate, matrix));
}

/** The partner sign-off row is practice rule and never matrix-overridable. */
export const SIGN_OFF_LOCKED = true;

export type PermissionGroupInput = PermissionGroup | PermissionSection;

export interface CanOptions {
  /**
   * Set by call sites that can prove the record is assigned to this person, so
   * a `Limited` cell resolves to allowed instead of refused.
   */
  assigned?: boolean;
}

function matchesAction(row: PermissionRow, action: string): boolean {
  const normalized = action.trim().toLowerCase().replace(/\s+/g, '-');
  if (row.action === normalized) return true;
  return row.aliases.some((alias) => alias.toLowerCase().replace(/\s+/g, '-') === normalized);
}

/**
 * Resolve a `(group, action)` pair onto its §6.9 row. The row's own section
 * wins so `Settings.view` never collides with another Settings-group row that
 * happens to share the action.
 */
export function permissionRowFor(
  group: PermissionGroupInput | string,
  action: string
): PermissionRow | null {
  const exact = PERMISSION_ROWS.find(
    (row) => row.section === group && matchesAction(row, action)
  );
  if (exact) return exact;
  return (
    PERMISSION_ROWS.find((row) => row.group === group && matchesAction(row, action)) ?? null
  );
}

function cellAllows(cell: PermissionCell, options: CanOptions): boolean {
  switch (cell) {
    case 'Allowed':
    case 'Custom':
      return true;
    case 'Limited':
      return options.assigned === true;
    case 'Inherited':
    case 'Not allowed':
    default:
      return false;
  }
}

/**
 * The cell that actually applies: a stored override wins, but `Inherited`
 * means "use the role default" (and legacy persisted `Custom` reads as the
 * grant it was written from).
 */
function effectiveCell(
  role: Role,
  row: PermissionRow,
  matrix: PermissionState['matrix']
): PermissionCell {
  const stored = matrix[role]?.[row.id];
  if (stored && stored !== 'Inherited') return stored;
  return DEFAULT_PERMISSION_MATRIX[role]?.[row.id] ?? 'Not allowed';
}

/**
 * Whether `role` may perform `action` in `group`. `matrix` carries the store's
 * persisted overrides — the default matrix fills any key the override omits.
 */
export function can(
  role: Role,
  group: PermissionGroupInput,
  action: string,
  matrix: PermissionState['matrix'] = DEFAULT_PERMISSION_MATRIX,
  options: CanOptions = {}
): boolean {
  const row = permissionRowFor(group, action);
  if (!row) return false;
  return cellAllows(effectiveCell(role, row, matrix), options);
}

/* ---------------------------------------------------------------------------
 * `Limited (assigned)` scope.
 *
 * Clients and statutory tasks record their responsible partner and
 * subcontractor; a Limited cell passes only when the record names this user.
 * ------------------------------------------------------------------------- */

export interface AssignmentScope {
  staffId: string;
  subcontractorId?: string;
}

export function isAssignedTo(userId: string, record: AssignmentScope): boolean {
  return record.staffId === userId || record.subcontractorId === userId;
}

/** Filter a register down to the records this user is responsible for. */
export function scopeToAssigned<T extends AssignmentScope>(
  records: readonly T[],
  userId: string
): T[] {
  return records.filter((record) => isAssignedTo(userId, record));
}

/** `can()` with the record's own assignment supplying the Limited scope. */
export function canForAssignedRecord(
  role: Role,
  group: PermissionGroupInput,
  action: string,
  matrix: PermissionState['matrix'],
  userId: string,
  record: AssignmentScope
): boolean {
  return can(role, group, action, matrix, { assigned: isAssignedTo(userId, record) });
}

/** Partner sign-off authority: unchanged practice rule (`role === 'Partner'`). */
export function canSignOff(role: string): boolean {
  return role === 'Partner';
}

export type PermissionChange = {
  role: Role;
  group: PermissionGroupInput;
  action: string;
  cell: PermissionCell;
};

export type PermissionChangeValidation =
  | { ok: true; row: PermissionRow }
  | { ok: false; reason: string };

/** The Partner can never lose manage-permissions; everything else is editable. */
const PARTNER_REQUIRED_ROW = 'Settings.manage';

/**
 * Validate a matrix edit before it reaches the store. Rejected edits change
 * nothing (no state write, no activity entry).
 */
export function validatePermissionChange(
  change: PermissionChange
): PermissionChangeValidation {
  if (!ROLES.includes(change.role)) {
    return { ok: false, reason: 'UNKNOWN_ROLE' };
  }
  if (!STORABLE_PERMISSION_CELLS.includes(change.cell)) {
    // `Inherited` is the absence of an override; `Custom` is derived for display.
    return { ok: false, reason: 'NOT_STORABLE_CELL' };
  }

  const row = permissionRowFor(change.group, change.action);
  if (!row) return { ok: false, reason: 'UNKNOWN_PERMISSION' };

  if (SIGN_OFF_LOCKED && row.locked) {
    return { ok: false, reason: 'LOCKED_PERMISSION_ROW' };
  }

  if (row.id === PARTNER_REQUIRED_ROW && change.role === 'Partner' && change.cell !== 'Allowed') {
    return { ok: false, reason: 'PARTNER_MANAGE_REQUIRED' };
  }

  return { ok: true, row };
}
