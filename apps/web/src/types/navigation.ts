export type ViewKey =
  | 'dashboard'
  | 'inbox'
  | 'settings'
  | 'clients'
  | 'client'
  | 'people'
  | 'deadlines'
  | 'quote'
  | 'pipeline';

export interface NavItemConfig {
  id: ViewKey;
  label: string;
  section?: 'top' | 'PRACTICE DATA' | 'STATUTORY OPS';
  icon: string;
  badge?: number | string;
}

export interface NavigationState {
  view: ViewKey;
  clientCode?: string;
  breadcrumbs: Array<{ label: string; view?: ViewKey; clientCode?: string }>;
}
