import * as React from 'react';
import type { ViewKey } from '@/types/navigation';
import { OnboardingPipeline } from '@/components/pipeline/OnboardingPipeline';
import { Badge } from '@/components/ui/badge';
import { Target } from 'lucide-react';

export interface PipelineViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
}

export function PipelineView({ onNavigate }: PipelineViewProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* View Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Target className="h-5 w-5 text-[#c4161c]" />
              5-Stage Onboarding Pipeline
            </h1>
            <Badge variant="crimsonSubdued" className="font-mono text-xs py-0 px-1.5 h-5">
              5 Stages
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive drag-and-drop Kanban managing prospects from initial lead inquiry through discovery, estimate, KYC &amp; eFiling transfer to active practice client.
          </p>
        </div>
      </div>

      {/* Kanban Board */}
      <OnboardingPipeline onConvertClient={(code) => onNavigate('client', code)} />
    </div>
  );
}
