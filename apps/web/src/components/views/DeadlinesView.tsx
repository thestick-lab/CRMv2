import type { ViewKey } from '@/types/navigation';
import { DeadlinesDashboard } from '@/components/deadlines/DeadlinesDashboard';

export interface DeadlinesViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
  clientFilter?: string;
  onClearClientFilter?: () => void;
}

export function DeadlinesView({ onNavigate, clientFilter, onClearClientFilter }: DeadlinesViewProps) {
  return (
    <DeadlinesDashboard
      onSelectClient={(code) => onNavigate('client', code)}
      clientFilter={clientFilter}
      onClearClientFilter={onClearClientFilter}
    />
  );
}
