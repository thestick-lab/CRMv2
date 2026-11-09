import * as React from 'react';
import * as PopoverPrimitive from '@radix-ui/react-popover';
import type { NavigateOptions, ViewKey } from '@/types/navigation';
import type { Client } from 'fdoncall-practice/domain/types';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { STAFF, GROUPS } from 'fdoncall-practice/data/seed';
import { todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import {
  CalendarClock,
  Calculator,
  Clock,
  FilePlus2,
  FolderLock,
  History,
  LayoutGrid,
  Plus,
  StickyNote,
  Users,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ContactProfileLayout,
  type TabConfig,
} from './ContactProfileLayout';
import { ClientSummaryBar } from './ClientSummaryBar';
import { StatutoryProfileTab } from './tabs/StatutoryProfileTab';
import { EstimateTab, buildEstimateForClient } from './tabs/EstimateTab';
import { VaultTab } from './tabs/VaultTab';
import { DeadlinesTab } from './tabs/DeadlinesTab';
import { InternalNotesPanel } from './panels/InternalNotesPanel';
import { OrganizationPanel } from './panels/OrganizationPanel';
import { RelationshipHistoryPanel } from './panels/RelationshipHistoryPanel';
import { buildClientTimeline, clientTags } from './client-record-data';
import { downloadExcelQuote, downloadPdfQuote } from '@/lib/export-actions';
import { can, isAssignedTo } from '@/lib/permissions';
import { useTimer } from '@/components/time/timer-context';

export interface ClientSummary {
  name: string;
  code: string;
  entityType: string;
  partnerLabel: string;
  turnoverLabel: string;
  vatLabel: string;
  groupName?: string;
}

export function formatClientSummary(client: Client): ClientSummary {
  const staff = STAFF.find((s) => s.id === client.staffId);
  const partnerLabel = staff ? `${staff.name} (${staff.role})` : 'Practice Pool';

  let turnoverLabel = 'Turnover Pending';
  if (client.turnover) {
    const mil = client.turnover / 1_000_000;
    turnoverLabel = Number.isInteger(mil) ? `R${mil}M Turnover` : `R${mil.toFixed(1)}M Turnover`;
  }

  const vatLabel = client.vatCategory ? `VAT Cat ${client.vatCategory}` : 'Non-VAT';

  const group = GROUPS.find((g) => g.id === client.groupId);

  return {
    name: client.name,
    code: client.code,
    entityType: client.entityType,
    partnerLabel,
    turnoverLabel,
    vatLabel,
    groupName: group?.name,
  };
}

/**
 * Whether this role may start a timer against `client`.
 *
 * `Time — log own` is `Limited (assigned)` for a Subcontractor, so the row
 * alone is not enough: the record's own assignment scope supplies the answer.
 * `+ New → Log time` and the client record's `Add Action → Log Time` both use
 * this, so the menu can never offer a write the role does not hold.
 */
export function canLogTimeOnClient(
  role: Parameters<typeof can>[0],
  matrix: Parameters<typeof can>[3],
  userId: string,
  client: { staffId: string; subcontractorId?: string }
): boolean {
  return can(role, 'Time', 'log-own', matrix, {
    assigned: isAssignedTo(userId, client),
  });
}

export type ClientTabId =
  | 'overview'
  | 'organization'
  | 'history'
  | 'tasks'
  | 'estimate'
  | 'vault'
  | 'notes';

export const CLIENT_SHOW_TABS: Array<TabConfig & { id: ClientTabId }> = [
  { id: 'overview', label: 'Overview', icon: LayoutGrid },
  { id: 'organization', label: 'Organization', icon: Users },
  { id: 'history', label: 'History', icon: History },
  { id: 'tasks', label: 'Tasks', icon: CalendarClock },
  { id: 'estimate', label: 'Estimate', icon: Calculator },
  { id: 'vault', label: 'Vault', icon: FolderLock },
  { id: 'notes', label: 'Notes', icon: StickyNote },
];

/**
 * The record tabs a role may see. `Estimate` is the billing surface (fee
 * schedule + quote exports), so it follows `Clients — view billing`; the
 * statutory, deadlines, vault and notes tabs stay available.
 */
export function clientRecordTabs(
  canViewBilling: boolean
): Array<TabConfig & { id: ClientTabId }> {
  return CLIENT_SHOW_TABS.filter((tab) => tab.id !== 'estimate' || canViewBilling);
}

export interface ClientShowViewProps {
  clientCode: string;
  onBack: () => void;
  onNavigate?: (view: ViewKey, clientCode?: string, options?: NavigateOptions) => void;
  initialTab?: ClientTabId;
}

export function ClientShowView({
  clientCode,
  onBack,
  initialTab = 'overview',
  onNavigate,
}: ClientShowViewProps) {
  const [activeTab, setActiveTab] = React.useState<ClientTabId>(initialTab);

  const {
    clients,
    staff,
    rates,
    activity,
    taskStatusOverrides,
    quotes,
    invoices,
    updateClient,
    currentUser,
    permissions,
  } = usePracticeStore();
  const canViewBilling = can(
    currentUser.role,
    'Clients',
    'view-billing',
    permissions.matrix
  );
  // §6.9 `Clients — create/edit`: without it the record is read-only and no
  // panel may write through `updateClient`.
  const canEditClient = can(
    currentUser.role,
    'Clients',
    'create-edit',
    permissions.matrix
  );
  // A deep link into the billing tab falls back for roles that cannot read it.
  React.useEffect(() => {
    if (!canViewBilling && activeTab === 'estimate') setActiveTab('overview');
  }, [canViewBilling, activeTab]);
  const { startTimer } = useTimer();
  const client = clients.find((c) => c.code === clientCode);
  const estimate = React.useMemo(
    () =>
      client
        ? buildEstimateForClient(client, undefined, rates.standardHourlyRate, rates.marchEscalationPct)
        : undefined,
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
      <div className="mx-auto max-w-7xl space-y-4 p-6">
        <div className="rounded-xl border border-border bg-card p-6 text-center">
          <h2 className="text-lg font-semibold text-foreground">Client Not Found</h2>
          <p className="mt-1 text-xs text-muted-foreground">
            No practice record matches code "{clientCode}".
          </p>
          <Button onClick={onBack} className="mt-4">
            Return to Clients Register
          </Button>
        </div>
      </div>
    );
  }

  const summary = formatClientSummary(client);
  const canLogTime = canLogTimeOnClient(
    currentUser.role,
    permissions.matrix,
    currentUser.id,
    client
  );
  const tags = clientTags(client);
  const firstNoteLine = client.notes?.split('\n').find((line) => line.trim().length > 0)?.trim();
  const timeline = buildClientTimeline(client, activity, taskStatusOverrides, {
    clients,
    staff,
    quotes,
    invoices,
  });
  const groupMembers = client.groupId
    ? clients
        .filter((c) => c.groupId === client.groupId && c.code !== client.code)
        .map((c) => ({ code: c.code, name: c.name }))
    : [];

  return (
    <div className="mx-auto max-w-7xl space-y-5 p-6">
      <ClientSummaryBar
        onBack={onBack}
        onDownloadPdf={canViewBilling ? handlePdf : undefined}
        onDownloadExcel={canViewBilling ? handleExcel : undefined}
        onViewDeadlines={() => onNavigate?.('deadlines', client.code)}
      />

      <ContactProfileLayout
        identity={{
          name: client.name,
          code: client.code,
          subtitle: `${summary.entityType}${summary.groupName ? ` · ${summary.groupName}` : ' · Independent'}`,
          description: firstNoteLine ?? `Responsible partner · ${summary.partnerLabel}`,
          tags,
        }}
        meta={{
          email: client.email,
          phone: client.phone,
          location: client.location,
          timezone: client.timezone,
        }}
        actions={
          <AddActionMenu
            onLogTime={() => startTimer({ clientCode: client.code })}
            onNewQuote={() =>
              onNavigate?.('sales-pipeline', undefined, { quoteClientCode: client.code })
            }
            onAddNote={() => setActiveTab('notes')}
            canAddNote={canEditClient}
            canLogTime={canLogTime}
          />
        }
        tabs={clientRecordTabs(canViewBilling)}
        activeTab={activeTab}
        onTab={(id) => setActiveTab(id as ClientTabId)}
      >
        {activeTab === 'overview' && (
          <StatutoryProfileTab
            client={client}
            readOnly={!canEditClient}
            onOpenOrganization={() => setActiveTab('organization')}
            onOpenTasks={() => setActiveTab('tasks')}
          />
        )}

        {activeTab === 'organization' && (
          <div className="grid grid-cols-1 items-start gap-4 lg:grid-cols-2">
            <OrganizationPanel
              expanded
              readOnly={!canEditClient}
              entityType={client.entityType}
              groupName={summary.groupName}
              groupMembers={groupMembers}
              employeeCount={client.payroll ? client.employeeCount : undefined}
              contacts={client.contacts ?? []}
              onContactsChange={(contacts) => {
                if (canEditClient) updateClient(client.code, { contacts });
              }}
            />
            <RelationshipHistoryPanel entries={timeline} />
          </div>
        )}

        {activeTab === 'history' && <RelationshipHistoryPanel entries={timeline} />}

        {activeTab === 'tasks' && (
          <DeadlinesTab client={client} asOfDate={todayInSouthAfrica()} />
        )}

        {canViewBilling && activeTab === 'estimate' && (
          <EstimateTab
            client={client}
            onDownloadPdf={handlePdf}
            onDownloadExcel={handleExcel}
          />
        )}

        {activeTab === 'vault' && <VaultTab client={client} />}

        {activeTab === 'notes' && (
          <div className="max-w-2xl">
            <InternalNotesPanel
              notes={client.notes}
              defaultEditing={canEditClient}
              readOnly={!canEditClient}
              onSave={(notes) => {
                if (canEditClient) updateClient(client.code, { notes });
              }}
            />
          </div>
        )}
      </ContactProfileLayout>
    </div>
  );
}

