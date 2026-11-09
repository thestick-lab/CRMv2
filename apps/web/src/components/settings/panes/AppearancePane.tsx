import { Check, Monitor, Moon, Sun, type LucideIcon } from 'lucide-react';
import { useTheme, type ThemeMode } from '@/context/ThemeContext';
import { cn } from '@/lib/utils';

const THEME_OPTIONS: Array<{
  mode: ThemeMode;
  label: string;
  description: string;
  icon: LucideIcon;
}> = [
  {
    mode: 'light',
    label: 'Light',
    description: 'Paper-white canvas with ink text for daylight work.',
    icon: Sun,
  },
  {
    mode: 'dark',
    label: 'Dark',
    description: 'The practice default: low-glare canvas for long drafting sessions.',
    icon: Moon,
  },
  {
    mode: 'system',
    label: 'System',
    description: 'Follows your operating system appearance and updates as it changes.',
    icon: Monitor,
  },
];

export function AppearancePane() {
  const { mode, resolved, setMode } = useTheme();

  return (
    <div className="space-y-6 max-w-3xl text-xs">
      <div>
        <h2 className="text-base font-semibold text-foreground">Appearance</h2>
        <p className="text-muted-foreground mt-0.5">
          Choose how the practice renders on this browser. The topbar toggle switches between light
          and dark and stays in step with this setting.
        </p>
      </div>

      <div
        role="radiogroup"
        aria-label="Theme"
        className="grid grid-cols-1 gap-3 sm:grid-cols-3"
      >
        {THEME_OPTIONS.map(({ mode: option, label, description, icon: Icon }) => {
          const selected = mode === option;
          return (
            <button
              key={option}
              type="button"
              role="radio"
              aria-checked={selected}
              onClick={() => setMode(option)}
              className={cn(
                'group flex flex-col gap-3 rounded-xl border p-4 text-left transition-colors cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected
                  ? 'border-primary/40 bg-primary/5'
                  : 'border-border bg-card hover:bg-muted/40'
              )}
            >
              <span className="flex items-start justify-between">
                <span
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-lg border',
                    selected
                      ? 'border-primary/30 bg-primary/10 text-primary'
                      : 'border-border bg-muted/50 text-muted-foreground group-hover:text-foreground'
                  )}
                >
                  <Icon className="h-4 w-4" />
                </span>
                <span
                  className={cn(
                    'flex h-4 w-4 items-center justify-center rounded-full border',
                    selected ? 'border-primary bg-primary text-white' : 'border-border'
                  )}
                  aria-hidden="true"
                >
                  {selected && <Check className="h-3 w-3" />}
                </span>
              </span>

              <span className="space-y-1">
                <span
                  className={cn(
                    'block text-xs font-semibold',
                    selected ? 'text-primary' : 'text-foreground'
                  )}
                >
                  {label}
                </span>
                <span className="block leading-relaxed text-muted-foreground">{description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-col gap-2 rounded-xl border border-border bg-muted/20 p-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-medium text-foreground">Currently rendering</p>
          <p className="mt-0.5 text-muted-foreground">
            {resolved === 'dark' ? 'Dark canvas' : 'Light canvas'}
            {mode === 'system' ? ' — following your system appearance' : ' — chosen explicitly'}.
          </p>
        </div>
        <span className="font-mono text-[11px] uppercase tracking-wider text-muted-foreground">
          {mode} · {resolved}
        </span>
      </div>

      <p className="text-[11px] leading-relaxed text-muted-foreground">
        Every screen, table and board is designed for both canvases; no data or controls are hidden
        in either theme.
      </p>
    </div>
  );
}
