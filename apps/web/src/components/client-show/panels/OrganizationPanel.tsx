import * as React from 'react';
import type { ClientContact } from 'fdoncall-practice/domain/types';
import { Building2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { CardHeaderWithLink } from '@/components/ui/list-primitives';
import { personInitials } from '@/lib/initials';

export interface OrganizationPanelProps {
  entityType: string;
  groupName?: string;
  groupMembers: Array<{ code: string; name: string }>;
  employeeCount?: number;
  contacts: ClientContact[];
  onContactsChange: (contacts: ClientContact[]) => void;
  /** Organization tab shows the full group list and always-visible contact editor. */
  expanded?: boolean;
  /** `Clients — create/edit` not granted: no add or remove affordance. */
  readOnly?: boolean;
}

export function OrganizationPanel({
  entityType,
  groupName,
  groupMembers,
  employeeCount,
  contacts,
  onContactsChange,
  expanded = false,
  readOnly = false,
}: OrganizationPanelProps) {
  const [adding, setAdding] = React.useState(false);
  const [name, setName] = React.useState('');
  const [role, setRole] = React.useState('Director');

  const addContact = () => {
    if (readOnly) return;
    const trimmedName = name.trim();
    if (!trimmedName) return;
    const contact: ClientContact = {
      id: `contact-${Date.now().toString(36)}`,
      name: trimmedName,
      role: role.trim() || 'Contact',
    };
    onContactsChange([...contacts, contact]);
    setName('');
    setRole('Director');
    setAdding(false);
  };

  const removeContact = (id: string) => {
    onContactsChange(contacts.filter((contact) => contact.id !== id));
  };

  const visibleContacts = expanded ? contacts : contacts.slice(0, 2);

  return (
    <section className="overflow-hidden rounded-xl border border-border bg-card">
      <CardHeaderWithLink title="Organization" />

      <div className="space-y-3 px-4 py-3 text-xs">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Entity type</span>
          <span className="text-foreground">{entityType}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Group</span>
          <span className="text-foreground">{groupName || '—'}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted-foreground">Employees</span>
          <span className="font-mono text-foreground">
            {employeeCount !== undefined ? employeeCount : '—'}
          </span>
        </div>

        {expanded && groupMembers.length > 0 && (
          <div className="space-y-1.5 border-t border-border/60 pt-2.5">
            <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
              Group companies
            </p>
            <ul className="space-y-1">
              {groupMembers.map((member) => (
                <li key={member.code} className="flex items-center gap-2 text-xs">
                  <Building2 className="h-3 w-3 shrink-0 text-muted-foreground" />
                  <span className="truncate text-foreground">{member.name}</span>
                  <span className="ml-auto shrink-0 font-mono text-[11px] text-muted-foreground">
                    {member.code}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-border/60 px-4 py-3">
        <div className="mb-2 flex items-center justify-between gap-2">
          <p className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Directors &amp; contacts
          </p>
          {!adding && !readOnly && (
            <button
              type="button"
              onClick={() => setAdding(true)}
              className="inline-flex items-center gap-1 rounded-sm text-[11px] font-medium text-[#c4161c] outline-none transition-colors hover:text-[#a01217] focus-visible:ring-1 focus-visible:ring-[#c4161c] dark:text-[#f87171]"
            >
              <Plus className="h-3 w-3" /> Add contact
            </button>
          )}
        </div>

        {contacts.length === 0 && !adding && (
          <p className="py-1 text-xs text-muted-foreground">— No contact recorded yet.</p>
        )}

        <ul className="space-y-2">
          {visibleContacts.map((contact) => (
            <li key={contact.id} className="flex items-start gap-2">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-muted font-mono text-[11px] text-muted-foreground">
                {personInitials(contact.name)}
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-foreground">{contact.name}</p>
                <p className="truncate text-[11px] text-muted-foreground">
                  {contact.role}
                  {contact.email ? ` · ${contact.email}` : ' · —'}
                </p>
                {expanded && contact.phone && (
                  <p className="truncate font-mono text-[11px] text-muted-foreground">{contact.phone}</p>
                )}
              </div>
              {expanded && !readOnly && (
                <button
                  type="button"
                  onClick={() => removeContact(contact.id)}
                  aria-label={`Remove ${contact.name}`}
                  className="shrink-0 rounded p-0.5 text-muted-foreground outline-none transition-colors hover:text-[#c4161c] focus-visible:ring-1 focus-visible:ring-[#c4161c]"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              )}
            </li>
          ))}
        </ul>

        {!expanded && contacts.length > 2 && (
          <p className="pt-1 font-mono text-[11px] text-muted-foreground">
            +{contacts.length - 2} more on the Organization tab
          </p>
        )}

        {adding && (
          <div className="mt-2 space-y-1.5 rounded-lg border border-border bg-muted/20 p-2">
            <label className="block">
              <span className="sr-only">Contact name</span>
              <input
                autoFocus
                value={name}
                onChange={(e) => setName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addContact()}
                placeholder="Full name"
                className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
              />
            </label>
            <label className="block">
              <span className="sr-only">Contact role</span>
              <input
                value={role}
                onChange={(e) => setRole(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addContact()}
                placeholder="Role"
                className="h-7 w-full rounded-md border border-border bg-background px-2 text-xs text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
              />
            </label>
            <div className="flex items-center gap-1.5">
              <Button size="sm" className="h-7 px-2 text-[11px]" onClick={addContact}>
                Save contact
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-[11px]"
                onClick={() => {
                  setAdding(false);
                  setName('');
                }}
              >
                Cancel
              </Button>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
