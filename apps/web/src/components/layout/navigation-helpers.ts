import type { ViewKey } from '@/types/navigation';
import {
  Building2,
  CalendarDays,
  Calculator,
  Users2,
} from 'lucide-react';
import type { ComponentType } from 'react';

export interface NavItemDef {
  id: ViewKey;
  label: string;
  section: 'PRACTICE REGISTERS' | 'OPERATIONS & GROWTH';
  icon: ComponentType<{ className?: string }>;
  badge?: number | string;
}

export const NAV_ITEMS: NavItemDef[] = [
  { id: 'clients', label: 'Clients', section: 'PRACTICE REGISTERS', icon: Building2 },
  { id: 'people', label: 'People', section: 'PRACTICE REGISTERS', icon: Users2 },
  { id: 'deadlines', label: 'Deadlines', section: 'OPERATIONS & GROWTH', icon: CalendarDays, badge: 4 },
  { id: 'estimator', label: 'Fee Estimator & Quotes', section: 'OPERATIONS & GROWTH', icon: Calculator },
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
      return [{ label: 'Practice Registers' }, { label: 'Clients', view: 'clients' }];
    case 'client':
      return [
        { label: 'Practice Registers' },
        { label: 'Clients', view: 'clients' },
        {
          label: clientName ? `${clientName} [${clientCode}]` : clientCode || 'Client Record',
          clientCode,
        },
      ];
    case 'people':
      return [{ label: 'Practice Registers' }, { label: 'People' }];
    case 'deadlines':
      return [{ label: 'Operations & Growth' }, { label: 'Deadlines', view: 'deadlines' }];
    case 'estimator':
    case 'quote':
    case 'pipeline':
      return [{ label: 'Operations & Growth' }, { label: 'Fee Estimator & Quotes' }];
    default:
      return [{ label: 'Home' }];
  }
}
