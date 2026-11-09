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
