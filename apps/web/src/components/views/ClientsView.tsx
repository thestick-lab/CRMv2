import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { CLIENTS, STAFF } from 'fdoncall-practice/data/seed';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Building2, ChevronRight, Search } from 'lucide-react';

export interface ClientsViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function ClientsView({ onNavigate }: ClientsViewProps) {
  const [search, setSearch] = React.useState('');

  const filteredClients = React.useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return CLIENTS;
    return CLIENTS.filter(
      (c) =>
        c.code.toLowerCase().includes(q) ||
        c.name.toLowerCase().includes(q) ||
        c.entityType.toLowerCase().includes(q)
    );
  }, [search]);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-4">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
            <Building2 className="h-5 w-5 text-[#c4161c]" />
            Clients Register
          </h1>
          <p className="text-xs text-muted-foreground mt-0.5">
            Active practice accounts, statutory entity classifications, and financial year-ends.
          </p>
        </div>

        {/* Filter Input */}
        <div className="relative w-full sm:w-72">
          <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Filter clients or code (ALC)..."
            className="w-full h-8 pl-8 pr-3 text-xs rounded-md border border-border bg-card text-foreground placeholder:text-muted-foreground focus:outline-none focus:ring-1 focus:ring-[#c4161c]"
          />
        </div>
      </div>

      {/* Clients Table */}
      <div className="border border-border/80 rounded-lg bg-card/60 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-xs text-left">
            <thead className="bg-muted/40 text-muted-foreground uppercase tracking-wider text-[10px] border-b border-border font-mono">
              <tr>
                <th className="py-2.5 px-4 font-medium">Code</th>
                <th className="py-2.5 px-4 font-medium">Client Name</th>
                <th className="py-2.5 px-4 font-medium">Entity Type</th>
                <th className="py-2.5 px-4 font-medium">Responsible Staff</th>
                <th className="py-2.5 px-4 font-medium">Year End</th>
                <th className="py-2.5 px-4 font-medium">VAT Category</th>
                <th className="py-2.5 px-4 font-medium text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/60 font-mono">
              {filteredClients.map((c) => {
                const manager = STAFF.find((s) => s.id === c.staffId);
                return (
                  <tr
                    key={c.code}
                    onClick={() => onNavigate('client', c.code)}
                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                  >
                    <td className="py-2.5 px-4 font-semibold text-[#c4161c]">{c.code}</td>
                    <td className="py-2.5 px-4 font-sans font-medium text-foreground">{c.name}</td>
                    <td className="py-2.5 px-4 font-sans text-muted-foreground">{c.entityType}</td>
                    <td className="py-2.5 px-4 font-sans text-foreground">
                      {manager?.name ?? 'Practice Pool'}
                    </td>
                    <td className="py-2.5 px-4 text-foreground">Month {c.yearEndMonth}</td>
                    <td className="py-2.5 px-4 font-sans">
                      {c.vatCategory ? (
                        <Badge variant="outline" className="font-mono text-[10px] py-0 px-1">
                          Category {c.vatCategory}
                        </Badge>
                      ) : (
                        <span className="text-muted-foreground text-[11px] italic">Non-VAT</span>
                      )}
                    </td>
                    <td className="py-2.5 px-4 text-right font-sans">
                      <Button variant="ghost" size="sm" className="h-6 text-[11px] gap-1 px-2">
                        View <ChevronRight className="h-3 w-3" />
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
