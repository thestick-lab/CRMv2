import * as React from 'react';
import type { LucideIcon } from 'lucide-react';
import { PageHeader } from '@/components/ui/page-header';
import { Badge } from '@/components/ui/badge';
import { ProfilePane } from './panes/ProfilePane';
import { AppearancePane } from './panes/AppearancePane';
import { NotificationsPane } from './panes/NotificationsPane';
import { IntegrationsPane } from './panes/IntegrationsPane';
import { TeamRbacPane } from './panes/TeamRbacPane';
import { RolesPermissionsPane } from './panes/RolesPermissionsPane';
import { ServicePricingMatrixPane } from './panes/ServicePricingMatrixPane';
import { PublicHolidaysPane } from './panes/PublicHolidaysPane';
import {
  SETTINGS_NAV,
  isAdminPane,
  isManagePane,
  settingsPaneLabel,
  type SettingsPaneKey,
} from './settings-nav';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { can } from '@/lib/permissions';
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
    case 'roles':
      return <RolesPermissionsPane />;
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
    default:
      return <ProfilePane />;
  }
}

export function SettingsView({ initialPane = 'profile' }: SettingsViewProps) {
  const [activePane, setActivePane] = React.useState<SettingsPaneKey>(initialPane);
  const { currentUser, permissions } = usePracticeStore();
  const canViewSettings = can(currentUser.role, 'Settings', 'view', permissions.matrix);
  // Practice rules, pricing, staffing, integrations: `Settings — edit` per §6.9.
  const canEditSettings = can(currentUser.role, 'Settings', 'edit', permissions.matrix);
  // The matrix itself is guarded by `Settings — manage permissions` (§6.9).
  const canManagePermissions = can(
    currentUser.role,
    'Settings',
    'manage',
    permissions.matrix
  );

  // Deep links into an admin pane fall back to Profile for roles that may only
  // read their own settings.
  React.useEffect(() => {
    if (!canEditSettings && isAdminPane(activePane)) {
      setActivePane('profile');
    } else if (!canManagePermissions && isManagePane(activePane)) {
      setActivePane('profile');
    }
  }, [canEditSettings, canManagePermissions, activePane]);

  if (!canViewSettings) {
    return (
      <div className="mx-auto max-w-7xl space-y-6 p-6">
        <PageHeader
          eyebrow="Practice"
          title="Settings"
          subtitle="Settings belongs to the practice administrators for this role."
        />
        <div className="rounded-xl border border-border bg-card px-6 py-10 text-center">
          <p className="text-sm font-medium text-foreground">Settings is not available to {currentUser.role}</p>
          <p className="mt-1 text-xs text-muted-foreground">
            A Partner or the support technician can grant access in the permission matrix.
          </p>
        </div>
      </div>
    );
  }

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
              if (item.adminOnly && !canEditSettings) return null;
              if (item.manageOnly && !canManagePermissions) return null;

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