function AddActionMenu({
  onLogTime,
  onNewQuote,
  onAddNote,
  canAddNote,
  canLogTime,
}: {
  onLogTime: () => void;
  onNewQuote: () => void;
  onAddNote: () => void;
  canAddNote: boolean;
  canLogTime: boolean;
}) {
  const [open, setOpen] = React.useState(false);

  const run = (action: () => void) => {
    setOpen(false);
    action();
  };

  const items = [
    {
      label: 'Log Time',
      icon: Clock,
      onSelect: onLogTime,
      permitted: canLogTime,
      reason: 'Your role can only log time against clients assigned to you',
    },
    {
      label: 'New Quote',
      icon: FilePlus2,
      onSelect: onNewQuote,
      permitted: true,
      reason: undefined,
    },
    {
      label: 'Add Note',
      icon: StickyNote,
      onSelect: onAddNote,
      permitted: canAddNote,
      reason: 'Your role cannot record client notes',
    },
  ];

  return (
    <PopoverPrimitive.Root open={open} onOpenChange={setOpen}>
      <PopoverPrimitive.Trigger asChild>
        <Button size="sm" className="h-8 gap-1.5 text-[11px]">
          <Plus className="h-3.5 w-3.5" />
          Add Action
        </Button>
      </PopoverPrimitive.Trigger>
      <PopoverPrimitive.Portal>
        <PopoverPrimitive.Content
          align="end"
          sideOffset={6}
          className="z-50 w-44 rounded-lg border border-border bg-popover p-1 shadow-lg outline-none"
        >
          {items.map((item) => {
            const Icon = item.icon;
            return (
              <button
                key={item.label}
                type="button"
                disabled={!item.permitted}
                title={item.permitted ? undefined : item.reason}
                onClick={() => run(item.onSelect)}
                className="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-xs text-foreground outline-none transition-colors hover:bg-muted focus-visible:bg-muted focus-visible:ring-1 focus-visible:ring-[#c4161c] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                {item.label}
              </button>
            );
          })}
        </PopoverPrimitive.Content>
      </PopoverPrimitive.Portal>
    </PopoverPrimitive.Root>
  );
}
