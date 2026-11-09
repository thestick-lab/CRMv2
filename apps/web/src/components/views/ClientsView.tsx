import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { enrichClientRows } from '@/components/clients/client-row-data';
import { ClientsRegisterTable } from '@/components/clients/ClientsRegisterTable';
import { PageHeader } from '@/components/ui/page-header';
import { can, scopeToAssigned } from '@/lib/permissions';

export interface ClientsViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function ClientsView({ onNavigate }: ClientsViewProps) {
  const { clients, currentUser, permissions } = usePracticeStore();
  const today = todayInSouthAfrica();

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
      />

      <ClientsRegisterTable
        data={rows}
        onRowClick={(code) => onNavigate('client', code)}
      />
    </div>
  );
}
