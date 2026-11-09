import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { enrichClientRows } from '@/components/clients/client-row-data';
import { ClientsRegisterTable } from '@/components/clients/ClientsRegisterTable';
import { NewClientDialog } from '@/components/clients/NewClientDialog';
import { PageHeader } from '@/components/ui/page-header';
import { Button } from '@/components/ui/button';
import { can, scopeToAssigned } from '@/lib/permissions';
import {
  createClientRecord,
  type NewClientInput,
} from '@/context/PracticeStoreContext';
import { personInitials } from '@/lib/initials';
import { Plus } from 'lucide-react';

export interface ClientsViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
  /** `+ New → New client` opens the create dialog on arrival. */
  initialCreateOpen?: boolean;
  /** Clears the one-shot create intent once the dialog has opened. */
  onCreateIntentHandled?: () => void;
}

export function ClientsView({
  onNavigate,
  initialCreateOpen = false,
  onCreateIntentHandled,
}: ClientsViewProps) {
  const {
    clients,
    staff,
    currentUser,
    permissions,
    addClient,
    logActivity,
  } = usePracticeStore();
  const today = todayInSouthAfrica();
  const canCreate = can(currentUser.role, 'Clients', 'create-edit', permissions.matrix);
  const [createOpen, setCreateOpen] = React.useState(false);
  const [created, setCreated] = React.useState<string | null>(null);

  React.useEffect(() => {
    if (!initialCreateOpen) return;
    if (canCreate) setCreateOpen(true);
    onCreateIntentHandled?.();
  }, [initialCreateOpen, canCreate, onCreateIntentHandled]);

  const handleCreate = (input: NewClientInput) => {
    if (!canCreate) return;
    const client = createClientRecord(input, clients, today);
    addClient(client);
    logActivity({
      type: 'client',
      actorName: currentUser.name,
      actorInitials: personInitials(currentUser.name),
      tint: 'crimson',
      text: `Registered ${client.name}`,
      subline: `${client.code} · ${client.entityType}`,
    });
    setCreated(client.code);
  };

  // §6.9 `Clients — view`: a Limited (assigned) role sees only the records it
  // is responsible for; the register is filtered before it is enriched.
  const visibleClients = React.useMemo(() => {
    const matrix = permissions.matrix;
    if (can(currentUser.role, 'Clients', 'view', matrix)) return clients;
    return scopeToAssigned(clients, currentUser.id);
  }, [clients, currentUser.id, currentUser.role, permissions.matrix]);

  const rows = React.useMemo(() => {
    return enrichClientRows(visibleClients, today);
  }, [visibleClients, today]);

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <PageHeader
        title="Clients"
        subtitle={`${rows.length} statutory engagements · year ends, VAT categories, service scope and the next filing for every client.`}
        actions={
          canCreate ? (
            <Button
              size="sm"
              data-new-client-open
              onClick={() => setCreateOpen(true)}
              className="gap-1.5"
            >
              <Plus className="h-3.5 w-3.5" />
              New client
            </Button>
          ) : undefined
        }
      />

      {created && (
        <p
          data-new-client-created
          className="rounded-lg border border-border bg-muted/40 px-3 py-2 text-xs text-foreground"
        >
          <span className="font-mono text-[11px] text-[#c4161c] dark:text-[#f87171]">
            {created}
          </span>{' '}
          is registered — its statutory tasks are on the Deadlines board.
        </p>
      )}

      <ClientsRegisterTable
        data={rows}
        onRowClick={(code) => onNavigate('client', code)}
      />

      <NewClientDialog
        open={createOpen}
        onOpenChange={setCreateOpen}
        staff={staff}
        defaultStaffId={currentUser.id}
        onCreate={handleCreate}
      />
    </div>
  );
}
