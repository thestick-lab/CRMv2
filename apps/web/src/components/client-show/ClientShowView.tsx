import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import { CLIENTS } from 'fdoncall-practice/data/seed';
import { CLIENT_SHOW_TABS, ClientSummaryBar } from './ClientSummaryBar';
import { cn } from '@/lib/utils';

export interface ClientShowViewProps {
  clientCode: string;
  onBack: () => void;
  initialTab?: 'profile' | 'deadlines' | 'estimate' | 'vault';
  childrenTabs?: {
    profile?: React.ReactNode;
    deadlines?: React.ReactNode;
    estimate?: React.ReactNode;
    vault?: React.ReactNode;
  };
}

export function ClientShowView({
  clientCode,
  onBack,
  initialTab = 'profile',
  childrenTabs,
}: ClientShowViewProps) {
  const [activeTab, setActiveTab] = React.useState<string>(initialTab);

  const client = CLIENTS.find((c) => c.code === clientCode);

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
      {/* Client Summary Header */}
      <ClientSummaryBar client={client} onBack={onBack} />

      {/* 4-Tab Navigation */}
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

        <TabsPrimitive.Content value="profile" className="outline-none">
          {childrenTabs?.profile ?? (
            <div className="border border-border/80 rounded-lg p-6 bg-card/60 text-xs text-muted-foreground">
              Statutory Profile loading...
            </div>
          )}
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="deadlines" className="outline-none">
          {childrenTabs?.deadlines ?? (
            <div className="border border-border/80 rounded-lg p-6 bg-card/60 text-xs text-muted-foreground">
              Deadlines &amp; Tasks loading...
            </div>
          )}
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="estimate" className="outline-none">
          {childrenTabs?.estimate ?? (
            <div className="border border-border/80 rounded-lg p-6 bg-card/60 text-xs text-muted-foreground">
              12-Month Fee Estimate loading...
            </div>
          )}
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="vault" className="outline-none">
          {childrenTabs?.vault ?? (
            <div className="border border-border/80 rounded-lg p-6 bg-card/60 text-xs text-muted-foreground">
              SharePoint Vault &amp; SLAs loading...
            </div>
          )}
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  );
}
