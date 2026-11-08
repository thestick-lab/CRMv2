import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Search,
  Mail,
  Phone,
  UserPlus,
  X,
} from 'lucide-react';
import {
  buildPeopleProfiles,
  filterPeople,
  canManagePeople,
} from './people-data';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

export interface PeopleDirectoryProps {
  onNavigateClient?: (code: string) => void;
  className?: string;
}

export function PeopleDirectory({ onNavigateClient, className }: PeopleDirectoryProps) {
  const { staff, clients, currentUser, inviteTeamMember } = usePracticeStore();
  const [query, setQuery] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);

  // Form state for inviting/adding employee
  const [newName, setNewName] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [newRole, setNewRole] = React.useState<'Partner' | 'Compliance Officer' | 'Accountant' | 'Team member' | 'Subcontractor'>('Team member');
  const [newKind, setNewKind] = React.useState<'employee' | 'subcontractor'>('employee');

  // FD on Call staff only for this directory
  const staffProfiles = React.useMemo(() => {
    const all = buildPeopleProfiles(staff, clients);
    return all.filter((p) => p.isPracticeStaff);
  }, [staff, clients]);

  const filteredPeople = React.useMemo(() => {
    return filterPeople(staffProfiles, 'all', query);
  }, [staffProfiles, query]);

  const canEdit = canManagePeople(currentUser.role);

  const handleAddMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    inviteTeamMember({
      name: newName.trim(),
      email: newEmail.trim() || `${newName.toLowerCase().replace(/\s+/g, '')}@fdoncall.co.za`,
      role: newRole,
      kind: newKind,
    });

    setNewName('');
    setNewEmail('');
    setModalOpen(false);
  };

  return (
    <div className={cn('space-y-4', className)}>
      {/* Search & Actions Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            placeholder="Search employees, roles, emails..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {canEdit && (
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="bg-[#c4161c] hover:bg-[#a51217] text-white flex items-center gap-1.5 shrink-0 cursor-pointer"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Employee</span>
          </Button>
        )}
      </div>

      {/* TanStack Responsive Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-muted/40 border-b border-border/80 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Employee / Staff Name</th>
                <th className="px-4 py-3">Role / Designation</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Phone Number</th>
                <th className="px-4 py-3">Assigned Clients</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPeople.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground italic">
                    No employees found matching "{query}"
                  </td>
                </tr>
              ) : (
                filteredPeople.map((person) => {
                  const initials = person.name
                    .split(/\s+/)
                    .map((n) => n[0])
                    .join('')
                    .slice(0, 2)
                    .toUpperCase();

                  return (
                    <tr key={person.id} className="hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-3 font-medium text-foreground flex items-center gap-2.5">
                        <div className="w-7 h-7 rounded-md bg-muted text-foreground border border-border font-mono font-semibold text-xs flex items-center justify-center shrink-0">
                          {initials}
                        </div>
                        <span className="font-semibold">{person.name}</span>
                      </td>

                      <td className="px-4 py-3 text-muted-foreground">
                        <Badge variant="outline" className="text-[10px] font-normal">
                          {person.practiceRole || 'Team member'}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        <a
                          href={`mailto:${person.email}`}
                          className="hover:text-primary hover:underline flex items-center gap-1.5"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[180px]">{person.email}</span>
                        </a>
                      </td>

                      <td className="px-4 py-3 font-mono font-tnum text-muted-foreground">
                        <a
                          href={`tel:${person.phone}`}
                          className="hover:text-foreground hover:underline flex items-center gap-1.5"
                        >
                          <Phone className="h-3 w-3 shrink-0" />
                          <span>{person.phone}</span>
                        </a>
                      </td>

                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1">
                          {person.companyLinks.length === 0 ? (
                            <span className="text-muted-foreground italic text-[11px]">Practice Pool</span>
                          ) : (
                            person.companyLinks.map((link) => (
                              <button
                                key={link.clientCode}
                                type="button"
                                onClick={() => onNavigateClient?.(link.clientCode)}
                                className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/60 hover:bg-muted border border-border/60 text-[11px] transition-colors group cursor-pointer"
                                title={`Open ${link.clientName}`}
                              >
                                <span className="font-mono font-semibold text-primary">
                                  {link.clientCode}
                                </span>
                              </button>
                            ))
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Employee Modal */}
      <DialogPrimitive.Root open={modalOpen} onOpenChange={setModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground flex items-center gap-2">
                <UserPlus className="h-4 w-4 text-primary" />
                Add Practice Employee
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground cursor-pointer">
                  <X className="h-4 w-4" />
                </button>
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={handleAddMember} className="space-y-4">
              <div>
                <label className="font-medium text-foreground block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Chrizelle Visser"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="chrizelle@fdoncall.co.za"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs font-mono"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Designation / Role</label>
                  <select
                    value={newRole}
                    onChange={(e) => setNewRole(e.target.value as typeof newRole)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                  >
                    <option value="Partner">Partner</option>
                    <option value="Compliance Officer">Compliance Officer</option>
                    <option value="Accountant">Accountant</option>
                    <option value="Team member">Team member</option>
                    <option value="Subcontractor">Subcontractor</option>
                  </select>
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Employment Kind</label>
                  <select
                    value={newKind}
                    onChange={(e) => setNewKind(e.target.value as typeof newKind)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
                  >
                    <option value="employee">Employee</option>
                    <option value="subcontractor">Subcontractor</option>
                  </select>
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setModalOpen(false)}
                  className="text-xs"
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  size="sm"
                  className="bg-[#c4161c] hover:bg-[#a51217] text-white text-xs"
                >
                  Save Employee
                </Button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
