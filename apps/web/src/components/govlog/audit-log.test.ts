import fs from 'node:fs';
import { describe, expect, it } from 'vitest';
import {
  buildAuditEntries,
  buildClientAuditEntries,
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

  it('records a conversion as Client created from quote with the new client code', () => {
    const entries = buildAuditEntries({
      ...source,
      activity: [
        {
          id: 'activity-created',
          type: 'client',
          actorName: 'Erik',
          actorInitials: 'E',
          tint: 'crimson',
          text: 'Client created from quote: Kouga Fynbos Exports (Pty) Ltd',
          subline: 'KFE-100 · Q-9',
          at: '2026-11-07T09:00:00+02:00',
        },
      ],
    });

    const created = entries.find((entry) => entry.action === 'Client created from quote');
    expect(created).toBeDefined();
    expect(created!.clientCode).toBe('KFE-100');
    expect(created!.subject).toContain('Kouga Fynbos Exports');
    expect(created!.detail).toBe('Q-9');
  });

  it('records a permission change with the actor, action and role + permission detail', () => {
    const entries = buildAuditEntries({
      ...source,
      activity: [
        {
          id: 'activity-permission-1',
          type: 'permission',
          actorName: 'Erik',
          actorInitials: 'E',
          tint: 'amber',
          text: 'Changed permission — Manage permissions: Allowed',
          subline: 'Support Tech · Settings',
          at: '2026-11-08T10:00:00+02:00',
        },
      ],
    });

    const change = entries.find((entry) => entry.id === 'audit-activity-activity-permission-1');
    expect(change).toBeDefined();
    expect(change!.actorName).toBe('Erik');
    expect(change!.action).toBe('Changed permission');
    expect(change!.clientCode).toBeUndefined();
    expect(change!.detail).toContain('Support Tech');
    expect(change!.detail).toContain('Manage permissions');
  });

  it('resets permissions as its own action', () => {
    const entries = buildAuditEntries({
      ...source,
      activity: [
        {
          id: 'activity-permission-reset',
          type: 'permission',
          actorName: 'Wouter',
          actorInitials: 'W',
          tint: 'amber',
          text: 'Reset permissions to the default matrix',
          subline: 'Roles & Permissions · all roles',
          at: '2026-11-08T10:05:00+02:00',
        },
      ],
    });

    const reset = entries.find((entry) => entry.id === 'audit-activity-activity-permission-reset');
    expect(reset).toBeDefined();
    expect(reset!.action).toBe('Reset permissions');
    expect(reset!.detail).toContain('all roles');
  });

  it('resolves a quote stage change to the quoted client', () => {
    const entries = buildAuditEntries({
      ...source,
      activity: [
        {
          id: 'activity-quote-stage',
          type: 'quote',
          actorName: 'Erik',
          actorInitials: 'E',
          tint: 'crimson',
          text: 'Quote Q-9 moved to Quote Sent',
          subline: 'Kouga Fynbos Exports · R96,000 incl. 15% VAT',
          at: '2026-11-07T08:00:00+02:00',
        },
      ],
      quotes: [{ number: 'Q-9', clientCode: 'KFE-100' }],
    });

    const entry = entries.find((item) => item.id === 'audit-activity-activity-quote-stage');
    expect(entry).toBeDefined();
    expect(entry!.action).toBe('Quote stage changed');
    expect(entry!.clientCode).toBe('KFE-100');
    expect(entry!.detail).toContain('R96,000');
  });

  it('records invoice creation and resolves the billed client', () => {
    const entries = buildAuditEntries({
      ...source,
      activity: [
        {
          id: 'activity-invoice-created',
          type: 'invoice',
          actorName: 'Erik',
          actorInitials: 'E',
          tint: 'crimson',
          text: 'Invoice INV-1 created for Muse 1399',
          subline: 'R4,125 incl. 15% VAT',
          at: '2026-11-07T09:00:00+02:00',
        },
      ],
      invoices: [{ number: 'INV-1', clientCode: 'MUS-875' }],
    });

    const entry = entries.find((item) => item.id === 'audit-activity-activity-invoice-created');
    expect(entry).toBeDefined();
    expect(entry!.action).toBe('Invoice created');
    expect(entry!.clientCode).toBe('MUS-875');
  });

  it('keeps one row when a sign-off writes both an override and a submission event', () => {
    const entries = buildAuditEntries({
      ...source,
      activity: [
        {
          id: 'activity-submitted-afs',
          type: 'submission',
          taskId: 'MUS-875|AFS|2026',
          actorName: 'Erik',
          actorInitials: 'E',
          tint: 'crimson',
          text: 'Submitted AFS · FY 2026',
          subline: 'MUS-875 · Muse 1399',
          at: '2026-11-05T14:22:00+02:00',
        },
      ],
    });

    const submitted = entries.filter((entry) => entry.action === 'Submitted');
    expect(submitted).toHaveLength(1);
    expect(submitted[0].id).toBe('audit-override-MUS-875|AFS|2026');
    expect(submitted[0].subject).toBe('AFS · FY 2026');
    expect(submitted[0].detail).toContain('CIPC-AFS-2026-119');
  });

  it('records a non-gated submission that never reaches the partner gate', () => {
    const entries = buildAuditEntries({
      ...source,
      taskStatusOverrides: {
        'ALC-610|EMP201|2026-10': {
          status: 'Submitted',
          sarsReference: 'EMP201-2026-10-4471',
          service: 'EMP201',
          period: '2026/10',
          updatedAt: '2026-11-06T11:00:00+02:00',
        },
      },
      activity: [
        {
          id: 'activity-submitted-emp201',
          type: 'submission',
          taskId: 'ALC-610|EMP201|2026-10',
          actorName: 'Lungani',
          actorInitials: 'L',
          tint: 'crimson',
          text: 'Submitted EMP201 · 2026/10',
          subline: 'ALC-610 · A & L Contracting',
          at: '2026-11-06T11:00:00+02:00',
        },
      ],
    });

    const submitted = entries.find((entry) => entry.id === 'audit-activity-activity-submitted-emp201');
    expect(submitted).toBeDefined();
    expect(submitted!.action).toBe('Submitted');
    expect(submitted!.clientCode).toBe('ALC-610');
    expect(submitted!.subject).toBe('EMP201 · 2026/10');
    expect(submitted!.detail).toContain('EMP201-2026-10-4471');
    expect(entries.filter((entry) => entry.action === 'Submitted')).toHaveLength(1);
  });

  it('names quote and invoice events instead of the generic activity label', () => {
    const entries = buildAuditEntries({
      ...source,
      activity: [
        {
          id: 'activity-quote',
          type: 'quote',
          actorName: 'Erik',
          actorInitials: 'E',
          tint: 'crimson',
          text: 'Quote Q-9 moved to Active Client',
          subline: 'Kouga Fynbos Exports · R96,000 incl. 15% VAT',
          at: '2026-11-07T09:05:00+02:00',
        },
        {
          id: 'activity-invoice',
          type: 'invoice',
          actorName: 'Erik',
          actorInitials: 'E',
          tint: 'crimson',
          text: 'Invoice INV-1 sent to Muse 1399',
          subline: 'R4,125 incl. 15% VAT',
          at: '2026-11-07T09:10:00+02:00',
        },
      ],
    });

    expect(entries.find((entry) => entry.id === 'audit-activity-activity-quote')?.action).toBe(
      'Quote stage changed'
    );
    expect(entries.find((entry) => entry.id === 'audit-activity-activity-invoice')?.action).toBe(
      'Invoice sent'
    );
  });
});

