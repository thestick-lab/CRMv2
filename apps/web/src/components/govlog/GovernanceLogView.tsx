import { ScrollText } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { EmptyStateCard } from '@/components/ui/list-primitives';

export function GovernanceLogView() {
  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        eyebrow="Admin"
        title="Governance Log"
        subtitle="Read-only audit trail of partner sign-offs, submissions, quote decisions, invoices and permission changes."
      />
      <EmptyStateCard
        icon={ScrollText}
        title="No audit entries yet"
        subtitle="Sign-offs, submissions and permission changes appear here automatically as they happen."
      />
    </div>
  );
}
