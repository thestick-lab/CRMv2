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
import {
  can,
  type PermissionGroupInput,
  type PermissionState,
  type Role,
} from '@/lib/permissions';

export interface NavPermission {
  group: PermissionGroupInput;
  action: string;
}

export interface NavItemDef {
  id: ViewKey;
  label: string;
  section: NavSection;
  icon: ComponentType<{ className?: string }>;
  badge?: number | string;
  /** Practice permission the destination enforces; absent means always visible. */
  permission: NavPermission;
}

export const NAV_ITEMS: NavItemDef[] = [
  // Practice — the daily read of the practice
  {
    id: 'dashboard',
    label: 'Home',
    section: 'Practice',
    icon: Home,
    permission: { group: 'Clients', action: 'view' },
  },
  {
    id: 'analytics',
    label: 'Analytics',
    section: 'Practice',
    icon: BarChart3,
    permission: { group: 'Invoices', action: 'view' },
  },
  {
    id: 'inbox',
    label: 'Inbox',
    section: 'Practice',
    icon: Inbox,
    permission: { group: 'Deadlines', action: 'view' },
  },
  // Work — the registers, boards and time
  {
    id: 'clients',
    label: 'Clients',
    section: 'Work',
    icon: Building2,
    permission: { group: 'Clients', action: 'view' },
  },
  {
    id: 'team',
    label: 'Team',
    section: 'Work',
    icon: Users2,
    permission: { group: 'People', action: 'view-invite' },
  },
  {
    id: 'deadlines',
    label: 'Deadlines',
    section: 'Work',
    icon: CalendarDays,
    permission: { group: 'Deadlines', action: 'view' },
  },
  {
    id: 'sales-pipeline',
    label: 'Sales Pipeline',
    section: 'Work',
    icon: TrendingUp,
    permission: { group: 'Quotes', action: 'view-create-send' },
  },
  {
    id: 'time',
    label: 'Time',
    section: 'Work',
    icon: Clock,
    permission: { group: 'Time', action: 'log-own' },
  },
  // Admin — configuration and the governance trail
  {
    id: 'settings',
    label: 'Settings',
    section: 'Admin',
    icon: Settings,
    permission: { group: 'Settings', action: 'view' },
  },
  {
    id: 'govlog',
    label: 'Governance Log',
    section: 'Admin',
    icon: ScrollText,
    permission: { group: 'Governance log', action: 'view' },
  },
];

const VIEW_PERMISSIONS: Record<ViewKey, NavPermission> = NAV_ITEMS.reduce(
  (map, item) => {
    map[item.id] = item.permission;
    return map;
  },
  {} as Record<ViewKey, NavPermission>
);

// A client record is a client-register view.
VIEW_PERMISSIONS.client = { group: 'Clients', action: 'view' };

/** Whether `role` may open `view`; the views and the router both enforce this. */
export function canAccessView(
  view: ViewKey,
  role: Role,
  matrix: PermissionState['matrix'] = {}
): boolean {
  const permission = VIEW_PERMISSIONS[view];
  if (!permission) return false;
  return can(role, permission.group, permission.action, matrix);
}

/** The nav items a role may see, in declared order. */
export function visibleNavItems(
  role: Role,
  matrix: PermissionState['matrix'] = {}
): NavItemDef[] {
  return NAV_ITEMS.filter((item) => canAccessView(item.id, role, matrix));
}

/** Landing view for a role: the first place it is allowed to work. */
export function firstPermittedView(
  role: Role,
  matrix: PermissionState['matrix'] = {}
): ViewKey {
  return visibleNavItems(role, matrix)[0]?.id ?? 'settings';
}

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
