import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ViewKey } from '@/types/navigation';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { CLIENT_SHOW_TABS, ClientSummaryBar } from './ClientSummaryBar';
import { StatutoryProfileTab } from './tabs/StatutoryProfileTab';
import { DeadlinesTab } from './tabs/DeadlinesTab';
import { EstimateTab, buildEstimateForClient } from './tabs/EstimateTab';
import { VaultTab } from './tabs/VaultTab';
import { downloadExcelQuote, downloadPdfQuote } from '@/lib/export-actions';
import { cn } from '@/lib/utils';

export interface ClientShowViewProps {
  clientCode: string;
  onBack: () => void;
  onNavigate?: (view: ViewKey, clientCode?: string) => void;
  initialTab?: 'details' | 'vault' | 'profile' | 'deadlines' | 'estimate';
  childrenTabs?: {
    details?: React.ReactNode;
    vault?: React.ReactNode;
    profile?: React.ReactNode;
    deadlines?: React.ReactNode;
    estimate?: React.ReactNode;
  };
}

export function ClientShowView({
  clientCode,
  onBack,
  initialTab = 'details',
  onNavigate,
  childrenTabs,
}: ClientShowViewProps) {
  const [activeTab, setActiveTab] = React.useState<string>(initialTab);

  const { clients, rates } = usePracticeStore();
  const client = clients.find((c) => c.code === clientCode);
  const estimate = React.useMemo(
    () => (client ? buildEstimateForClient(client, undefined, rates.standardHourlyRate, rates.marchEscalationPct) : undefined),
    [client, rates]
  );

  const handlePdf = () => {
    if (client && estimate) {
      downloadPdfQuote(client, estimate, todayInSouthAfrica());
    }
  };

  const handleExcel = () => {
    if (client && estimate) {
      downloadExcelQuote(client, estimate, todayInSouthAfrica());
    }
  };
  if (!client) {
    return (
      <div className="p-6 max-w-7xl mx-auto space-y-4">
        <div className="border border-border/80 rounded-lg p-6 bg-card/60 text-center">
          <h2 className="text-lg font-semibold text-foreground">Client Not Found</h2>
          <p className="text-xs text-muted-foreground mt-1">
            No practice record matches code "{clientCode}".
          </p>
          <button
            onClick={onBack}
            className="mt-4 px-3 py-1.5 text-xs rounded bg-[#c4161c] text-white hover:bg-[#a01217]"
          >
            Return to Clients Register
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Bar with Deadlines Deep Link */}
      <div className="flex items-center justify-between gap-4">
        <ClientSummaryBar
          client={client}
          onBack={onBack}
          onDownloadPdf={handlePdf}
          onDownloadExcel={handleExcel}
        />
      </div>

      <div className="flex items-center justify-end">
        <button
          type="button"
          onClick={() => onNavigate ? onNavigate('deadlines', client.code) : undefined}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-primary/30 bg-primary/5 hover:bg-primary/10 text-primary text-xs font-medium transition-colors cursor-pointer"
        >
          <span>View Client Deadlines ➔</span>
        </button>
      </div>
      <TabsPrimitive.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsPrimitive.List className="flex items-center gap-1 border-b border-border/80 overflow-x-auto pb-px">
          {CLIENT_SHOW_TABS.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <TabsPrimitive.Trigger
                key={tab.id}
                value={tab.id}
                className={cn(
                  'flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors whitespace-nowrap outline-none focus-visible:ring-1 focus-visible:ring-[#c4161c]',
                  isActive
                    ? 'border-[#c4161c] text-[#c4161c] dark:text-[#f87171] font-semibold'
                    : 'border-transparent text-muted-foreground hover:text-foreground hover:border-border'
                )}
              >
                <Icon className={cn('h-3.5 w-3.5', isActive ? 'text-[#c4161c] dark:text-[#f87171]' : 'text-muted-foreground')} />
                <span>{tab.label}</span>
              </TabsPrimitive.Trigger>
            );
          })}
        </TabsPrimitive.List>

        <TabsPrimitive.Content value="details" className="outline-none">
          {childrenTabs?.details ?? childrenTabs?.profile ?? <StatutoryProfileTab client={client} />}
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="profile" className="outline-none">
          {childrenTabs?.profile ?? <StatutoryProfileTab client={client} />}
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="vault" className="outline-none">
          {childrenTabs?.vault ?? <VaultTab client={client} />}
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  );
}
