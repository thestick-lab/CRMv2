import type { DeadlineKpiFilter, ViewKey } from '@/types/navigation';
import { DeadlinesDashboard } from '@/components/deadlines/DeadlinesDashboard';

export interface DeadlinesViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
  clientFilter?: string;
  staffFilter?: string;
  kpiFilter?: DeadlineKpiFilter;
  onClearClientFilter?: () => void;
}

export function DeadlinesView({
  onNavigate,
  clientFilter,
  staffFilter,
  kpiFilter,
  onClearClientFilter,
}: DeadlinesViewProps) {
  return (
    <DeadlinesDashboard
      onSelectClient={(code) => onNavigate('client', code)}
      clientFilter={clientFilter}
      staffFilter={staffFilter}
      kpiFilter={kpiFilter}
      onClearClientFilter={onClearClientFilter}
    />
  );
}
