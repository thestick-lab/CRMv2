import type { ViewKey } from '@/types/navigation';
import {
  Building2,
  CalendarDays,
  Calculator,
  FolderGit2,
  Home,
  Inbox,
  Settings,
  Users2,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItemDef {
  id: ViewKey;
  label: string;
  section: 'top' | 'PRACTICE DATA' | 'STATUTORY OPS';
  icon: ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const NAV_ITEMS: NavItemDef[] = [
  { id: 'dashboard', label: 'Home', section: 'top', icon: Home },
  { id: 'inbox', label: 'Inbox', section: 'top', icon: Inbox },
  { id: 'settings', label: 'Settings', section: 'top', icon: Settings },
  { id: 'clients', label: 'Clients', section: 'PRACTICE DATA', icon: Building2, badge: 13 },
  { id: 'people', label: 'People & Directors', section: 'PRACTICE DATA', icon: Users2, badge: 18 },
  { id: 'deadlines', label: 'Deadlines', section: 'STATUTORY OPS', icon: CalendarDays, badge: 4 },
  { id: 'quote', label: 'New Quote Calculator', section: 'STATUTORY OPS', icon: Calculator },
  { id: 'pipeline', label: 'Onboarding Pipeline', section: 'STATUTORY OPS', icon: FolderGit2, badge: 5 },
];

export interface BreadcrumbCrumb {
  label: string;
  view?: ViewKey;
  clientCode?: string;
}

export function buildBreadcrumbs(view: ViewKey, clientCode?: string, clientName?: string): BreadcrumbCrumb[] {
  switch (view) {
    case 'dashboard':
      return [{ label: 'Home' }];
    case 'inbox':
      return [{ label: 'Home', view: 'dashboard' }, { label: 'Inbox (Review Queue)' }];
    case 'settings':
      return [{ label: 'Home', view: 'dashboard' }, { label: 'Settings' }];
    case 'clients':
      return [{ label: 'Practice Data' }, { label: 'Clients', view: 'clients' }];
    case 'client':
      return [
        { label: 'Practice Data' },
        { label: 'Clients', view: 'clients' },
        {
          label: clientName ? `${clientName} [${clientCode}]` : clientCode || 'Client Record',
          clientCode,
        },
      ];
    case 'people':
      return [{ label: 'Practice Data' }, { label: 'People & Directors' }];
    case 'deadlines':
      return [{ label: 'Statutory Ops' }, { label: 'Deadlines & Tasks', view: 'deadlines' }];
    case 'quote':
      return [{ label: 'Statutory Ops' }, { label: 'New Quote Calculator' }];
    case 'pipeline':
      return [{ label: 'Statutory Ops' }, { label: 'Onboarding Pipeline' }];
    default:
      return [{ label: 'Home' }];
  }
}
