import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { enrichClientRows } from '@/components/clients/client-row-data';
import { ClientsRegisterTable } from '@/components/clients/ClientsRegisterTable';
import { PageHeader } from '@/components/ui/page-header';

export interface ClientsViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function ClientsView({ onNavigate }: ClientsViewProps) {
  const { clients } = usePracticeStore();
  const today = todayInSouthAfrica();

  const rows = React.useMemo(() => {
    return enrichClientRows(clients, today);
  }, [clients, today]);

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
