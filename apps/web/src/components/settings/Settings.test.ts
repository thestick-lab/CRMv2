import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { publicHolidays } from 'fdoncall-practice/domain/dates';
import { answerPracticeAssistantQuery } from '../ai/assistant-engine';
import { getInitialPracticeState } from '@/context/PracticeStoreContext';
import { DEFAULT_THEME_MODE, isThemeMode, resolveTheme } from '@/context/ThemeContext';
import {
  SETTINGS_NAV,
  isAdminPane,
  isManagePane,
  settingsPaneLabel,
  type SettingsPaneKey,
} from './settings-nav';

describe('Settings view panes and AI assistant engine', () => {
  it('calculates South African public holidays for 2026 and 2027', () => {
    const h2026 = publicHolidays(2026);
    expect(h2026.get('2026-01-01')).toBe("New Year's Day");
    expect(h2026.get('2026-03-21')).toBe('Human Rights Day');
    expect(h2026.get('2026-04-03')).toBe('Good Friday');
    expect(h2026.get('2026-04-06')).toBe('Family Day');
    expect(h2026.get('2026-04-27')).toBe('Freedom Day');
    expect(h2026.get('2026-12-16')).toBe('Day of Reconciliation');

    const h2027 = publicHolidays(2027);
    expect(h2027.get('2027-01-01')).toBe("New Year's Day");
    expect(h2027.has('2027-03-26')).toBe(true);
  });

  it('answers practice assistant queries using local practice state when offline', () => {
    const state = getInitialPracticeState();

    const clientResponse = answerPracticeAssistantQuery('how many clients do we have?', state);
    expect(clientResponse).toContain('13');
    expect(clientResponse).toContain('active clients');

    const rateResponse = answerPracticeAssistantQuery('what is our standard hourly rate?', state);
    expect(rateResponse).toContain('R 625');
    expect(rateResponse).toContain('6%');

    const staffResponse = answerPracticeAssistantQuery('who are the partners in the firm?', state);
    expect(staffResponse).toContain('Erik');
    expect(staffResponse).toContain('Wouter');

    const openQuotes = state.quotes.filter(
      (quote) => quote.stage !== 'Closed Lost' && quote.stage !== 'Active Client'
    ).length;
    const pipelineResponse = answerPracticeAssistantQuery('how many quotes are open?', state);
    expect(pipelineResponse).toContain(`${openQuotes} open quotes`);
    expect(pipelineResponse).not.toContain('onboarding pipeline');
  });

  it('verifies ServicePricingMatrixPane file existence and contracts', () => {
    const matrixSrc = fs.readFileSync('src/components/settings/panes/ServicePricingMatrixPane.tsx', 'utf8');

    // Matrix pane contents
    expect(matrixSrc).toContain('Service Catalogue');
    expect(matrixSrc).toContain('Standard Rates');
  });
});

describe('Settings navigation groups', () => {
  it('renders the settings groups in order with their child panes', () => {
    expect(SETTINGS_NAV.map((item) => item.label)).toEqual([
      'Profile',
      'Appearance',
      'Team & Staff',
      'Roles & Permissions',
      'Practice Rules',
      'Integrations',
      'Notifications',
    ]);

    const practiceRules = SETTINGS_NAV.find((item) => item.label === 'Practice Rules');
    expect(practiceRules?.children?.map((child) => child.label)).toEqual([
      'Service & Pricing Matrix',
      'SA Public Holidays',
    ]);
    expect(practiceRules?.children?.map((child) => child.pane)).toEqual(['matrix', 'holidays']);

    const integrations = SETTINGS_NAV.find((item) => item.label === 'Integrations');
    expect(integrations?.children?.map((child) => child.label)).toEqual([
      'Documenso',
      'Xero',
      'AI Assistant',
    ]);
    expect(integrations?.children?.map((child) => child.pane)).toEqual([
      'documenso',
      'xero',
      'ai',
    ]);
  });

  it('keeps every pane reachable from the nav', () => {
    const reachable = new Set<SettingsPaneKey>();
    for (const item of SETTINGS_NAV) {
      if (item.pane) reachable.add(item.pane);
      for (const child of item.children ?? []) reachable.add(child.pane);
    }

    const expected: SettingsPaneKey[] = [
      'profile',
      'appearance',
      'team',
      'roles',
      'matrix',
      'holidays',
      'documenso',
      'xero',
      'ai',
      'notifications',
    ];

    expect(expected.filter((pane) => !reachable.has(pane))).toEqual([]);
  });

  it('marks administration panes as partner-only and leaves personal panes open', () => {
    expect(isAdminPane('profile')).toBe(false);
    expect(isAdminPane('appearance')).toBe(false);
    expect(isAdminPane('notifications')).toBe(false);
    expect(isAdminPane('team')).toBe(true);
    // The matrix is gated by `Settings — manage permissions`, not by edit alone.
    expect(isAdminPane('roles')).toBe(false);
    expect(isAdminPane('matrix')).toBe(true);
    expect(isAdminPane('holidays')).toBe(true);
    expect(isAdminPane('documenso')).toBe(true);
    expect(isAdminPane('xero')).toBe(true);
    expect(isAdminPane('ai')).toBe(true);
  });

  it('guards the permissions matrix with Settings — manage permissions', () => {
    expect(isManagePane('roles')).toBe(true);
    expect(isManagePane('team')).toBe(false);
    expect(isManagePane('profile')).toBe(false);
  });

  it('labels a child pane with its owning group', () => {
    expect(settingsPaneLabel('matrix')).toBe('Practice Rules · Service & Pricing Matrix');
    expect(settingsPaneLabel('xero')).toBe('Integrations · Xero');
    expect(settingsPaneLabel('team')).toBe('Team & Staff');
    expect(settingsPaneLabel('roles')).toBe('Roles & Permissions');
    expect(settingsPaneLabel('profile')).toBe('Profile');
  });
});

