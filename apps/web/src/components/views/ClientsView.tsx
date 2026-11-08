import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { enrichClientRows } from '@/components/clients/client-row-data';
import { ClientsRegisterTable } from '@/components/clients/ClientsRegisterTable';
import { Building2 } from 'lucide-react';

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
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#c4161c]" />
              Clients
            </h1>
          </div>
        </div>
      </div>

      {/* TanStack Data Grid */}
      <ClientsRegisterTable
        data={rows}
        onRowClick={(code) => onNavigate('client', code)}
      />
    </div>
  );
}
