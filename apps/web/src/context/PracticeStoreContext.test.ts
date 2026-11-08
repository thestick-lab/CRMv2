import { describe, expect, it, beforeEach } from 'vitest';
import {
  getInitialPracticeState,
  practiceReducer,
  loadPracticeState,
  savePracticeState,
  STORAGE_KEY,
  type PracticeState,
} from './PracticeStoreContext';

describe('PracticeStore state initialization and persistence', () => {
  beforeEach(() => {
    if (typeof localStorage !== 'undefined') {
      localStorage.clear();
    }
  });

  it('hydrates with 13 clients, 9 staff, default pipeline leads, and default rates', () => {
    const state = getInitialPracticeState();
    expect(state.clients).toHaveLength(13);
    expect(state.staff).toHaveLength(9);
    expect(state.leads.length).toBeGreaterThanOrEqual(4);
    expect(state.currentUser.name).toBe('Erik');
    expect(state.currentUser.role).toBe('Partner');
    expect(state.rates.standardHourlyRate).toBe(625);
    expect(state.rates.marchEscalationPct).toBe(6);
    expect(state.division).toBe('fd-on-call');
  });

  it('converts a pipeline lead to an active practice client', () => {
    const state = getInitialPracticeState();
    const lead = state.leads[0];
    expect(lead).toBeDefined();

    const nextState = practiceReducer(state, {
      type: 'CONVERT_LEAD',
      payload: { leadId: lead.id },
    });

    // Client count should increase from 13 to 14
    expect(nextState.clients).toHaveLength(14);
    const convertedClient = nextState.clients.find((c) => c.name === lead.companyName);
    expect(convertedClient).toBeDefined();
    expect(convertedClient?.status).toBe('Active');
    expect(convertedClient?.code).toMatch(/^[A-Z]{3}-\d{3}$/);

    // Lead stage should be Active Client
    const updatedLead = nextState.leads.find((l) => l.id === lead.id);
    expect(updatedLead?.stage).toBe('Active Client');
  });

  it('updates task status with SARS reference and partner sign-off', () => {
    const state = getInitialPracticeState();
    const nextState = practiceReducer(state, {
      type: 'UPDATE_TASK_STATUS',
      payload: {
        taskId: 'ALC-610-IRP6-1',
        status: 'Submitted',
        metadata: {
          sarsReference: 'SARS-99887711',
          partnerSignOff: true,
          submissionDate: '2026-11-08',
        },
      },
    });

    const override = nextState.taskStatusOverrides['ALC-610-IRP6-1'];
    expect(override).toBeDefined();
    expect(override.status).toBe('Submitted');
    expect(override.sarsReference).toBe('SARS-99887711');
    expect(override.partnerSignOff).toBe(true);
  });

  it('invites a new team member with RBAC role', () => {
    const state = getInitialPracticeState();
    const nextState = practiceReducer(state, {
      type: 'INVITE_TEAM_MEMBER',
      payload: {
        name: 'Chrizelle Visser',
        email: 'chrizelle@fdoncall.co.za',
        role: 'Compliance Officer',
        kind: 'employee',
      },
    });

    expect(nextState.staff).toHaveLength(10);
    const invited = nextState.staff.find((s) => s.name === 'Chrizelle Visser');
    expect(invited).toBeDefined();
    expect(invited?.role).toBe('Compliance Officer');
  });

  it('updates practice rates in state', () => {
    const state = getInitialPracticeState();
    const nextState = practiceReducer(state, {
      type: 'UPDATE_RATES',
      payload: { standardHourlyRate: 750, marchEscalationPct: 7.5 },
    });

    expect(nextState.rates.standardHourlyRate).toBe(750);
    expect(nextState.rates.marchEscalationPct).toBe(7.5);
  });

  it('updates division between fd-on-call and accountant-on-call', () => {
    const state = getInitialPracticeState();
    const nextState = practiceReducer(state, {
      type: 'SET_DIVISION',
      payload: 'accountant-on-call',
    });

    expect(nextState.division).toBe('accountant-on-call');
  });

  it('updates AI provider keys', () => {
    const state = getInitialPracticeState();
    const nextState = practiceReducer(state, {
      type: 'SET_AI_KEYS',
      payload: { anthropic: 'sk-ant-test', openai: 'sk-test' },
    });

    expect(nextState.aiKeys.anthropic).toBe('sk-ant-test');
    expect(nextState.aiKeys.openai).toBe('sk-test');
  });

  it('resets practice state to initial pristine defaults', () => {
    const state = getInitialPracticeState();
    const modified = practiceReducer(state, {
      type: 'UPDATE_RATES',
      payload: { standardHourlyRate: 999 },
    });
    expect(modified.rates.standardHourlyRate).toBe(999);

    const resetState = practiceReducer(modified, { type: 'RESET_DATA' });
    expect(resetState.rates.standardHourlyRate).toBe(625);
    expect(resetState.clients).toHaveLength(13);
  });
});
