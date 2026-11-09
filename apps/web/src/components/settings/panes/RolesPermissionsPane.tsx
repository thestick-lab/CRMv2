import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Check,
  CornerDownRight,
  Info,
  Lock,
  Minus,
  RotateCcw,
  ShieldCheck,
  SlidersHorizontal,
  X,
  type LucideIcon,
} from 'lucide-react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';
import {
  DEFAULT_PERMISSION_MATRIX,
  PERMISSION_ROWS,
  ROLES,
  validatePermissionChange,
  type PermissionCell,
  type PermissionGroup,
  type PermissionRow,
  type PermissionState,
  type Role,
} from '@/lib/permissions';

/* ---------------------------------------------------------------------------
 * Roles & Permissions (design §6.8–6.9).
 *
 * The matrix may persist three cells only — Allowed, Not allowed, Limited.
 * `Inherited` means "no override recorded" and `Custom` means "a stored value
 * that differs from the §6.9 default"; both are derived for display from the
 * store's override map and are never written back.
 * ------------------------------------------------------------------------- */

export type StorableCell = 'Allowed' | 'Not allowed' | 'Limited';

export interface CellDisplay {
  /** The value that applies for this role: the stored override or the default. */
  effective: StorableCell;
  /** No override recorded (or the stored value equals the §6.9 default). */
  inherited: boolean;
  /** A stored value that differs from the §6.9 default. */
  custom: boolean;
}

export interface MatrixLegendEntry {
  cell: PermissionCell;
  label: string;
  description: string;
  icon: LucideIcon;
}

export const MATRIX_LEGEND: MatrixLegendEntry[] = [
  {
    cell: 'Allowed',
    label: 'Allowed',
    description: 'The role may perform this action without restriction.',
    icon: Check,
  },
  {
    cell: 'Not allowed',
    label: 'Not allowed',
    description: 'The action is refused for this role.',
    icon: X,
  },
  {
    cell: 'Limited',
    label: 'Limited',
    description: 'Allowed only where the record is assigned to the person.',
    icon: Minus,
  },
  {
    cell: 'Inherited',
    label: 'Inherited',
    description: 'No override recorded: the §6.9 default applies.',
    icon: CornerDownRight,
  },
  {
    cell: 'Custom',
    label: 'Custom',
    description: 'A stored permission that differs from the §6.9 default.',
    icon: SlidersHorizontal,
  },
];

export const DISPLAY_GROUPS: PermissionGroup[] = [
  'Clients',
  'Deadlines & Tasks',
  'Quotes & Invoices',
  'Time',
  'People',
  'Settings',
];

const ROLE_DESCRIPTIONS: Record<Role, string> = {
  Partner: 'Founder-level practice authority, including the partner sign-off gate.',
  'Compliance Officer': 'Company-secretarial duties, return submissions and client administration.',
  Accountant: 'Client accounting, quote preparation and invoice records.',
  'Team member': 'Practice work on client records and statutory deadlines.',
  Subcontractor: 'Assigned-client work only, scoped by the record owner.',
  'Support Tech': 'External IT and account support: settings and permissions only.',
};

const CELL_CYCLE: StorableCell[] = ['Not allowed', 'Limited', 'Allowed'];

/** The next storable state a cell click proposes; Inherited/Custom are never targets. */
export function nextStorableCell(current: PermissionCell): StorableCell {
  // Derived labels have no stored base: the first edit proposes `Not allowed`.
  if (current === 'Inherited' || current === 'Custom') return 'Not allowed';
  const index = CELL_CYCLE.indexOf(current);
  if (index === -1) return 'Not allowed';
  return CELL_CYCLE[(index + 1) % CELL_CYCLE.length];
}

export function cellDisplay(
  role: Role,
  row: PermissionRow,
  matrix: PermissionState['matrix']
): CellDisplay {
  const stored = matrix[role]?.[row.id];
  const fallback = row.defaults[role] ?? DEFAULT_PERMISSION_MATRIX[role]?.[row.id] ?? 'Not allowed';
  const defaultCell: StorableCell =
    fallback === 'Allowed' || fallback === 'Limited' ? fallback : 'Not allowed';

  if (stored === undefined || stored === 'Inherited') {
    return { effective: defaultCell, inherited: true, custom: false };
  }

  // Legacy persisted `Custom` read as the grant it was written from.
  const override: StorableCell =
    stored === 'Custom'
      ? 'Allowed'
      : stored === 'Allowed' || stored === 'Limited'
        ? stored
        : 'Not allowed';

  if (override === defaultCell) {
    return { effective: defaultCell, inherited: true, custom: false };
  }

  return { effective: override, inherited: false, custom: true };
}

export interface PermissionSummary {
  allowed: number;
  limited: number;
  notAllowed: number;
  total: number;
  overrides: Array<{ row: PermissionRow; cell: StorableCell }>;
}

