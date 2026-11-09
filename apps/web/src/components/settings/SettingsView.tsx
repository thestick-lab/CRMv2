import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { ProfilePane } from './panes/ProfilePane';
import { AppearancePane } from './panes/AppearancePane';
import { NotificationsPane } from './panes/NotificationsPane';
import { IntegrationsPane } from './panes/IntegrationsPane';
import { TeamRbacPane } from './panes/TeamRbacPane';
import { ServicePricingMatrixPane } from './panes/ServicePricingMatrixPane';
import { PublicHolidaysPane } from './panes/PublicHolidaysPane';
import { SaicaGovernanceLogPane } from './panes/SaicaGovernanceLogPane';
import {
  SETTINGS_AUDIT_NAV,
  SETTINGS_NAV,
  isAdminPane,
  settingsPaneLabel,
  type SettingsPaneKey,
} from './settings-nav';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { cn } from '@/lib/utils';

export type { SettingsPaneKey };

export interface SettingsViewProps {
  initialPane?: SettingsPaneKey;
}

interface NavButtonProps {
  label: string;
  icon?: LucideIcon;
  hint?: string;
  active: boolean;
  nested?: boolean;
  onSelect: () => void;
}

function NavButton({ label, icon: Icon, hint, active, nested, onSelect }: NavButtonProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-current={active ? 'page' : undefined}
      className={cn(
        'group flex w-full items-start gap-2.5 rounded-lg text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
        nested ? 'py-1.5 pl-7 pr-2.5' : 'px-2.5 py-2',
        active
          ? 'bg-primary/10 text-primary font-semibold'
          : 'text-muted-foreground hover:bg-muted hover:text-foreground'
      )}
    >
      {Icon && <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0" />}
      <span className="min-w-0 flex-1">
        <span className="block truncate text-xs">{label}</span>
        {hint && (
          <span
            className={cn(
              'mt-0.5 block truncate text-[10px] font-normal',
              active ? 'text-primary/70' : 'text-muted-foreground/70'
            )}
          >
            {hint}
          </span>
        )}
      </span>
    </button>
  );
}

function SettingsPane({ pane }: { pane: SettingsPaneKey }) {
  switch (pane) {
    case 'profile':
      return <ProfilePane />;
    case 'appearance':
      return <AppearancePane />;
    case 'team':
      return <TeamRbacPane />;
    case 'matrix':
      return <ServicePricingMatrixPane />;
    case 'holidays':
      return <PublicHolidaysPane />;
    case 'documenso':
      return <IntegrationsPane section="documenso" />;
    case 'xero':
      return <IntegrationsPane section="xero" />;
    case 'ai':
      return <IntegrationsPane section="ai" />;
    case 'notifications':
      return <NotificationsPane />;
    case 'saica':
      return <SaicaGovernanceLogPane />;
    default:
      return <ProfilePane />;
  }
}

export function SettingsView({ initialPane = 'profile' }: SettingsViewProps) {
  const [activePane, setActivePane] = React.useState<SettingsPaneKey>(initialPane);
  const { currentUser } = usePracticeStore();
  const isPartnerOrAdmin =
    currentUser.role === 'Partner' || currentUser.role === 'Compliance Officer';

  // Deep links into an admin pane fall back to Profile for other roles.
  React.useEffect(() => {
    if (!isPartnerOrAdmin && isAdminPane(activePane)) {
      setActivePane('profile');
    }
  }, [isPartnerOrAdmin, activePane]);

  return (
    <div className="mx-auto max-w-7xl space-y-6 p-6">
      <PageHeader
        eyebrow="Practice"
        title="Settings"
        subtitle="Your profile and appearance, the practice team, statutory rules, connected services and notifications."
        actions={
          <Badge variant="outline" className="font-mono text-[10px]">
            {currentUser.role}
          </Badge>
        }
      />

      <div className="grid grid-cols-1 items-start gap-6 md:grid-cols-12">
        <nav
          aria-label="Settings sections"
          className="rounded-xl border border-border bg-card p-2 md:col-span-4 lg:col-span-3"
        >
          <div className="space-y-0.5">
            {SETTINGS_NAV.map((item) => {
              if (item.adminOnly && !isPartnerOrAdmin) return null;

              if (item.children) {
                return (
                  <div key={item.label} className="pt-2">
                    <div className="flex items-center gap-1.5 px-2.5 pb-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                      <item.icon className="h-3 w-3" />
                      <span>{item.label}</span>
                    </div>
                    <div className="space-y-0.5">
                      {item.children.map((child) => (
                        <NavButton
                          key={child.pane}
                          label={child.label}
                          hint={child.hint}
                          nested
                          active={activePane === child.pane}
                          onSelect={() => setActivePane(child.pane)}
                        />
                      ))}
                    </div>
                  </div>
                );
              }

              return (
                <NavButton
                  key={item.label}
                  label={item.label}
                  icon={item.icon}
                  active={activePane === item.pane}
                  onSelect={() => setActivePane(item.pane!)}
                />
              );
            })}

            {isPartnerOrAdmin && (
              <div className="mt-2 border-t border-border/60 pt-2">
                <div className="flex items-center gap-1.5 px-2.5 pb-1 font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-muted-foreground">
                  <span>Audit</span>
                </div>
                <NavButton
                  label={SETTINGS_AUDIT_NAV.label}
                  icon={SETTINGS_AUDIT_NAV.icon}
                  hint="Moves to the Governance Log view"
                  active={activePane === 'saica'}
                  onSelect={() => setActivePane('saica')}
                />
              </div>
            )}
          </div>
        </nav>

        <section
          aria-label={settingsPaneLabel(activePane)}
          className="min-h-[560px] rounded-xl border border-border bg-card p-6 md:col-span-8 lg:col-span-9"
        >
          <SettingsPane pane={activePane} />
        </section>
      </div>
    </div>
  );
}
