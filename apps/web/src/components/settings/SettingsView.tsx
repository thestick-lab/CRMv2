import * as React from 'react';
import { User, ShieldCheck, Calendar, Cpu, Settings as SettingsIcon } from 'lucide-react';
import { ProfilePane } from './panes/ProfilePane';
import { TeamRbacPane } from './panes/TeamRbacPane';
import { PublicHolidaysPane } from './panes/PublicHolidaysPane';
import { AiIntegrationsPane } from './panes/AiIntegrationsPane';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

export type SettingsPaneKey = 'profile' | 'team' | 'holidays' | 'ai';

export interface SettingsViewProps {
  initialPane?: SettingsPaneKey;
}

export function SettingsView({ initialPane = 'profile' }: SettingsViewProps) {
  const [activePane, setActivePane] = React.useState<SettingsPaneKey>(initialPane);

  const navItems = [
    {
      id: 'profile' as const,
      label: 'My Profile & Account',
      icon: User,
      description: 'Account identity, role, and data export',
    },
    {
      id: 'team' as const,
      label: 'Team & RBAC',
      icon: ShieldCheck,
      description: 'Practice staff roles and CA(SA) sign-off rights',
    },
    {
      id: 'holidays' as const,
      label: '🇿🇦 SA Public Holidays & Rates',
      icon: Calendar,
      description: 'Statutory gazette and standard billing rates',
    },
    {
      id: 'ai' as const,
      label: 'AI Subscriptions & Providers',
      icon: Cpu,
      description: 'Anthropic, OpenAI, and Gemini API keys',
    },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <h1 className="text-xl font-semibold text-foreground tracking-tight flex items-center gap-2">
          <SettingsIcon className="h-5 w-5 text-[#c4161c]" />
          Practice Settings &amp; Configuration
        </h1>
        <Badge variant="crimsonSubdued" className="font-mono text-xs py-0 px-1.5 h-5">
          Two-Pane Settings
        </Badge>
      </div>

      {/* Two-Pane Body */}
      <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
        {/* Left Navigation Pane */}
        <div className="md:col-span-4 lg:col-span-3 rounded-xl border border-border bg-card p-2 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = activePane === item.id;

            return (
              <button
                key={item.id}
                onClick={() => setActivePane(item.id)}
                className={cn(
                  'w-full flex items-center gap-2.5 p-2.5 rounded-lg text-left transition-colors text-xs font-medium',
                  isActive
                    ? 'bg-primary/10 text-primary font-semibold'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                <Icon className={cn('h-4 w-4 shrink-0', isActive ? 'text-primary' : 'text-muted-foreground')} />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </div>

        {/* Right Content Pane */}
        <div className="md:col-span-8 lg:col-span-9 rounded-xl border border-border bg-card p-6 shadow-xs min-h-[500px]">
          {activePane === 'profile' && <ProfilePane />}
          {activePane === 'team' && <TeamRbacPane />}
          {activePane === 'holidays' && <PublicHolidaysPane />}
          {activePane === 'ai' && <AiIntegrationsPane />}
        </div>
      </div>
    </div>
  );
}
