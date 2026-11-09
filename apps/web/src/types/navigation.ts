export type ViewKey =
  | 'dashboard'
  | 'analytics'
  | 'inbox'
  | 'clients'
  | 'client'
  | 'team'
  | 'deadlines'
  | 'sales-pipeline'
  | 'time'
  | 'settings'
  | 'govlog';

export type NavSection = 'Practice' | 'Work' | 'Admin';

export interface NavItemConfig {
  id: ViewKey;
  label: string;
  section?: NavSection;
  icon: string;
  badge?: number | string;
}

export interface NavigationState {
  view: ViewKey;
  clientCode?: string;
  breadcrumbs: Array<{ label: string; view?: ViewKey; clientCode?: string }>;
}
