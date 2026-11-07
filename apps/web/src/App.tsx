import { useState } from 'react';
import type { ViewKey } from '@/types/navigation';
import { Layout } from '@/components/layout/Layout';
import { DashboardView } from '@/components/views/DashboardView';
import { ClientsView } from '@/components/views/ClientsView';
import { DeadlinesView } from '@/components/views/DeadlinesView';
import { CLIENTS } from 'fdoncall-practice/data/seed';

export default function App() {
  const [view, setView] = useState<ViewKey>('dashboard');
  const [clientCode, setClientCode] = useState<string | undefined>(undefined);

  const activeClient = clientCode ? CLIENTS.find((c) => c.code === clientCode) : undefined;

  const handleNavigate = (newView: ViewKey, newCode?: string) => {
    setView(newView);
    if (newCode !== undefined) {
      setClientCode(newCode);
    }
  };

  const renderContent = () => {
    switch (view) {
      case 'dashboard':
        return <DashboardView onNavigate={handleNavigate} />;
      case 'clients':
        return <ClientsView onNavigate={handleNavigate} />;
      case 'deadlines':
        return <DeadlinesView onNavigate={handleNavigate} />;
      case 'client':
        return (
          <div className="p-6 max-w-7xl mx-auto space-y-4">
            <div className="border border-border/80 rounded-lg p-6 bg-card/60">
              <h1 className="text-xl font-semibold text-foreground flex items-center gap-2">
                <span>{activeClient?.name ?? 'Client Record'}</span>
                <span className="font-mono text-sm text-[#c4161c] bg-[#c4161c]/10 px-2 py-0.5 rounded">
                  {clientCode}
                </span>
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Client record view ({activeClient?.entityType ?? 'Entity'}, Year End Month {activeClient?.yearEndMonth ?? 2}).
                The 4-tab record show will be fully implemented in Phase 4.
              </p>
            </div>
          </div>
        );
      default:
        return (
          <div className="p-6 max-w-7xl mx-auto">
            <div className="border border-border/80 rounded-lg p-6 bg-card/60">
              <h1 className="text-lg font-semibold text-foreground capitalize">
                {view.replace('-', ' ')}
              </h1>
              <p className="text-xs text-muted-foreground mt-1">
                Module scheduled for development in subsequent sprint phases.
              </p>
            </div>
          </div>
        );
    }
  };

  return (
    <Layout
      currentView={view}
      clientCode={clientCode}
      clientName={activeClient?.name}
      onViewChange={handleNavigate}
    >
      {renderContent()}
    </Layout>
  );
}
