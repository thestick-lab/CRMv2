import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { PracticeStoreProvider, usePracticeStore } from '@/context/PracticeStoreContext';
import { Layout } from '@/components/layout/Layout';
import { DashboardView } from '@/components/views/DashboardView';
import { InboxView } from '@/components/views/InboxView';
import { ClientsView } from '@/components/views/ClientsView';
import { DeadlinesView } from '@/components/views/DeadlinesView';
import { PeopleView } from '@/components/views/PeopleView';
import { EstimatorView } from '@/components/views/EstimatorView';
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
      case 'inbox':
        return <InboxView onNavigate={handleNavigate} />;
      case 'clients':
        return <ClientsView onNavigate={handleNavigate} />;
      case 'people':
        return <PeopleView onNavigate={handleNavigate} />;
      case 'deadlines':
        return <DeadlinesView onNavigate={handleNavigate} />;
      case 'estimator':
      case 'quote':
      case 'pipeline':
        return <EstimatorView onNavigate={handleNavigate} />;
      case 'settings':
        return <SettingsView />;
      case 'client':
        return (
          <ClientShowView
            clientCode={clientCode ?? 'MUS-875'}
            onBack={() => handleNavigate('clients')}
            onNavigate={handleNavigate}
          />
        );
      default:
        return <DashboardView onNavigate={handleNavigate} />;
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
