import * as React from 'react';

export interface PageHeaderProps {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

/**
 * Shared page masthead: mono eyebrow, serif H1, muted subtitle and a
 * right-aligned action cluster. Every view opens with it so the page rhythm
 * stays identical across the practice.
 */
export function PageHeader({ eyebrow, title, subtitle, actions }: PageHeaderProps) {
  return (
    <header className="flex flex-col gap-4 border-b border-border pb-5 sm:flex-row sm:items-end sm:justify-between">
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="font-mono text-[10px] font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {eyebrow}
          </p>
        )}
        <h1 className="font-serif text-2xl leading-tight tracking-tight text-foreground">
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-2xl text-xs leading-relaxed text-muted-foreground">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex shrink-0 items-center gap-2 self-start sm:self-end">{actions}</div>
      )}
    </header>
  );
}
