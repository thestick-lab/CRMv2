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
  type CanOptions,
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
  /** Practice permission the destination enforces. */
  permission: NavPermission;
  /**
   * The view scopes its own data to the person's assigned records, so a
   * `Limited (assigned)` cell still earns the nav item. Aggregate views leave
   * this false: a limited user never sees practice-wide numbers.
   */
  assignedAccess?: boolean;
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
    assignedAccess: true,
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
    assignedAccess: true,
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
    assignedAccess: true,
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

/** Views whose data is filtered to the person's assigned records. */
const ASSIGNED_VIEWS: readonly ViewKey[] = ['clients', 'client', 'deadlines', 'time'];

/**
 * Whether `role` may open `view`. Pass `{ assigned: true }` so a
 * `Limited (assigned)` cell earns the view — but only on views that scope
 * their own data; aggregate views still require the unconditional grant.
 */
export function canAccessView(
  view: ViewKey,
  role: Role,
  matrix: PermissionState['matrix'] = {},
  options: CanOptions = {}
): boolean {
  const permission = VIEW_PERMISSIONS[view];
  if (!permission) return false;
  if (options.assigned === true && !ASSIGNED_VIEWS.includes(view)) {
    return can(role, permission.group, permission.action, matrix);
  }
  return can(role, permission.group, permission.action, matrix, options);
}

/** The nav items a role may see, in declared order. */
export function visibleNavItems(
  role: Role,
  matrix: PermissionState['matrix'] = {}
): NavItemDef[] {
  return NAV_ITEMS.filter((item) =>
    canAccessView(item.id, role, matrix, { assigned: item.assignedAccess === true })
  );
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