export function permissionSummary(
  role: Role,
  matrix: PermissionState['matrix']
): PermissionSummary {
  return PERMISSION_ROWS.reduce<PermissionSummary>(
    (summary, row) => {
      const display = cellDisplay(role, row, matrix);
      summary.total += 1;
      if (display.effective === 'Allowed') summary.allowed += 1;
      else if (display.effective === 'Limited') summary.limited += 1;
      else summary.notAllowed += 1;
      if (display.custom) summary.overrides.push({ row, cell: display.effective });
      return summary;
    },
    { allowed: 0, limited: 0, notAllowed: 0, total: 0, overrides: [] }
  );
}

/** Confirmation copy: always names the role and the permission being changed. */
export function buildChangeSummary(
  role: Role,
  permissionLabel: string,
  from: StorableCell,
  to: StorableCell
): string {
  return `Change ${role}'s access to “${permissionLabel}” from ${from} to ${to}.`;
}

export function reasonText(reason: string): string {
  switch (reason) {
    case 'LOCKED_PERMISSION_ROW':
      return 'This row is locked: partner sign-off is a practice rule and cannot be changed in the matrix.';
    case 'PARTNER_MANAGE_REQUIRED':
      return 'The Partner role must keep “Manage permissions”. Grant it to another role before changing this cell.';
    case 'NOT_STORABLE_CELL':
      return 'Only Allowed, Limited and Not allowed can be saved. Inherited and Custom are derived for display.';
    case 'UNKNOWN_PERMISSION':
      return 'That permission is not part of the practice matrix.';
    case 'UNKNOWN_ROLE':
      return 'That role is not part of the practice matrix.';
    default:
      return 'That change cannot be saved.';
  }
}

interface PendingChange {
  role: Role;
  row: PermissionRow;
  from: StorableCell;
  to: StorableCell;
}

const CELL_TONE: Record<StorableCell, string> = {
  Allowed: 'text-emerald-600 dark:text-emerald-400',
  Limited: 'text-foreground/70',
  'Not allowed': 'text-muted-foreground/50',
};

function CellGlyph({ cell }: { cell: StorableCell }) {
  const Icon = cell === 'Allowed' ? Check : cell === 'Limited' ? Minus : X;
  return <Icon className={cn('h-3.5 w-3.5', CELL_TONE[cell])} aria-hidden="true" />;
}

