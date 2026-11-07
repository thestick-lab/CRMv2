import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { CLIENTS } from 'fdoncall-practice/data/seed';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { enrichClientRows } from '@/components/clients/client-row-data';
import { ClientsRegisterTable } from '@/components/clients/ClientsRegisterTable';
import { Badge } from '@/components/ui/badge';
import { Building2 } from 'lucide-react';

export interface ClientsViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function ClientsView({ onNavigate }: ClientsViewProps) {
  const today = todayInSouthAfrica();

  const rows = React.useMemo(() => {
    return enrichClientRows(CLIENTS, today);
  }, [today]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Building2 className="h-5 w-5 text-[#c4161c]" />
              Clients Directory Register
            </h1>
            <Badge variant="crimsonSubdued" className="font-mono text-xs py-0 px-1.5 h-5">
              {rows.length} Active Accounts
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Primary practice operational register for managing active companies, close corporations, trusts, and individuals.
          </p>
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
