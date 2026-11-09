import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { Sidebar } from './Sidebar';
import { Topbar } from './Topbar';
import { buildBreadcrumbs, NAV_ITEMS } from './navigation-helpers';
import { CommandDialog, type CommandItem } from '@/components/ui/command-dialog';
import { AiPracticeAssistantDrawer } from '@/components/ai/AiPracticeAssistantDrawer';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { useTheme } from '@/context/ThemeContext';

export interface LayoutProps {
  currentView: ViewKey;
  clientCode?: string;
  clientName?: string;
  onViewChange: (view: ViewKey, clientCode?: string) => void;
  children: React.ReactNode;
}

export function Layout({
  currentView,
  clientCode,
  clientName,
  onViewChange,
  children,
}: LayoutProps) {
  const [collapsed, setCollapsed] = React.useState(false);
  const [searchOpen, setSearchOpen] = React.useState(false);
  const [aiDrawerOpen, setAiDrawerOpen] = React.useState(false);
  const { isDark, toggle: toggleTheme } = useTheme();

  const { clients, quotes, timeEntries } = usePracticeStore();
  // Keyboard shortcut for Cmd+K / Ctrl+K
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Build command search items from navigation views, clients, quotes and time entries
  const commandItems = React.useMemo<CommandItem[]>(() => {
    const viewItems: CommandItem[] = NAV_ITEMS.map((item) => ({
      id: item.id,
      label: item.label,
      section: item.section,
      icon: item.icon,
    }));

    const clientItems: CommandItem[] = clients.map((c) => ({
      id: `client-${c.code}`,
      label: c.name,
      section: 'Clients',
      clientCode: c.code,
    }));

    const clientName = (code?: string) =>
      code ? clients.find((client) => client.code === code)?.name : undefined;

    const quoteItems: CommandItem[] = quotes.map((quote) => ({
      id: `quote-${quote.id}`,
      label: `${quote.number} · ${clientName(quote.clientCode) ?? quote.prospect?.name ?? 'Unnamed prospect'}`,
      section: 'Quotes',
      view: 'sales-pipeline',
      badge: quote.stage,
    }));

    const timeItems: CommandItem[] = timeEntries.map((entry) => ({
      id: `time-${entry.id}`,
      label: `${clientName(entry.clientCode) ?? entry.clientCode} · ${entry.description}`,
      section: 'Time entries',
      view: 'time',
    }));

    return [...viewItems, ...clientItems, ...quoteItems, ...timeItems];
  }, [clients, quotes, timeEntries]);

  const handleSelectCommand = (item: CommandItem) => {
    if (item.view) {
      onViewChange(item.view);
    } else if (item.clientCode) {
      onViewChange('client', item.clientCode);
    } else {
      onViewChange(item.id as ViewKey);
    }
  };

  const breadcrumbs = React.useMemo(
    () => buildBreadcrumbs(currentView, clientCode, clientName),
    [currentView, clientCode, clientName]
  );

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-background text-foreground antialiased font-sans">
      <Sidebar
        currentView={currentView}
        onViewChange={(view) => onViewChange(view)}
        collapsed={collapsed}
        onToggleCollapse={() => setCollapsed(!collapsed)}
      />

      <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
        <Topbar
          breadcrumbs={breadcrumbs}
          onNavigate={(view, code) => onViewChange(view, code)}
          onOpenSearch={() => setSearchOpen(true)}
          isDark={isDark}
          onToggleTheme={toggleTheme}
          onOpenAiAssistant={() => setAiDrawerOpen(true)}
        />
        <main className="flex-1 overflow-y-auto">
          {children}
        </main>
      </div>

      <CommandDialog
        open={searchOpen}
        onOpenChange={setSearchOpen}
        items={commandItems}
        onSelect={handleSelectCommand}
      />

      <AiPracticeAssistantDrawer
        open={aiDrawerOpen}
        onOpenChange={setAiDrawerOpen}
        onOpenSettings={() => onViewChange('settings')}
      />
    </div>
  );
}
