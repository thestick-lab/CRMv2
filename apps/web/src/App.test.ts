import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { todayInSouthAfrica, easterSunday } from 'fdoncall-practice/domain/dates';
import { CLIENTS } from 'fdoncall-practice/data/seed';

describe('App domain workspace link', () => {
  it('resolves date functions from domain engine', () => {
    const today = todayInSouthAfrica();
    expect(today).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(easterSunday(2026)).toBe('2026-04-05');
  });

  it('resolves seeded practice clients from domain engine', () => {
    expect(CLIENTS.length).toBe(13);
    const alc = CLIENTS.find((c) => c.code === 'ALC-610');
    expect(alc).toBeDefined();
    expect(alc?.name).toBe('A & L Contracting');
  });
});

describe('Workspace scripts and theme configuration', () => {
  it('has root dev script and web typecheck script', () => {
    const rootPkg = JSON.parse(fs.readFileSync('../../package.json', 'utf8'));
    const webPkg = JSON.parse(fs.readFileSync('package.json', 'utf8'));
    expect(rootPkg.scripts?.dev).toBe('npm run dev --workspace=@crmv2/web');
    expect(webPkg.scripts?.typecheck).toBe('tsc -b');
  });

  it('configures Tailwind v4 class-based dark variant and inline theme', () => {
    const css = fs.readFileSync('src/index.css', 'utf8');
    expect(css).toContain('@custom-variant dark');
    expect(css).toContain('@theme inline');
  });
});

describe('App shell and view integration', () => {
  it('mounts Layout and connects DashboardView, ClientsView, and DeadlinesView', () => {
    const appSource = fs.readFileSync('src/App.tsx', 'utf8');
    expect(appSource).toContain('<Layout');
    expect(appSource).toContain('DashboardView');
    expect(appSource).toContain('ClientsView');
    expect(appSource).toContain('DeadlinesView');
  });
});