export function RolesPermissionsPane() {
  const { currentUser, permissions, setPermission } = usePracticeStore();
  const matrix = permissions.matrix;
  const [selectedRole, setSelectedRole] = React.useState<Role>('Partner');
  const [pending, setPending] = React.useState<PendingChange | null>(null);
  const [feedback, setFeedback] = React.useState<string | null>(null);

  const summary = React.useMemo(
    () => permissionSummary(selectedRole, matrix),
    [selectedRole, matrix]
  );

  function requestChange(role: Role, row: PermissionRow, to: StorableCell) {
    if (row.locked) {
      setFeedback(reasonText('LOCKED_PERMISSION_ROW'));
      return;
    }
    const validation = validatePermissionChange({
      role,
      group: row.section,
      action: row.action,
      cell: to,
    });
    if (!validation.ok) {
      setFeedback(reasonText(validation.reason));
      return;
    }
    const from = cellDisplay(role, row, matrix).effective;
    if (from === to) return;
    setFeedback(null);
    setSelectedRole(role);
    setPending({ role, row, from, to });
  }

  function advanceCell(role: Role, row: PermissionRow) {
    const display = cellDisplay(role, row, matrix);
    requestChange(role, row, nextStorableCell(display.effective));
  }

  function resetToDefault(role: Role, row: PermissionRow) {
    const fallback = row.defaults[role] ?? 'Not allowed';
    const target: StorableCell =
      fallback === 'Allowed' || fallback === 'Limited' ? fallback : 'Not allowed';
    requestChange(role, row, target);
  }

  function confirmChange() {
    if (!pending) return;
    setPermission({
      role: pending.role,
      group: pending.row.section,
      action: pending.row.action,
      cell: pending.to,
    });
    setFeedback(
      `Saved — ${pending.role}: ${pending.row.label} is now ${pending.to}.`
    );
    setPending(null);
  }

  const groupedRows = React.useMemo(
    () =>
      DISPLAY_GROUPS.map((group) => ({
        group,
        rows: PERMISSION_ROWS.filter((row) => row.group === group),
      })),
    []
  );

  return (
    <div className="space-y-6 text-xs">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          <h2 className="text-base font-semibold text-foreground">Roles &amp; Permissions</h2>
          <p className="mt-1 max-w-2xl text-muted-foreground">
            The §6.9 permission matrix. Roles are fixed by the practice; a change here applies to
            that role only and is written to the governance log.
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <Badge variant="outline" className="font-mono text-[10px]">
            {ROLES.length} roles · fixed
          </Badge>
          <Button
            size="sm"
            variant="outline"
            disabled
            title="Roles are fixed: the six practice roles ship with the store."
            className="cursor-not-allowed"
          >
            Create Role
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-muted/20 px-4 py-3">
        {MATRIX_LEGEND.map((entry) => (
          <span
            key={entry.cell}
            className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground"
            title={entry.description}
          >
            <entry.icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="font-medium text-foreground">{entry.label}</span>
          </span>
        ))}
      </div>

      {feedback && (
        <div
          role="status"
          className={cn(
            'flex items-start gap-2 rounded-lg border px-3 py-2 text-[11px]',
            feedback.startsWith('Saved')
              ? 'border-border bg-muted/40 text-foreground'
              : 'border-destructive/30 bg-destructive/10 text-destructive'
          )}
        >
          <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
          <span>{feedback}</span>
        </div>
      )}

      <div className="grid grid-cols-1 items-start gap-6 xl:grid-cols-12">
        <section
          aria-label="Permission matrix"
          className="overflow-hidden rounded-xl border border-border bg-card xl:col-span-8"
        >
          <div className="overflow-x-auto">
            <table className="w-full min-w-[780px] border-collapse text-left">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th scope="col" className="w-[34%] px-3 py-2.5 text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-muted-foreground">
                    Permission
                  </th>
                  {ROLES.map((role) => (
                    <th key={role} scope="col" className="px-1 py-2 text-center">
                      <button
                        type="button"
                        onClick={() => setSelectedRole(role)}
                        aria-pressed={selectedRole === role}
                        className={cn(
                          'mx-auto flex w-full max-w-[92px] flex-col items-center gap-0.5 rounded-md px-1.5 py-1 text-[10px] leading-tight transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                          selectedRole === role
                            ? 'bg-primary/10 font-semibold text-primary'
                            : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                        )}
                      >
                        <span>{role}</span>
                      </button>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {groupedRows.map(({ group, rows }) => (
                  <React.Fragment key={group}>
                    <tr className="border-y border-border/70 bg-muted/20">
                      <th
                        scope="colgroup"
                        colSpan={ROLES.length + 1}
                        className="px-3 py-1.5 text-[10px] font-mono font-medium uppercase tracking-[0.14em] text-muted-foreground"
                      >
                        {group}
                      </th>
                    </tr>
                    {rows.map((row) => (
                      <tr key={row.id} className="border-b border-border/50 last:border-b-0">
                        <th scope="row" className="px-3 py-1.5 font-normal">
                          <span className="flex items-center gap-1.5 text-[11px] text-foreground">
                            {row.label}
                            {row.locked && (
                              <span
                                className="inline-flex items-center gap-1 rounded border border-border bg-muted px-1 py-px font-mono text-[9px] uppercase tracking-wide text-muted-foreground"
                                title="Practice rule: partner sign-off is not matrix-overridable."
                              >
                                <Lock className="h-2.5 w-2.5" aria-hidden="true" />
                                Locked
                              </span>
                            )}
                          </span>
                          <span className="mt-0.5 block font-mono text-[9px] text-muted-foreground/60">
                            {row.section}.{row.action}
                          </span>
                        </th>
                        {ROLES.map((role) => {
                          const display = cellDisplay(role, row, matrix);
                          const stateLabel = display.custom
                            ? 'custom override'
                            : 'inherited §6.9 default';
                          return (
                            <td key={role} className="px-1 py-1 text-center">
                              <button
                                type="button"
                                disabled={row.locked}
                                onClick={() => advanceCell(role, row)}
                                aria-label={`${row.label} for ${role}: ${display.effective}, ${stateLabel}`}
                                title={
                                  row.locked
                                    ? 'Locked: partner sign-off is a practice rule.'
                                    : `${display.effective} — ${stateLabel}. Click to change.`
                                }
                                className={cn(
                                  'relative mx-auto flex h-8 w-9 items-center justify-center rounded-md border border-transparent transition-colors focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
                                  row.locked
                                    ? 'cursor-not-allowed bg-muted/30 opacity-70'
                                    : 'cursor-pointer hover:border-border hover:bg-muted/60'
                                )}
                              >
                                <CellGlyph cell={display.effective} />
                                {display.custom && (
                                  <span
                                    className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-primary"
                                    aria-hidden="true"
                                  />
                                )}
                                {display.inherited && (
                                  <span
                                    className="absolute right-1 top-1 h-1.5 w-1.5 rounded-full bg-muted-foreground/25"
                                    aria-hidden="true"
                                  />
                                )}
                              </button>
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
          <div className="flex items-start gap-2 border-t border-border bg-muted/20 px-3 py-2 text-[10px] text-muted-foreground">
            <Lock className="mt-0.5 h-3 w-3 shrink-0" aria-hidden="true" />
            <p>
              Partner sign-off is a practice rule: the row is locked and cannot be changed in the
              matrix. Only a Partner may sign off, and that stays enforced outside this screen.
            </p>
          </div>
        </section>

        <aside className="space-y-4 xl:col-span-4">
          <section
            aria-label={`Role details: ${selectedRole}`}
            className="rounded-xl border border-border bg-card p-4"
          >
            <div className="flex items-center gap-1.5 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted-foreground">
              <ShieldCheck className="h-3 w-3" aria-hidden="true" />
              Role details
            </div>
            <h3 className="mt-1.5 text-base font-semibold text-foreground">{selectedRole}</h3>
            <p className="mt-0.5 text-[11px] text-muted-foreground">
              {ROLE_DESCRIPTIONS[selectedRole]}
            </p>

            <div className="mt-4 grid grid-cols-3 gap-2">
              {[
                { label: 'Allowed', value: summary.allowed },
                { label: 'Limited', value: summary.limited },
                { label: 'Not allowed', value: summary.notAllowed },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="rounded-lg border border-border/70 bg-muted/20 px-2 py-1.5"
                >
                  <div className="font-mono text-base tabular-nums text-foreground">
                    {stat.value}
                  </div>
                  <div className="text-[9px] uppercase tracking-wide text-muted-foreground">
                    {stat.label}
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-2 text-[10px] text-muted-foreground">
              {summary.total} permissions · {summary.overrides.length} custom override
              {summary.overrides.length === 1 ? '' : 's'}
            </p>

            <div className="mt-4 border-t border-border/70 pt-3">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-[0.14em] text-muted-foreground">
                  Custom overrides
                </span>
                <SlidersHorizontal className="h-3 w-3 text-muted-foreground" aria-hidden="true" />
              </div>
              {summary.overrides.length === 0 ? (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Every permission follows the §6.9 default for this role.
                </p>
              ) : (
                <ul className="mt-2 space-y-1.5">
                  {summary.overrides.map(({ row, cell }) => (
                    <li
                      key={row.id}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-background px-2 py-1.5"
                    >
                      <span className="min-w-0">
                        <span className="block truncate text-[11px] text-foreground">
                          {row.label}
                        </span>
                        <span className="block font-mono text-[9px] text-muted-foreground">
                          now {cell}
                        </span>
                      </span>
                      <button
                        type="button"
                        onClick={() => resetToDefault(selectedRole, row)}
                        title={`Reset ${row.label} to the §6.9 default for ${selectedRole}.`}
                        className="inline-flex shrink-0 items-center gap-1 rounded border border-border px-1.5 py-0.5 text-[10px] text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                      >
                        <RotateCcw className="h-2.5 w-2.5" aria-hidden="true" />
                        Default
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </section>

          <div className="flex items-start gap-2 rounded-xl border border-border bg-muted/20 px-3 py-2.5 text-[11px] text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true" />
            <p>Custom permissions override the inherited role settings for this role only.</p>
          </div>

          {permissions.lastEditedAt && (
            <p className="px-1 font-mono text-[10px] text-muted-foreground/70">
              Last edited by {permissions.lastEditedBy ?? currentUser.name} ·{' '}
              {new Date(permissions.lastEditedAt).toLocaleString('en-ZA')}
            </p>
          )}
        </aside>
      </div>

      <DialogPrimitive.Root
        open={pending !== null}
        onOpenChange={(open) => {
          if (!open) setPending(null);
        }}
      >
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 space-y-4 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <DialogPrimitive.Title className="flex items-center gap-2 text-base font-semibold text-foreground">
                <ShieldCheck className="h-4 w-4 text-primary" aria-hidden="true" />
                Confirm permission change
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button
                  className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
                  aria-label="Close"
                >
                  <X className="h-4 w-4" />
                </button>
              </DialogPrimitive.Close>
            </div>

            <div className="space-y-2 text-xs">
              <p className="text-foreground">
                {pending
                  ? buildChangeSummary(
                      pending.role,
                      pending.row.label,
                      pending.from,
                      pending.to
                    )
                  : null}
              </p>
              <p className="text-muted-foreground">
                This changes the {pending?.role} role only; every other role keeps its current
                settings. The change is recorded in the governance log.
              </p>
            </div>

            <div className="flex justify-end gap-2 border-t border-border pt-3">
              <DialogPrimitive.Close asChild>
                <Button size="sm" variant="outline" type="button">
                  Cancel
                </Button>
              </DialogPrimitive.Close>
              <Button size="sm" type="button" onClick={confirmChange}>
                Confirm change
              </Button>
            </div>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
