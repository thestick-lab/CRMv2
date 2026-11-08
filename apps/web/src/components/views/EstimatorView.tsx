import * as React from 'react';
import * as TabsPrimitive from '@radix-ui/react-tabs';
import type { ViewKey } from '@/types/navigation';
import { EstimateCalculator } from '@/components/estimator/EstimateCalculator';
import { SentQuotesPipeline } from '@/components/estimator/SentQuotesPipeline';
import { Badge } from '@/components/ui/badge';
import { Calculator, FileCheck2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface EstimatorViewProps {
  onNavigate: (view: ViewKey, clientCode?: string) => void;
  initialTab?: 'calculator' | 'pipeline';
}

export function EstimatorView({ onNavigate, initialTab = 'calculator' }: EstimatorViewProps) {
  const [activeTab, setActiveTab] = React.useState<string>(initialTab);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
              <Calculator className="h-5 w-5 text-[#c4161c]" />
              Fee Estimator &amp; Quotes
            </h1>
            <Badge variant="crimsonSubdued" className="font-mono text-xs py-0 px-1.5 h-5">
              12-Month Projections
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mt-0.5">
            Interactive retainer calculation engine with March +6% escalation and sent proposal onboarding pipeline.
          </p>
        </div>
      </div>

      {/* 2-Tab Navigation */}
      <TabsPrimitive.Root
        value={activeTab}
        onValueChange={setActiveTab}
        className="space-y-4"
      >
        <TabsPrimitive.List className="flex items-center gap-1 border-b border-border/80 pb-px">
          <TabsPrimitive.Trigger
            value="calculator"
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors outline-none cursor-pointer',
              activeTab === 'calculator'
                ? 'border-[#c4161c] text-[#c4161c] dark:text-[#f87171] font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <Calculator className="h-3.5 w-3.5" />
            <span>Estimate Calculator</span>
          </TabsPrimitive.Trigger>

          <TabsPrimitive.Trigger
            value="pipeline"
            className={cn(
              'flex items-center gap-2 px-3.5 py-2 text-xs font-medium border-b-2 -mb-px transition-colors outline-none cursor-pointer',
              activeTab === 'pipeline'
                ? 'border-[#c4161c] text-[#c4161c] dark:text-[#f87171] font-semibold'
                : 'border-transparent text-muted-foreground hover:text-foreground'
            )}
          >
            <FileCheck2 className="h-3.5 w-3.5" />
            <span>{'Sent Quotes & Onboarding'}</span>
          </TabsPrimitive.Trigger>
        </TabsPrimitive.List>

        <TabsPrimitive.Content value="calculator" className="outline-none">
          <EstimateCalculator />
        </TabsPrimitive.Content>

        <TabsPrimitive.Content value="pipeline" className="outline-none">
          <SentQuotesPipeline onConvertClient={(code) => onNavigate('client', code)} />
        </TabsPrimitive.Content>
      </TabsPrimitive.Root>
    </div>
  );
}
