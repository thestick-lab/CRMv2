import type { ViewKey } from '@/types/navigation';
import { PeopleDirectory } from '@/components/people/PeopleDirectory';
import { Users } from 'lucide-react';

export interface PeopleViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function PeopleView({ onNavigate }: PeopleViewProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Users className="h-5 w-5 text-[#c4161c]" />
              People
            </h1>
          </div>
        </div>
      </div>

      {/* Directory Component */}
      <PeopleDirectory onNavigateClient={(code) => onNavigate('client', code)} />
    </div>
  );
}