describe('buildClientAuditEntries', () => {
  const mixedSource: AuditLogSource = {
    ...source,
    activity: [
      ...(source.activity ?? []),
      {
        id: 'activity-muse-time',
        type: 'time',
        actorName: 'Nikita',
        actorInitials: 'N',
        tint: 'muted',
        text: 'Logged 1.5h on AFS workpapers',
        subline: 'MUS-875 · AFS',
        at: '2026-11-04T10:00:00+02:00',
      },
      {
        id: 'activity-muse-invoice',
        type: 'invoice',
        actorName: 'Erik',
        actorInitials: 'E',
        tint: 'crimson',
        text: 'Invoice INV-1 sent to Muse 1399',
        subline: 'R4,125 incl. 15% VAT',
        at: '2026-11-04T11:00:00+02:00',
      },
      {
        id: 'activity-alc-time',
        type: 'time',
        actorName: 'Nikita',
        actorInitials: 'N',
        tint: 'muted',
        text: 'Logged 0.5h on VAT reconciliation',
        subline: 'ALC-610 · VAT201',
        at: '2026-11-04T12:00:00+02:00',
      },
    ],
    invoices: [{ number: 'INV-1', clientCode: 'MUS-875' }],
  };

  it('returns only the events that touch one client', () => {
    const entries = buildClientAuditEntries(mixedSource, 'MUS-875');

    expect(entries.length).toBeGreaterThan(0);
    expect(entries.every((entry) => entry.clientCode === 'MUS-875')).toBe(true);
    expect(entries.some((entry) => entry.action === 'Submitted')).toBe(true);
    expect(entries.some((entry) => entry.action === 'Time logged')).toBe(true);
    expect(entries.some((entry) => entry.action === 'Invoice sent')).toBe(true);
    expect(entries.some((entry) => entry.action === 'Partner sign-off')).toBe(false);
  });

  it('keeps the newest-first order and drops other clients', () => {
    const entries = buildClientAuditEntries(mixedSource, 'ALC-610');
    const stamps = entries.map((entry) => Date.parse(entry.at));

    expect(entries.every((entry) => entry.clientCode === 'ALC-610')).toBe(true);
    expect(stamps).toEqual([...stamps].sort((a, b) => b - a));
    expect(entries.some((entry) => entry.clientCode === 'MUS-875')).toBe(false);
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
