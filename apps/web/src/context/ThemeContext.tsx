import * as React from 'react';

/* ---------------------------------------------------------------------------
 * Theme: one source of truth for the `dark` class the whole app keys off.
 * The topbar toggle and Settings → Appearance both write here, so they cannot
 * drift apart, and the selected mode survives a reload.
 * ------------------------------------------------------------------------- */

export type ThemeMode = 'light' | 'dark' | 'system';
export type ResolvedTheme = 'light' | 'dark';

export const THEME_STORAGE_KEY = 'crmv2_theme_mode';
/** Matches the app's historical default (canvas opens dark). */
export const DEFAULT_THEME_MODE: ThemeMode = 'dark';

export function resolveTheme(mode: ThemeMode, systemPrefersDark: boolean): ResolvedTheme {
  if (mode === 'system') return systemPrefersDark ? 'dark' : 'light';
  return mode;
}

export function isThemeMode(value: unknown): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

export function readStoredThemeMode(): ThemeMode {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemeMode(stored) ? stored : DEFAULT_THEME_MODE;
  } catch {
    return DEFAULT_THEME_MODE;
  }
}

function systemPrefersDark(): boolean {
  try {
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  } catch {
    return true;
  }
}

export interface ThemeContextValue {
  /** What the user picked in Settings → Appearance (or via the topbar toggle). */
  mode: ThemeMode;
  /** What that resolves to right now. */
  resolved: ResolvedTheme;
  isDark: boolean;
  setMode: (mode: ThemeMode) => void;
  /** Topbar toggle: flips between explicit light and dark. */
  toggle: () => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

export interface ThemeProviderProps {
  children: React.ReactNode;
  /** Test seam; defaults to the persisted choice. */
  initialMode?: ThemeMode;
}

export function ThemeProvider({ children, initialMode }: ThemeProviderProps) {
  const [mode, setModeState] = React.useState<ThemeMode>(
    () => initialMode ?? readStoredThemeMode()
  );
  const [prefersDark, setPrefersDark] = React.useState<boolean>(() => systemPrefersDark());

  // Keep `system` live: follow the OS when it flips while the app is open.
  React.useEffect(() => {
    if (typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia('(prefers-color-scheme: dark)');
    const onChange = (event: MediaQueryListEvent) => setPrefersDark(event.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  const resolved = resolveTheme(mode, prefersDark);

  React.useEffect(() => {
    const root = document.documentElement;
    root.classList.toggle('dark', resolved === 'dark');
    root.style.colorScheme = resolved;
  }, [resolved]);

  const setMode = React.useCallback((next: ThemeMode) => {
    setModeState(next);
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Private mode / storage disabled: the theme still applies for this session.
    }
  }, []);

  const toggle = React.useCallback(() => {
    setMode(resolveTheme(mode, prefersDark) === 'dark' ? 'light' : 'dark');
  }, [mode, prefersDark, setMode]);

  const value = React.useMemo<ThemeContextValue>(
    () => ({ mode, resolved, isDark: resolved === 'dark', setMode, toggle }),
    [mode, resolved, setMode, toggle]
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
}
