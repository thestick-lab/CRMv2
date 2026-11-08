import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { PracticeStoreProvider, usePracticeStore } from '@/context/PracticeStoreContext';
import { Layout } from '@/components/layout/Layout';
import { DashboardView } from '@/components/views/DashboardView';
import { ClientsView } from '@/components/views/ClientsView';
import { DeadlinesView } from '@/components/views/DeadlinesView';
import { PeopleView } from '@/components/views/PeopleView';
import { PipelineView } from '@/components/views/PipelineView';
import { SettingsView } from '@/components/settings/SettingsView';
import { ClientShowView } from '@/components/client-show/ClientShowView';

function AppContent() {
  const [view, setView] = React.useState<ViewKey>('dashboard');
  const [clientCode, setClientCode] = React.useState<string | undefined>(undefined);
  const { clients } = usePracticeStore();

  const activeClient = clientCode ? clients.find((c) => c.code === clientCode) : undefined;

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
      case 'people':
        return <PeopleView onNavigate={handleNavigate} />;
      case 'deadlines':
        return <DeadlinesView onNavigate={handleNavigate} />;
      case 'pipeline':
        return <PipelineView onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsView />;
      case 'client':
        return (
          <ClientShowView
            clientCode={clientCode ?? 'MUS-875'}
            onBack={() => handleNavigate('clients')}
          />
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

export default function App() {
  return (
    <PracticeStoreProvider>
      <AppContent />
    </PracticeStoreProvider>
  );
}