describe('Settings view wiring', () => {
  it('renders every settings pane through the nav switch, not dead files', () => {
    const settingsSrc = fs.readFileSync('src/components/settings/SettingsView.tsx', 'utf8');

    for (const pane of [
      'ProfilePane',
      'AppearancePane',
      'TeamRbacPane',
      'RolesPermissionsPane',
      'ServicePricingMatrixPane',
      'PublicHolidaysPane',
      'IntegrationsPane',
      'NotificationsPane',
    ]) {
      expect(settingsSrc).toContain(`<${pane}`);
    }

    expect(settingsSrc).not.toContain('Practice Settings & Configuration');
    expect(settingsSrc).not.toContain('Admin Panel');
  });

  it('wraps the existing AI credential pane inside Integrations', () => {
    const integrationsSrc = fs.readFileSync('src/components/settings/panes/IntegrationsPane.tsx', 'utf8');

    expect(integrationsSrc).toContain('AiIntegrationsPane');
    expect(integrationsSrc).toContain('Documenso');
    expect(integrationsSrc).toContain('Base URL');
    expect(integrationsSrc).toContain('API key');
    expect(integrationsSrc).toContain('Client ID');
    expect(integrationsSrc).toContain('Client secret');
    expect(integrationsSrc).toContain('Tenant ID');
  });

  it('puts the theme choice in Appearance on the shared theme provider', () => {
    const appearanceSrc = fs.readFileSync('src/components/settings/panes/AppearancePane.tsx', 'utf8');
    const layoutSrc = fs.readFileSync('src/components/layout/Layout.tsx', 'utf8');
    const appSrc = fs.readFileSync('src/App.tsx', 'utf8');

    expect(appearanceSrc).toContain('useTheme');
    expect(appearanceSrc).toContain('role="radiogroup"');
    expect(appearanceSrc).toContain("mode: 'system'");
    expect(layoutSrc).toContain('useTheme');
    expect(appSrc).toContain('ThemeProvider');
  });

  it('keeps notification preferences session-local and says so', () => {
    const notificationsSrc = fs.readFileSync('src/components/settings/panes/NotificationsPane.tsx', 'utf8');

    expect(notificationsSrc).toContain('role="switch"');
    expect(notificationsSrc.replace(/\s+/g, ' ')).toContain('this browser session only');
  });

  it('shows contract terms on the Team & Staff table', () => {
    const teamSrc = fs.readFileSync('src/components/settings/panes/TeamRbacPane.tsx', 'utf8');

    expect(teamSrc).toContain('buildStaffUsers');
    expect(teamSrc).toContain('staffRows');
    expect(teamSrc).toContain('formatHourlyRate');
    expect(teamSrc).toContain('formatStartDate');
    expect(teamSrc).toContain('Contract');
    expect(teamSrc).toContain('Phone');
    expect(teamSrc).toContain('Start date');
    expect(teamSrc).toContain("'Support Tech'");
  });
});

describe('Theme resolution', () => {
  it('resolves explicit and system themes', () => {
    expect(resolveTheme('light', true)).toBe('light');
    expect(resolveTheme('dark', false)).toBe('dark');
    expect(resolveTheme('system', true)).toBe('dark');
    expect(resolveTheme('system', false)).toBe('light');
  });

  it('defaults to the practice dark canvas and rejects unknown stored modes', () => {
    expect(DEFAULT_THEME_MODE).toBe('dark');
    expect(isThemeMode('system')).toBe(true);
    expect(isThemeMode('midnight')).toBe(false);
  });
});
