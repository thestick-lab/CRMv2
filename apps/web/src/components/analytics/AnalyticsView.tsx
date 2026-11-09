import { BarChart3 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyStateCard } from '@/components/ui/list-primitives';

export function AnalyticsView() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        eyebrow="Analytics"
        title="Overview"
        subtitle="Billed revenue, active clients, filings submitted and billable hours against the previous period."
      />
      <EmptyStateCard
        icon={BarChart3}
        title="No analytics data in this period"
        subtitle="Revenue, filings and billable hours appear here once invoices and time entries are recorded."
      />
    </div>
  );
}
