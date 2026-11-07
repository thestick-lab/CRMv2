import type { ViewKey } from '@/types/navigation';
import { DeadlinesDashboard } from '@/components/deadlines/DeadlinesDashboard';

export interface DeadlinesViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function DeadlinesView({ onNavigate }: DeadlinesViewProps) {
  return (
    <DeadlinesDashboard
      onSelectClient={(code) => onNavigate('client', code)}
    />
  );
}
