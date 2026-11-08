import * as React from 'react';
import * as DialogPrimitive from '@radix-ui/react-dialog';
import {
  Search,
  Mail,
  Phone,
  Building2,
  UserPlus,
  X,
  ExternalLink,
} from 'lucide-react';
import {
  buildPeopleProfiles,
  filterPeople,
  canManagePeople,
  type Person,
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
  const { staff, clients, currentUser } = usePracticeStore();
  const [query, setQuery] = React.useState('');
  const [modalOpen, setModalOpen] = React.useState(false);

  // Form state for adding contact
  const [newName, setNewName] = React.useState('');
  const [newEmail, setNewEmail] = React.useState('');
  const [newPhone, setNewPhone] = React.useState('+27 ');
  const [newTitle, setNewTitle] = React.useState('Director');
  const [newClientCode, setNewClientCode] = React.useState(clients[0]?.code || 'ALC-610');

  // Client directors only for this directory
  const directorsOnly = React.useMemo(() => {
    const all = buildPeopleProfiles(staff, clients);
    return all.filter((p) => !p.isPracticeStaff);
  }, [staff, clients]);

  const [customDirectors, setCustomDirectors] = React.useState<Person[]>([]);

  const combinedDirectors = React.useMemo(
    () => [...directorsOnly, ...customDirectors],
    [directorsOnly, customDirectors]
  );

  const filteredPeople = React.useMemo(() => {
    return filterPeople(combinedDirectors, 'all', query);
  }, [combinedDirectors, query]);

  const canEdit = canManagePeople(currentUser.role);

  const handleAddContact = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) return;

    const selectedClient = clients.find((c) => c.code === newClientCode);
    const newPerson: Person = {
      id: `dir-custom-${Date.now()}`,
      name: newName.trim(),
      email: newEmail.trim() || 'contact@client.co.za',
      phone: newPhone.trim() || '+27 21 000 0000',
      isPracticeStaff: false,
      companyLinks: [
        {
          clientCode: newClientCode,
          clientName: selectedClient?.name || newClientCode,
          title: newTitle,
        },
      ],
    };

    setCustomDirectors((prev) => [newPerson, ...prev]);
    setNewName('');
    setNewEmail('');
    setNewPhone('+27 ');
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
            placeholder="Search directors, emails, companies..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg border border-border bg-background text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-primary"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-muted-foreground hover:text-foreground"
            >
              ×
            </button>
          )}
        </div>

        {canEdit && (
          <Button
            size="sm"
            onClick={() => setModalOpen(true)}
            className="bg-[#c4161c] hover:bg-[#a51217] text-white flex items-center gap-1.5 shrink-0"
          >
            <UserPlus className="h-3.5 w-3.5" />
            <span>Add Contact</span>
          </Button>
        )}
      </div>

      {/* TanStack Responsive Table */}
      <div className="rounded-xl border border-border bg-card overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs min-w-[700px]">
            <thead className="bg-muted/40 border-b border-border/80 text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-4 py-3">Director / Contact Name</th>
                <th className="px-4 py-3">Designation / Role</th>
                <th className="px-4 py-3">Email Address</th>
                <th className="px-4 py-3">Phone Number</th>
                <th className="px-4 py-3">Linked Client Company</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60">
              {filteredPeople.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-muted-foreground italic">
                    No contacts found matching "{query}"
                  </td>
                </tr>
              ) : (
                filteredPeople.map((person) => {
                  const primaryLink = person.companyLinks[0];
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
                          {primaryLink?.title || 'Director'}
                        </Badge>
                      </td>

                      <td className="px-4 py-3 font-mono text-muted-foreground">
                        <a
                          href={`mailto:${person.email}`}
                          className="hover:text-primary hover:underline flex items-center gap-1.5"
                        >
                          <Mail className="h-3 w-3 shrink-0" />
                          <span className="truncate max-w-[160px]">{person.email}</span>
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
                        {primaryLink ? (
                          <button
                            type="button"
                            onClick={() => onNavigateClient?.(primaryLink.clientCode)}
                            className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded bg-muted/60 hover:bg-muted border border-border/60 text-xs transition-colors group cursor-pointer"
                            title={`Open ${primaryLink.clientName}`}
                          >
                            <span className="font-mono font-semibold text-primary">
                              {primaryLink.clientCode}
                            </span>
                            <span className="text-muted-foreground group-hover:text-foreground truncate max-w-[140px]">
                              {primaryLink.clientName}
                            </span>
                          </button>
                        ) : (
                          <span className="text-muted-foreground italic">None</span>
                        )}
                      </td>

                      <td className="px-4 py-3 text-right">
                        {primaryLink && (
                          <button
                            type="button"
                            onClick={() => onNavigateClient?.(primaryLink.clientCode)}
                            className="text-muted-foreground hover:text-primary transition-colors p-1"
                            title="Open client record"
                          >
                            <ExternalLink className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Contact Modal */}
      <DialogPrimitive.Root open={modalOpen} onOpenChange={setModalOpen}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs animate-in fade-in-0" />
          <DialogPrimitive.Content className="fixed left-[50%] top-[50%] z-50 w-full max-w-md -translate-x-1/2 -translate-y-1/2 rounded-xl border border-border bg-card p-6 shadow-2xl animate-in fade-in-0 zoom-in-95 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-border">
              <DialogPrimitive.Title className="text-base font-semibold text-foreground flex items-center gap-2">
                <Building2 className="h-4 w-4 text-primary" />
                Add Client Director / Contact
              </DialogPrimitive.Title>
              <DialogPrimitive.Close asChild>
                <button className="rounded-md p-1 text-muted-foreground hover:bg-muted hover:text-foreground">
                  <X className="h-4 w-4" />
                </button>
              </DialogPrimitive.Close>
            </div>

            <form onSubmit={handleAddContact} className="space-y-4 text-xs">
              <div>
                <label className="font-medium text-foreground block mb-1">Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Johannes van der Merwe"
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="font-medium text-foreground block mb-1">Designation / Role</label>
                  <input
                    type="text"
                    value={newTitle}
                    onChange={(e) => setNewTitle(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                  />
                </div>

                <div>
                  <label className="font-medium text-foreground block mb-1">Linked Company</label>
                  <select
                    value={newClientCode}
                    onChange={(e) => setNewClientCode(e.target.value)}
                    className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                  >
                    {clients.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.code} - {c.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Email Address</label>
                <input
                  type="email"
                  placeholder="johannes@client.co.za"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Direct Phone</label>
                <input
                  type="text"
                  placeholder="+27 82 000 0000"
                  value={newPhone}
                  onChange={(e) => setNewPhone(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                />
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
                  Save Director
                </Button>
              </div>
            </form>
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>
    </div>
  );
}
