import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildAuditEntries,
  exportAuditCsv,
  exportAuditPdf,
  type AuditLogSource,
} from './audit-log';

const source: AuditLogSource = {
  clients: [
    { code: 'MUS-875', name: 'Muse 1399' },
    { code: 'ALC-610', name: 'A & L Contracting' },
  ],
  staff: [
    { id: 'erik', name: 'Erik', role: 'Partner' },
    { id: 'lungani', name: 'Lungani', role: 'Accountant' },
  ],
  taskStatusOverrides: {
    'MUS-875|AFS|2026': {
      status: 'Submitted',
      partnerSignOff: true,
      approvedBy: 'Erik',
      submissionDate: '2026-11-05',
      sarsReference: 'CIPC-AFS-2026-119',
      service: 'AFS',
      period: 'FY 2026',
      updatedAt: '2026-11-05T14:22:00+02:00',
    },
    'ALC-610|VAT201|2026-10': {
      status: 'Approved (Ready to Lodge)',
      partnerSignOff: true,
      approvedBy: 'Erik',
      submissionDate: '2026-11-06',
      service: 'VAT201',
      period: '2026/10',
      updatedAt: '2026-11-06T09:00:00+02:00',
    },
  },
  activity: [
    {
      id: 'activity-1',
      type: 'task',
      actorName: 'Lungani',
      actorInitials: 'L',
      tint: 'amber',
      text: 'Moved AFS workpapers to partner review',
      subline: 'MUS-875 · Muse 1399',
      at: '2026-11-04T08:30:00+02:00',
    },
  ],
};

describe('buildAuditEntries', () => {
  it('derives a Submitted entry from a signed-off submitted override', () => {
    const entries = buildAuditEntries(source);
    const submitted = entries.find((entry) => entry.action === 'Submitted');

    expect(submitted).toBeDefined();
    expect(submitted!.actorName).toBe('Erik');
    expect(submitted!.actorRole).toBe('Partner');
    expect(submitted!.clientCode).toBe('MUS-875');
    expect(submitted!.detail).toContain('CIPC-AFS-2026-119');
    expect(submitted!.at).toBe('2026-11-05T14:22:00+02:00');
  });

  it('keeps a partner sign-off that is not yet submitted as its own entry', () => {
    const entries = buildAuditEntries(source);
    const signOff = entries.find((entry) => entry.action === 'Partner sign-off');

    expect(signOff).toBeDefined();
    expect(signOff!.actorName).toBe('Erik');
    expect(signOff!.clientCode).toBe('ALC-610');
    expect(signOff!.subject).toContain('VAT201');
  });

  it('sorts entries newest-first across override and activity sources', () => {
    const entries = buildAuditEntries(source);
    const stamps = entries.map((entry) => Date.parse(entry.at));

    expect(entries[0].action).toBe('Partner sign-off');
    expect(stamps).toEqual([...stamps].sort((a, b) => b - a));
  });

  it('maps store activity into the trail with the acting role and client code', () => {
    const entries = buildAuditEntries(source);
    const activity = entries.find((entry) => entry.id === 'audit-activity-activity-1');

    expect(activity).toBeDefined();
    expect(activity!.actorName).toBe('Lungani');
    expect(activity!.actorRole).toBe('Accountant');
    expect(activity!.clientCode).toBe('MUS-875');
    expect(activity!.subject).toBe('Moved AFS workpapers to partner review');
  });

  it('is empty when nothing has happened yet', () => {
    expect(
      buildAuditEntries({ clients: [], staff: [], taskStatusOverrides: {}, activity: [] })
    ).toEqual([]);
  });
});

describe('exportAuditCsv', () => {
  it('starts with the header row and quotes the values', () => {
    const csv = exportAuditCsv(buildAuditEntries(source));
    const [header, first] = csv.split('\n');

    expect(header).toBe('Timestamp,Actor,Role,Action,Subject,Client,Detail');
    expect(first).toContain('"Erik"');
    expect(csv).toContain('"MUS-875"');
  });

  it('escapes embedded quotes and commas', () => {
    const csv = exportAuditCsv([
      {
        id: 'x',
        at: '2026-11-06T09:00:00+02:00',
        actorName: 'Erik',
        actorRole: 'Partner',
        action: 'Submitted',
        subject: 'VAT201, period "2026/10"',
        clientCode: 'ALC-610',
        detail: undefined,
      },
    ]);

    expect(csv).toContain('"VAT201, period ""2026/10"""');
  });
});

describe('exportAuditPdf', () => {
  it('produces a valid PDF document', async () => {
    const bytes = await exportAuditPdf(buildAuditEntries(source));
    const header = String.fromCharCode(...bytes.slice(0, 4));

    expect(bytes).toBeInstanceOf(Uint8Array);
    expect(bytes.length).toBeGreaterThan(1000);
    expect(header).toBe('%PDF');
  });
});

describe('GovernanceLogView wiring', () => {
  it('renders the derived trail with filters and both exports', () => {
    const viewSrc = fs.readFileSync('src/components/govlog/GovernanceLogView.tsx', 'utf8');

    expect(viewSrc).toContain('buildAuditEntries');
    expect(viewSrc).toContain('downloadAuditCsv');
    expect(viewSrc).toContain('downloadAuditPdf');
    expect(viewSrc).toContain('Filter by client');
    expect(viewSrc).toContain('Filter by actor');
    expect(viewSrc).toContain('Filter by action');
    expect(viewSrc).toContain('Export CSV');
    expect(viewSrc).toContain('Export PDF');
  });

  it('leaves no SAICA audit pane behind in Settings', () => {
    const settingsSrc = fs.readFileSync('src/components/settings/SettingsView.tsx', 'utf8');
    const navSrc = fs.readFileSync('src/components/settings/settings-nav.ts', 'utf8');

    expect(settingsSrc).not.toContain('SaicaGovernanceLogPane');
    expect(settingsSrc).not.toContain('Moves to the Governance Log view');
    expect(navSrc).not.toContain('SETTINGS_AUDIT_NAV');
    expect(fs.existsSync('src/components/settings/panes/SaicaGovernanceLogPane.tsx')).toBe(false);
  });
});
