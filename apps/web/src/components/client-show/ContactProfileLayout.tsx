import * as React from 'react';
import { cn } from '@/lib/utils';
import { initialsFor } from './client-record-data';

/* ---------------------------------------------------------------------------
 * Shared company/person profile shell (crm-contact-profile anatomy): an
 * identity block with avatar tile, code badge and tag pills, a right-hand
 * contact meta column, an action cluster and the record tab rail.
 * ------------------------------------------------------------------------- */

export interface ContactIdentity {
  name: string;
  code?: string;
  subtitle: string;
  description?: string;
  tags: string[];
}

export interface ContactMeta {
  email?: string;
  phone?: string;
  location?: string;
  timezone?: string;
}

export interface TabConfig {
  id: string;
  label: string;
  icon?: React.ComponentType<{ className?: string }>;
}

export interface ContactProfileLayoutProps {
  identity: ContactIdentity;
  meta: ContactMeta;
  actions?: React.ReactNode;
  tabs: TabConfig[];
  activeTab: string;
  onTab: (id: string) => void;
  /** Accessible label for the tab rail; defaults to the client record wording. */
  tabsLabel?: string;
  children: React.ReactNode;
}

const META_ROWS: Array<{ key: keyof ContactMeta; label: string }> = [
  { key: 'email', label: 'Email' },
  { key: 'phone', label: 'Phone' },
  { key: 'location', label: 'Location' },
  { key: 'timezone', label: 'Timezone' },
];

export function ContactProfileLayout({
  identity,
  meta,
  actions,
  tabs,
  activeTab,
  onTab,
  tabsLabel = 'Client record sections',
  children,
}: ContactProfileLayoutProps) {
  return (
    <div className="space-y-6">
      <div className="overflow-hidden rounded-xl border border-border bg-card">
        <div className="flex flex-col gap-6 p-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div
              aria-hidden="true"
              className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border border-[#c4161c]/15 bg-[#c4161c]/[0.08] font-serif text-xl leading-none text-[#c4161c] dark:text-[#f87171]"
            >
              {initialsFor(identity.name)}
            </div>

            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
                  {identity.name}
                </h1>
                {identity.code && (
                  <span className="rounded bg-[#c4161c]/10 px-1.5 py-0.5 font-mono text-[11px] font-semibold text-[#c4161c] dark:text-[#f87171]">
                    {identity.code}
                  </span>
                )}
              </div>

              <p className="text-xs font-medium text-foreground/80">{identity.subtitle}</p>

              {identity.description && (
                <p className="max-w-xl text-xs leading-relaxed text-muted-foreground">
                  {identity.description}
                </p>
              )}

              {identity.tags.length > 0 && (
                <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                  {identity.tags.map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full border border-border bg-muted/50 px-2 py-0.5 font-mono text-[10px] leading-none text-muted-foreground"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col gap-3 sm:flex-row sm:items-start lg:gap-6">
            <dl className="grid grid-cols-2 gap-x-6 gap-y-2 sm:min-w-[240px]">
              {META_ROWS.map((row) => {
                const value = meta[row.key];
                return (
                  <div key={row.key} className="space-y-0.5">
                    <dt className="font-mono text-[9px] uppercase tracking-[0.14em] text-muted-foreground">
                      {row.label}
                    </dt>
                    <dd
                      className={cn(
                        'max-w-[180px] truncate text-xs',
                        value ? 'text-foreground' : 'text-muted-foreground'
                      )}
                      title={value || undefined}
                    >
                      {value || '—'}
                    </dd>
                  </div>
                );
              })}
            </dl>

            {actions && <div className="flex items-center gap-2">{actions}</div>}
          </div>
        </div>

        <div
          role="tablist"
          aria-label={tabsLabel}
          className="flex items-center gap-1 overflow-x-auto border-t border-border px-3 pt-1"
        >
          {tabs.map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={isActive}
                onClick={() => onTab(tab.id)}
                className={cn(
                  'flex shrink-0 items-center gap-1.5 border-b-2 px-3 py-2 text-xs font-medium outline-none transition-colors focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-[#c4161c]',
                  isActive
                    ? 'border-[#c4161c] font-semibold text-[#c4161c] dark:text-[#f87171]'
                    : 'border-transparent text-muted-foreground hover:border-border hover:text-foreground'
                )}
              >
                {Icon && (
                  <Icon
                    className={cn(
                      'h-3.5 w-3.5',
                      isActive ? 'text-[#c4161c] dark:text-[#f87171]' : 'text-muted-foreground'
                    )}
                  />
                )}
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {children}
    </div>
  );
}
