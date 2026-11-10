import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { ChevronRight, Search, UserPlus, X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { Role } from '@/lib/permissions';
import {
  filterStaffRows,
  formatHourlyRate,
  formatStartDate,
  type StaffRow,
} from './staff-data';

export interface StaffDirectoryProps {
  rows: StaffRow[];
  onOpen: (staffId: string) => void;
}

/** Dense staff register: hairline rows, contract terms, row click → profile. */
export function StaffDirectory({ rows, onOpen }: StaffDirectoryProps) {
  const [query, setQuery] = React.useState('');
  const visible = filterStaffRows(rows, query);

  const employeeCount = rows.filter((r) => r.kind === 'employee').length;
  const subcontractorCount = rows.length - employeeCount;

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
          {rows.length} {rows.length === 1 ? 'member' : 'members'} · {employeeCount} employed ·{' '}
          {subcontractorCount} subcontracted
        </p>

        <label className="relative block w-full sm:w-64">
          <Search
            aria-hidden="true"
            className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground"
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search staff, role or email"
            aria-label="Search staff"
            className="h-8 w-full rounded-md border border-border bg-background pl-8 pr-2.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
          />
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-border bg-muted/40 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
              <th scope="col" className="px-4 py-2.5 font-medium">
                Name
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Role
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Kind
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Contact
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Start date
              </th>
              <th scope="col" className="px-4 py-2.5 font-medium">
                Contract
              </th>
              <th scope="col" className="w-8 px-2 py-2.5">
                <span className="sr-only">Open</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {visible.map((row) => (
              <tr
                key={row.id}
                tabIndex={0}
                aria-label={`Open ${row.name}'s staff profile`}
                onClick={() => onOpen(row.id)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onOpen(row.id);
                  }
                }}
                className="cursor-pointer outline-none transition-colors hover:bg-muted/30 focus-visible:bg-muted/30 focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c4161c]"
              >
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2.5">
                    <span
                      aria-hidden="true"
                      className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md border border-border bg-muted font-mono text-[11px] font-semibold text-foreground"
                    >
                      {row.initials}
                    </span>
                    <span className="font-medium text-foreground">{row.name}</span>
                  </div>
                </td>
                <td className="px-4 py-2.5 text-muted-foreground">{row.role}</td>
                <td className="px-4 py-2.5">
                  <Badge
                    variant={row.kind === 'subcontractor' ? 'crimsonSubdued' : 'outline'}
                    className="font-mono text-[11px] capitalize"
                  >
                    {row.kind}
                  </Badge>
                </td>
                <td className="px-4 py-2.5">
                  <div className="space-y-0.5">
                    <p className="truncate text-foreground">{row.email || '—'}</p>
                    {row.phone && <p className="font-mono text-[11px] text-muted-foreground">{row.phone}</p>}
                  </div>
                </td>
                <td className="px-4 py-2.5 font-mono text-[11px] tabular-nums text-muted-foreground">
                  {formatStartDate(row.startDate)}
                </td>
                <td className="px-4 py-2.5">
                  <div className="flex items-center gap-2">
                    <span className="capitalize text-muted-foreground">{row.contractType}</span>
                    {row.contractType === 'subcontractor' && (
                      <span className="font-mono text-[11px] tabular-nums text-foreground">
                        {formatHourlyRate(row.hourlyRate)}
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-2 py-2.5">
                  <ChevronRight aria-hidden="true" className="h-3.5 w-3.5 text-muted-foreground" />
                </td>
              </tr>
            ))}
            {visible.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-8 text-center text-muted-foreground">
                  No staff match “{query.trim()}”.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}

export interface InviteTeamMemberInput {
  name: string;
  email: string;
  role: Role;
  kind: 'employee' | 'subcontractor';
}

export interface InviteMemberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onInvite: (member: InviteTeamMemberInput) => void;
  /** Roles the signed-in user may assign — shared with Settings (no copy). */
  assignableRoles: readonly Role[];
  /** Shown when some roles are withheld (e.g. Partner for a Compliance Officer). */
  roleNote?: string;
}

function signInEmailFor(name: string): string {
  const id = name
    .toLowerCase()
    .replace(/[^a-z0-9]/g, '-')
    .slice(0, 16);
  return `${id}@fdoncall.co.za`;
}

/** Invite action for the Team register — dispatches the existing INVITE_TEAM_MEMBER flow. */
export function InviteMemberDialog({
  open,
  onOpenChange,
  onInvite,
  assignableRoles,
  roleNote,
}: InviteMemberDialogProps) {
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState<Role>('Team member');
  const [kind, setKind] = React.useState<'employee' | 'subcontractor'>('employee');

  // A role the signed-in user may not assign never stays selected (or ships).
  React.useEffect(() => {
    if (assignableRoles.includes(role)) return;
    setRole(assignableRoles[0] ?? 'Team member');
  }, [assignableRoles, role]);

  const reset = () => {
    setName('');
    setRole('Team member');
    setKind('employee');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    if (!assignableRoles.includes(role)) return;
    onInvite({
      name: name.trim(),
      email: signInEmailFor(name.trim()),
      role,
      kind,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/45 backdrop-blur-[1px]" />
        <DialogPrimitive.Content className="fixed left-1/2 top-1/2 z-50 w-[min(92vw,26rem)] -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-5 shadow-xl outline-none">
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <DialogPrimitive.Title className="font-serif text-lg leading-tight text-foreground">
                Invite team member
              </DialogPrimitive.Title>
              <DialogPrimitive.Description className="mt-1 text-xs text-muted-foreground">
                Adds a staff record to the practice register with sign-in access.
              </DialogPrimitive.Description>
            </div>
            <DialogPrimitive.Close asChild>
              <button
                type="button"
                aria-label="Close invite dialog"
                className="rounded p-1 text-muted-foreground outline-none hover:bg-muted hover:text-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            </DialogPrimitive.Close>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3.5 text-xs">
            <label className="block space-y-1">
              <span className="font-medium text-foreground">Full name</span>
              <input
                autoFocus
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Thandi Mokoena"
                className="w-full rounded-md border border-border bg-background px-2.5 py-1.5 text-xs text-foreground outline-none placeholder:text-muted-foreground focus-visible:ring-1 focus-visible:ring-[#c4161c]"
              />
            </label>

            <div className="grid grid-cols-2 gap-3">
              <label className="block space-y-1">
                <span className="font-medium text-foreground">Role</span>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as Role)}
                  className="h-[30px] w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                >
                  {assignableRoles.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                {roleNote && (
                  <p className="text-[11px] leading-relaxed text-muted-foreground">{roleNote}</p>
                )}
              </label>

              <label className="block space-y-1">
                <span className="font-medium text-foreground">Employment kind</span>
                <select
                  value={kind}
                  onChange={(e) => setKind(e.target.value as 'employee' | 'subcontractor')}
                  className="h-[30px] w-full rounded-md border border-border bg-background px-2 text-xs text-foreground outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                >
                  <option value="employee">Employee</option>
                  <option value="subcontractor">Subcontractor</option>
                </select>
              </label>
            </div>

            {name.trim() && (
              <p className="rounded-md border border-border bg-muted/40 px-2.5 py-2 font-mono text-[11px] text-muted-foreground">
                Sign-in account · {signInEmailFor(name.trim())}
              </p>
            )}

            <div className="flex items-center justify-end gap-2 pt-1">
              <DialogPrimitive.Close asChild>
                <Button type="button" variant="ghost" size="sm" className={cn('text-muted-foreground')}>
                  Cancel
                </Button>
              </DialogPrimitive.Close>
              <Button
                type="submit"
                size="sm"
                disabled={!name.trim() || !assignableRoles.includes(role)}
              >
                <UserPlus className="h-3.5 w-3.5" />
                Send invite
              </Button>
            </div>
          </form>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  );
}
