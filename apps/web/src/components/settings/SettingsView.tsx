import * as React from 'react';
import {
  User,
  ShieldCheck,
  Cpu,
  Settings as SettingsIcon,
  FileSpreadsheet,
  Users,
  Shield,
  Bot,
} from 'lucide-react';
import { ProfilePane } from './panes/ProfilePane';
import { TeamRbacPane } from './panes/TeamRbacPane';
import { ServicePricingMatrixPane } from './panes/ServicePricingMatrixPane';
import { SaicaGovernanceLogPane } from './panes/SaicaGovernanceLogPane';
import { AiIntegrationsPane } from './panes/AiIntegrationsPane';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { cn } from '@/lib/utils';

export type SettingsPaneKey = 'profile' | 'ai' | 'team' | 'matrix' | 'saica';

export interface SettingsViewProps {
  initialPane?: SettingsPaneKey;
}

export function SettingsView({ initialPane = 'profile' }: SettingsViewProps) {
  const [activePane, setActivePane] = React.useState<SettingsPaneKey>(initialPane);
  const { currentUser } = usePracticeStore();

  const isPartnerOrAdmin =
    currentUser.role === 'Partner' || currentUser.role === 'Compliance Officer';

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 text-xs">
      {/* Unified Clean Header */}
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-[#c4161c]" />
          Settings
        </h1>
      </div>

      {/* Two-Pane Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Pane (Twenty CRM Hierarchy) */}
        <div className="md:col-span-4 lg:col-span-3 rounded-xl border border-border bg-card p-2 space-y-4 shadow-xs">
          {/* User Settings */}
          <div className="space-y-1">
            <div className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-medium">
              User
            </div>
            <button
              onClick={() => setActivePane('profile')}
              className={cn(
                'w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors text-xs font-medium cursor-pointer',
                activePane === 'profile'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <User className="h-3.5 w-3.5 shrink-0" />
              <span>My Profile &amp; Security</span>
            </button>
          </div>

          {/* Workspace Settings */}
          <div className="space-y-1">
            <div className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-medium">
              Workspace
            </div>
            <button
              onClick={() => setActivePane('ai')}
              className={cn(
                'w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors text-xs font-medium cursor-pointer',
                activePane === 'ai'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Bot className="h-3.5 w-3.5 shrink-0" />
              <span>AI Copilot &amp; Providers</span>
            </button>
          </div>

          {/* Admin Panel (Founders & Technicians) */}
          <div className="space-y-1 pt-1 border-t border-border/60">
            <div className="px-2.5 text-[10px] font-mono uppercase tracking-wider text-muted-foreground font-medium flex items-center justify-between">
              <span>Admin Panel</span>
              <span className="text-[9px] text-primary font-bold">CA(SA)</span>
            </div>

            <button
              onClick={() => setActivePane('team')}
              className={cn(
                'w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors text-xs font-medium cursor-pointer',
                activePane === 'team'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <Users className="h-3.5 w-3.5 shrink-0" />
              <span>Team &amp; Staff Database</span>
            </button>

            <button
              onClick={() => setActivePane('matrix')}
              className={cn(
                'w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors text-xs font-medium cursor-pointer',
                activePane === 'matrix'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <FileSpreadsheet className="h-3.5 w-3.5 shrink-0" />
              <span>Service &amp; Pricing Matrix</span>
            </button>

            <button
              onClick={() => setActivePane('saica')}
              className={cn(
                'w-full flex items-center gap-2.5 p-2 rounded-lg text-left transition-colors text-xs font-medium cursor-pointer',
                activePane === 'saica'
                  ? 'bg-primary/10 text-primary font-semibold'
                  : 'text-muted-foreground hover:bg-muted hover:text-foreground'
              )}
            >
              <ShieldCheck className="h-3.5 w-3.5 shrink-0 text-amber-500" />
              <span>SAICA Governance Log</span>
            </button>
          </div>
        </div>

        {/* Right Content Pane */}
        <div className="md:col-span-8 lg:col-span-9 rounded-xl border border-border bg-card p-6 shadow-xs min-h-[550px]">
          {activePane === 'profile' && <ProfilePane />}
          {activePane === 'ai' && <AiIntegrationsPane />}
          {activePane === 'team' && <TeamRbacPane />}
          {activePane === 'matrix' && <ServicePricingMatrixPane />}
          {activePane === 'saica' && <SaicaGovernanceLogPane />}
        </div>
      </div>
    </div>
  );
}
