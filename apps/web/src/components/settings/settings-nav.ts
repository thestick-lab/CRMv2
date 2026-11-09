import {
  Bell,
  FileSpreadsheet,
  KeyRound,
  Palette,
  Plug,
  User,
  Users,
  type LucideIcon,
} from 'lucide-react';

/* ---------------------------------------------------------------------------
 * Settings navigation map. One declaration drives the left nav, the deep-link
 * resolution (App passes a `SettingsPaneKey`) and the pane switch, so a pane
 * can never be rendered without a way to reach it.
 * ------------------------------------------------------------------------- */

export type SettingsPaneKey =
  | 'profile'
  | 'appearance'
  | 'team'
  | 'roles'
  | 'matrix'
  | 'holidays'
  | 'documenso'
  | 'xero'
  | 'ai'
  | 'notifications';

export interface SettingsNavChild {
  pane: SettingsPaneKey;
  label: string;
  hint?: string;
}

export interface SettingsNavItem {
  label: string;
  icon: LucideIcon;
  /** Leaf panes link straight to their pane; group entries carry children. */
  pane?: SettingsPaneKey;
  children?: SettingsNavChild[];
  /** Practice administration: only partners and compliance officers. */
  adminOnly?: boolean;
  /** Matrix administration: only roles with `Settings — manage permissions`. */
  manageOnly?: boolean;
}

/**
 * The six settings groups, in order. `Practice Rules` and `Integrations` are
 * captions that own their child panes.
 */
export const SETTINGS_NAV: SettingsNavItem[] = [
  { label: 'Profile', icon: User, pane: 'profile' },
  { label: 'Appearance', icon: Palette, pane: 'appearance' },
  { label: 'Team & Staff', icon: Users, pane: 'team', adminOnly: true },
  {
    label: 'Roles & Permissions',
    icon: KeyRound,
    pane: 'roles',
    // Gated by the matrix's own `Settings — manage permissions` row, not by edit.
    manageOnly: true,
  },
  {
    label: 'Practice Rules',
    icon: FileSpreadsheet,
    adminOnly: true,
    children: [
      {
        pane: 'matrix',
        label: 'Service & Pricing Matrix',
        hint: 'Fees, hourly rate, escalation',
      },
      {
        pane: 'holidays',
        label: 'SA Public Holidays',
        hint: 'Gazette calendar, rate schedule',
      },
    ],
  },
  {
    label: 'Integrations',
    icon: Plug,
    adminOnly: true,
    children: [
      { pane: 'documenso', label: 'Documenso', hint: 'Quote e-signature' },
      { pane: 'xero', label: 'Xero', hint: 'Invoice drafts' },
      { pane: 'ai', label: 'AI Assistant', hint: 'Model provider keys' },
    ],
  },
  { label: 'Notifications', icon: Bell, pane: 'notifications' },
];

export function settingsPaneLabel(pane: SettingsPaneKey): string {
  const direct = SETTINGS_NAV.find((item) => item.pane === pane);
  if (direct) return direct.label;
  for (const item of SETTINGS_NAV) {
    const child = item.children?.find((entry) => entry.pane === pane);
    if (child) return `${item.label} · ${child.label}`;
  }
  return 'Settings';
}

export function isAdminPane(pane: SettingsPaneKey): boolean {
  return SETTINGS_NAV.some(
    (item) =>
      item.adminOnly && (item.pane === pane || item.children?.some((child) => child.pane === pane))
  );
}

/** Panes that additionally require `Settings — manage permissions`. */
export function isManagePane(pane: SettingsPaneKey): boolean {
  return SETTINGS_NAV.some((item) => item.manageOnly && item.pane === pane);
}
