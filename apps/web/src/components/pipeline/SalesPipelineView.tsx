import { TrendingUp } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyStateCard } from '@/components/ui/list-primitives';

export function SalesPipelineView() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        eyebrow="Sales Pipeline"
        title="Quotes and invoices"
        subtitle="Track fee quotes from draft to active client, and the invoices raised against them."
      />
      <EmptyStateCard
        icon={TrendingUp}
        title="No quotes yet"
        subtitle="Create a fee quote to start tracking a prospect through the pipeline."
      />
    </div>
  );
}
