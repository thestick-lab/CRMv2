import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import { publicHolidays } from 'fdoncall-practice/domain/dates';
import { answerPracticeAssistantQuery } from '../ai/assistant-engine';
import { getInitialPracticeState } from '@/context/PracticeStoreContext';

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
  });

  it('verifies SettingsView implements clean title and Twenty-style section hierarchy', () => {
    const settingsSrc = fs.readFileSync('src/components/settings/SettingsView.tsx', 'utf8');

    // Clean unified title
    expect(settingsSrc).not.toContain('Practice Settings & Configuration');
    expect(settingsSrc).toContain('ProfilePane');
    expect(settingsSrc).toContain('TeamRbacPane');
    expect(settingsSrc).toContain('ServicePricingMatrixPane');
    expect(settingsSrc).toContain('SaicaGovernanceLogPane');
    expect(settingsSrc).toContain('Admin Panel');
  });

  it('verifies ServicePricingMatrixPane and SaicaGovernanceLogPane file existence and contracts', () => {
    const matrixSrc = fs.readFileSync('src/components/settings/panes/ServicePricingMatrixPane.tsx', 'utf8');
    const saicaSrc = fs.readFileSync('src/components/settings/panes/SaicaGovernanceLogPane.tsx', 'utf8');

    // Matrix pane contents
    expect(matrixSrc).toContain('Service Catalogue');
    expect(matrixSrc).toContain('Standard Rates');

    // SAICA Governance Log contents
    expect(saicaSrc).toContain('SAICA Governance Audit Log');
    expect(saicaSrc).toContain('Export Audit Report');
    expect(saicaSrc).toContain('SARS eFiling Confirmation');
  });
});
