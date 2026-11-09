import { Users2 } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyStateCard } from '@/components/ui/list-primitives';

export function TeamView() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        eyebrow="Team"
        title="Team"
        subtitle="The internal staff register: role, employment kind, contact details and contract terms."
      />
      <EmptyStateCard
        icon={Users2}
        title="No staff records yet"
        subtitle="Invite a team member to add the first staff record to the register."
      />
    </div>
  );
}
