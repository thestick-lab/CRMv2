import type { ViewKey } from '@/types/navigation';
import {
  BarChart3,
  Building2,
  CalendarDays,
  Clock,
  Home,
  Inbox,
  ScrollText,
  Settings,
  TrendingUp,
  Users2,
} from 'lucide-react';
import type { ComponentType } from 'react';
import type { NavSection } from '@/types/navigation';

export interface NavItemDef {
  id: ViewKey;
  label: string;
  section: NavSection;
  icon: ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const NAV_ITEMS: NavItemDef[] = [
  // Practice — the daily read of the practice
  { id: 'dashboard', label: 'Home', section: 'Practice', icon: Home },
  { id: 'analytics', label: 'Analytics', section: 'Practice', icon: BarChart3 },
  { id: 'inbox', label: 'Inbox', section: 'Practice', icon: Inbox },
  // Work — the registers, boards and time
  { id: 'clients', label: 'Clients', section: 'Work', icon: Building2 },
  { id: 'team', label: 'Team', section: 'Work', icon: Users2 },
  { id: 'deadlines', label: 'Deadlines', section: 'Work', icon: CalendarDays },
  { id: 'sales-pipeline', label: 'Sales Pipeline', section: 'Work', icon: TrendingUp },
  { id: 'time', label: 'Time', section: 'Work', icon: Clock },
  // Admin — configuration and the governance trail
  { id: 'settings', label: 'Settings', section: 'Admin', icon: Settings },
  { id: 'govlog', label: 'Governance Log', section: 'Admin', icon: ScrollText },
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
    case 'analytics':
      return [{ label: 'Practice' }, { label: 'Analytics', view: 'analytics' }];
    case 'inbox':
      return [{ label: 'Home', view: 'dashboard' }, { label: 'Inbox' }];
    case 'clients':
      return [{ label: 'Work' }, { label: 'Clients', view: 'clients' }];
    case 'client':
      return [
        { label: 'Work' },
        { label: 'Clients', view: 'clients' },
        {
          label: clientName ? `${clientName} [${clientCode}]` : clientCode || 'Client Record',
          clientCode,
        },
      ];
    case 'team':
      return [{ label: 'Work' }, { label: 'Team', view: 'team' }];
    case 'deadlines':
      return [{ label: 'Work' }, { label: 'Deadlines', view: 'deadlines' }];
    case 'sales-pipeline':
      return [{ label: 'Work' }, { label: 'Sales Pipeline', view: 'sales-pipeline' }];
    case 'time':
      return [{ label: 'Work' }, { label: 'Time', view: 'time' }];
    case 'settings':
      return [{ label: 'Admin' }, { label: 'Settings', view: 'settings' }];
    case 'govlog':
      return [{ label: 'Admin' }, { label: 'Governance Log', view: 'govlog' }];
    default:
      return [{ label: 'Home' }];
  }
}
