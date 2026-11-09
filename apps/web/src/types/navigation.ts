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

/** Filter preset the Deadlines board understands, carried through navigation. */
export type DeadlineKpiFilter = 'all' | 'overdue' | 'due7' | 'due30' | 'missing';

/** Extra navigation intent a view can hand to its destination. */
export interface NavigateOptions {
  /** Pre-applied assignee filter for the Deadlines board. */
  staffId?: string;
  /** Pre-applied KPI filter for the Deadlines board. */
  kpiFilter?: DeadlineKpiFilter;
  /** Pane Settings should open on. */
  settingsPane?: 'profile' | 'team' | 'matrix';
}
