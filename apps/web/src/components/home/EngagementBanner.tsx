import { ArrowRight } from 'lucide-react';
import { entityInitials } from '@/lib/initials';
import type { HomeBanner } from './home-logic';

export interface EngagementBannerProps {
  banner: HomeBanner;
  onOpenClient: (clientCode: string) => void;
}

/**
 * The engagement Home opens on: the client carrying the most open statutory
 * work, with its lodged-vs-total compliance bar. Falls back to the practice
 * total when every client's obligations are already in.
 */
export function EngagementBanner({ banner, onOpenClient }: EngagementBannerProps) {
  const isClient = banner.code !== '';

  return (
    <section className="rounded-xl border border-border bg-card p-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 items-start gap-3.5">
          <div
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-[#c4161c] font-mono text-sm font-semibold text-white"
            aria-hidden="true"
          >
            {isClient ? entityInitials(banner.clientName) : 'FO'}
          </div>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="truncate font-serif text-lg leading-tight text-foreground">
                {banner.clientName}
              </h2>
              {isClient && (
                <span className="rounded border border-border bg-muted/60 px-1.5 py-0.5 font-mono text-[11px] tracking-wide text-muted-foreground">
                  {banner.code}
                </span>
              )}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">
              {isClient
                ? `Current statutory engagement · ${banner.openTasks} open ${
                    banner.openTasks === 1 ? 'obligation' : 'obligations'
                  }`
                : 'Practice-wide statutory compliance for this period'}
            </p>
          </div>
        </div>

        {isClient && (
          <button
            type="button"
            onClick={() => onOpenClient(banner.code)}
            className="group inline-flex shrink-0 items-center gap-1.5 self-start rounded-md border border-border px-2.5 py-1.5 text-xs font-medium text-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-1 focus-visible:ring-[#c4161c]"
          >
            Open client
            <ArrowRight className="h-3.5 w-3.5 transition-transform group-hover:translate-x-0.5" />
          </button>
        )}
      </div>

      <div className="mt-4">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-mono text-[11px] uppercase tracking-[0.14em] text-muted-foreground">
            Compliance
          </span>
          <span className="font-mono text-[11px] tabular-nums text-foreground">
            {banner.compliancePct}% complete
          </span>
        </div>
        <div
          className="mt-1.5 h-1.5 w-full overflow-hidden rounded-full bg-muted"
          role="progressbar"
          aria-valuenow={banner.compliancePct}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label={
            isClient ? `${banner.clientName} statutory compliance` : 'Practice statutory compliance'
          }
        >
          <div
            className="h-full rounded-full bg-[#c4161c] transition-[width] duration-500 ease-out"
            style={{ width: `${banner.compliancePct}%` }}
          />
        </div>
      </div>
    </section>
  );
}
