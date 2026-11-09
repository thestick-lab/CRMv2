import { Clock } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyStateCard } from '@/components/ui/list-primitives';

export function TimeView() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        eyebrow="Time"
        title="Time tracking"
        subtitle="Log billable and non-billable time against clients, then reconcile the practice report."
      />
      <EmptyStateCard
        icon={Clock}
        title="No time logged yet"
        subtitle="Start the timer from the topbar or a task, or add an entry to the timesheet."
      />
    </div>
  );
}
