import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import { UserPlus, ShieldCheck, Mail, Briefcase, X, User } from 'lucide-react';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export const RBAC_ROLES = [
  'Partner',
  'Compliance Officer',
  'Accountant',
  'Team member',
  'Subcontractor',
] as const;

export function TeamRbacPane() {
  const { staff, updateStaffRole, inviteTeamMember } = usePracticeStore();
  const [modalOpen, setModalOpen] = React.useState(false);

  // Invite Form State
  const [name, setName] = React.useState('');
  const [email, setEmail] = React.useState('');
  const [role, setRole] = React.useState<typeof RBAC_ROLES[number]>('Accountant');
  const [kind, setKind] = React.useState<'employee' | 'subcontractor'>('employee');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    inviteTeamMember({
      name: name.trim(),
      email: email.trim() || `${name.toLowerCase().replace(/\s+/g, '')}@fdoncall.co.za`,
      role,
      kind,
    });

    setName('');
    setEmail('');
    setModalOpen(false);
  };

  return (
    <div className="space-y-6 max-w-4xl text-xs">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-base font-semibold text-foreground">Team &amp; Role-Based Access Control</h2>
          <p className="text-muted-foreground mt-0.5">
            Configure practice team permissions, CA(SA) partner sign-off rights, and staff designations.
          </p>
        </div>

        <Button
          size="sm"
          onClick={() => setModalOpen(true)}
          className="bg-[#c4161c] hover:bg-[#a51217] text-white flex items-center gap-1.5 shrink-0"
        >
          <UserPlus className="h-3.5 w-3.5" />
          <span>Invite Member</span>
        </Button>
      </div>

      {/* Team Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <table className="w-full text-left">
          <thead className="bg-muted/40 border-b border-border/80 text-[11px] font-mono uppercase tracking-wider text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Member Name</th>
              <th className="px-4 py-3">Email Address</th>
              <th className="px-4 py-3">Employment Kind</th>
              <th className="px-4 py-3">Assigned RBAC Role</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/60">
            {staff.map((member) => (
              <tr key={member.id} className="hover:bg-muted/20 transition-colors">
                <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-md bg-muted flex items-center justify-center font-mono font-semibold text-xs border border-border">
                    {member.name.slice(0, 2).toUpperCase()}
                  </div>
                  <span>{member.name}</span>
                </td>

                <td className="px-4 py-3 font-mono text-muted-foreground">
                  {member.id}@fdoncall.co.za
                </td>

                <td className="px-4 py-3">
                  <Badge variant="outline" className="text-[10px] font-mono capitalize">
                    {member.kind}
                  </Badge>
                </td>

                <td className="px-4 py-3">
                  <select
                    value={member.role}
                    onChange={(e) => updateStaffRole(member.id, e.target.value)}
                    className={cn(
                      'px-2 py-1 rounded border text-xs font-medium focus:outline-none focus:ring-1 focus:ring-primary',
                      member.role === 'Partner'
                        ? 'border-primary/40 bg-primary/5 text-primary font-semibold'
                        : 'border-border bg-background text-foreground'
                    )}
                  >
                    {RBAC_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Invite Modal */}
      <DialogPrimitive.Root open={modalOpen} onOpenChange={setModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Invite Practice Team Member
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={handleInvite} className="space-y-4">
              <div>
                <label className="font-medium text-foreground block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chrizelle Visser"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="chrizelle@fdoncall.co.za"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">RBAC Role</label>
                  <select
                    value={role}
                    onChange={(e) => setRole(e.target.value as typeof RBAC_ROLES[number])}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                  >
                    {RBAC_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Employment Kind</label>
                  <select
                    value={kind}
                    onChange={(e) => setKind(e.target.value as 'employee' | 'subcontractor')}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                  >
                    <option value="employee">Employee</option>
                    <option value="subcontractor">Subcontractor</option>
                  </select>
                </div>
              </div>

              <div className="pt-3 border-t border-border flex items-center justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#c4161c] hover:bg-[#a51217] text-white"
                >
                  Send Practice Invite
                </Button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
