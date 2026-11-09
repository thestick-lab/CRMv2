import * as React from 'react';
import type { NavigateOptions, ViewKey } from '@/types/navigation';
import { PracticeStoreProvider, usePracticeStore } from '@/context/PracticeStoreContext';
import { Layout } from '@/components/layout/Layout';
import { DashboardView } from '@/components/views/DashboardView';
import { InboxView } from '@/components/views/InboxView';
import { ClientsView } from '@/components/views/ClientsView';
import { DeadlinesView } from '@/components/views/DeadlinesView';
import { AnalyticsView } from '@/components/analytics/AnalyticsView';
import { TimeView } from '@/components/time/TimeView';
import { SalesPipelineView } from '@/components/pipeline/SalesPipelineView';
import { TeamView } from '@/components/team/TeamView';
import { GovernanceLogView } from '@/components/govlog/GovernanceLogView';
import { SettingsView } from '@/components/settings/SettingsView';
import { ClientShowView } from '@/components/client-show/ClientShowView';
import { LoginView } from '@/components/auth/LoginView';

function AppContent() {
  const [view, setView] = React.useState<ViewKey>('dashboard');
  const [clientCode, setClientCode] = React.useState<string | undefined>(undefined);
  const [deadlineStaffId, setDeadlineStaffId] = React.useState<string | undefined>(undefined);
  const [deadlineKpiFilter, setDeadlineKpiFilter] = React.useState<NavigateOptions['kpiFilter']>(undefined);
  const [settingsPane, setSettingsPane] = React.useState<NavigateOptions['settingsPane']>(undefined);
  const { clients, isAuthenticated } = usePracticeStore();

  if (!isAuthenticated) {
    return <LoginView />;
  }

  const activeClient = clientCode ? clients.find((c) => c.code === clientCode) : undefined;

  const handleNavigate = (newView: ViewKey, newCode?: string, options?: NavigateOptions) => {
    setView(newView);
    if (newCode !== undefined) {
      setClientCode(newCode);
    }
    if (newView === 'deadlines') {
      setDeadlineStaffId(options?.staffId);
      setDeadlineKpiFilter(options?.kpiFilter);
    }
    if (newView === 'settings') {
      setSettingsPane(options?.settingsPane);
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
      case 'team':
        return <TeamView />;
      case 'deadlines':
        return (
          <DeadlinesView
            onNavigate={handleNavigate}
            clientFilter={clientCode}
            staffFilter={deadlineStaffId}
            kpiFilter={deadlineKpiFilter}
            onClearClientFilter={() => setClientCode(undefined)}
          />
        );
      case 'analytics':
        return <AnalyticsView />;
      case 'sales-pipeline':
        return <SalesPipelineView />;
      case 'time':
        return <TimeView />;
      case 'govlog':
        return <GovernanceLogView />;
      case 'settings':
        return (
          <SettingsView key={settingsPane ?? 'profile'} initialPane={settingsPane} />
        );
      case 'client':
        if (!clientCode) {
          return (
            <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
              <div className="p-6 rounded-xl border border-border bg-card space-y-3">
                <h2 className="text-base font-semibold text-foreground">No Client Record Selected</h2>
                <p className="text-xs text-muted-foreground">
                  Please select an active company or individual from the practice register to inspect their statutory profile.
                </p>
                <button
                  type="button"
                  onClick={() => handleNavigate('clients')}
                  className="px-3 py-1.5 rounded-lg bg-[#c4161c] hover:bg-[#a51217] text-white text-xs font-medium cursor-pointer transition-colors"
                >
                  Return to Clients Register
                </button>
              </div>
            </div>
          );
        }
        return (
          <ClientShowView
            clientCode={clientCode}
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
