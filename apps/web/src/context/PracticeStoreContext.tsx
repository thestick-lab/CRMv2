import * as React from 'react';
import { CLIENTS, STAFF } from 'fdoncall-practice/data/seed';
import type { Client, StaffMember } from 'fdoncall-practice/domain/types';

export interface PipelineLead {
  id: string;
  companyName: string;
  contactPerson: string;
  email: string;
  phone: string;
  stage: 'Lead' | 'Discovery' | 'Estimate Sent' | 'KYC & Transfer' | 'Active Client';
  turnover: number;
  estimatedMonthlyFee: number;
  partnerId: string;
  notes?: string;
}

export interface PracticeUser {
  id: string;
  name: string;
  role: 'Partner' | 'Compliance Officer' | 'Accountant' | 'Team member' | 'Subcontractor';
  email: string;
  kind: 'employee' | 'subcontractor';
}

export interface PracticeRates {
  standardHourlyRate: number;
  marchEscalationPct: number;
}

export interface AiApiKeys {
  anthropic?: string;
  openai?: string;
  gemini?: string;
}

export interface TaskStatusOverride {
  status: string;
  sarsReference?: string;
  partnerSignOff?: boolean;
  submissionDate?: string;
  updatedAt?: string;
}

export type Division = 'fd-on-call' | 'accountant-on-call';

export interface PracticeState {
  clients: Client[];
  staff: StaffMember[];
  leads: PipelineLead[];
  currentUser: PracticeUser;
  rates: PracticeRates;
  aiKeys: AiApiKeys;
  division: Division;
  taskStatusOverrides: Record<string, TaskStatusOverride>;
}

export const INITIAL_LEADS: PipelineLead[] = [
  {
    id: 'lead-1',
    companyName: 'Cape Agulhas Distillers (Pty) Ltd',
    contactPerson: 'Francois Marais',
    email: 'francois@capeagulhas.co.za',
    phone: '+27 21 887 4100',
    stage: 'Lead',
    turnover: 6500000,
    estimatedMonthlyFee: 6500,
    partnerId: 'erik',
    notes: 'Craft distillery expansion into retail Western Cape market',
  },
  {
    id: 'lead-2',
    companyName: 'Kouga Wind Farm Holdings',
    contactPerson: 'Lize van der Merwe',
    email: 'lize@kougawind.co.za',
    phone: '+27 42 291 3000',
    stage: 'Discovery',
    turnover: 24000000,
    estimatedMonthlyFee: 14200,
    partnerId: 'wouter',
    notes: 'Section 12B renewable energy tax review and CIPC beneficial ownership',
  },
  {
    id: 'lead-3',
    companyName: 'Stellenbosch BioTech Labs',
    contactPerson: 'Dr. Henk Pretorius',
    email: 'henk@stellenbiotech.com',
    phone: '+27 21 808 9111',
    stage: 'Estimate Sent',
    turnover: 12000000,
    estimatedMonthlyFee: 9800,
    partnerId: 'erik',
    notes: '12-month fee proposal sent with Section 11D R&D advisory',
  },
  {
    id: 'lead-4',
    companyName: 'Table Bay Logistics CC',
    contactPerson: 'Yusuf Patel',
    email: 'yusuf@tablebaylogistics.co.za',
    phone: '+27 21 448 2000',
    stage: 'KYC & Transfer',
    turnover: 8500000,
    estimatedMonthlyFee: 7200,
    partnerId: 'erik',
    notes: 'SARS eFiling profile transfer and Documenso SLA signing',
  },
];

export const INITIAL_USER: PracticeUser = {
  id: 'erik',
  name: 'Erik',
  role: 'Partner',
  email: 'erik@fdoncall.co.za',
  kind: 'employee',
};

export const INITIAL_RATES: PracticeRates = {
  standardHourlyRate: 625,
  marchEscalationPct: 6,
};

export const INITIAL_AI_KEYS: AiApiKeys = {
  anthropic: '',
  openai: '',
  gemini: '',
};

export const STORAGE_KEY = 'crmv2_practice_state';

export function getInitialPracticeState(): PracticeState {
  return {
    clients: [...CLIENTS],
    staff: [...STAFF],
    leads: [...INITIAL_LEADS],
    currentUser: { ...INITIAL_USER },
    rates: { ...INITIAL_RATES },
    aiKeys: { ...INITIAL_AI_KEYS },
    division: 'fd-on-call',
    taskStatusOverrides: {},
  };
}

export type PracticeAction =
  | { type: 'CONVERT_LEAD'; payload: { leadId: string; clientData?: Partial<Client> } }
  | { type: 'ADD_CLIENT'; payload: Client }
  | { type: 'UPDATE_CLIENT'; payload: { clientCode: string; patch: Partial<Client> } }
  | {
      type: 'UPDATE_TASK_STATUS';
      payload: {
        taskId: string;
        status: string;
        metadata?: {
          sarsReference?: string;
          partnerSignOff?: boolean;
          submissionDate?: string;
        };
      };
    }
  | {
      type: 'INVITE_TEAM_MEMBER';
      payload: {
        name: string;
        email: string;
        role: 'Partner' | 'Compliance Officer' | 'Accountant' | 'Team member' | 'Subcontractor';
        kind?: 'employee' | 'subcontractor';
      };
    }
  | { type: 'UPDATE_STAFF_ROLE'; payload: { staffId: string; role: string } }
  | { type: 'UPDATE_RATES'; payload: Partial<PracticeRates> }
  | { type: 'SET_CURRENT_USER'; payload: PracticeUser | string }
  | { type: 'SET_DIVISION'; payload: Division }
  | { type: 'SET_AI_KEYS'; payload: Partial<AiApiKeys> }
  | { type: 'ADD_LEAD'; payload: Omit<PipelineLead, 'id'> }
  | { type: 'UPDATE_LEAD_STAGE'; payload: { leadId: string; stage: PipelineLead['stage'] } }
  | { type: 'RESET_DATA' }
  | { type: 'LOAD_STATE'; payload: PracticeState };

function generateCodeForName(name: string, existingClients: Client[]): string {
  const words = name.replace(/[^a-zA-Z0-9 ]/g, '').trim().split(/\s+/);
  let prefix = 'NEW';
  if (words.length >= 3) {
    prefix = (words[0][0] + words[1][0] + words[2][0]).toUpperCase();
  } else if (words.length === 2) {
    prefix = (words[0].substring(0, 2) + words[1][0]).toUpperCase();
  } else if (words.length === 1 && words[0].length >= 3) {
    prefix = words[0].substring(0, 3).toUpperCase();
  }

  // Ensure prefix is 3 chars
  if (prefix.length < 3) {
    prefix = (prefix + 'XXX').substring(0, 3);
  }

  let codeNumber = 100;
  let code = `${prefix}-${codeNumber}`;
  const existingCodes = new Set(existingClients.map((c) => c.code));

  while (existingCodes.has(code)) {
    codeNumber++;
    code = `${prefix}-${codeNumber}`;
  }

  return code;
}

export function practiceReducer(state: PracticeState, action: PracticeAction): PracticeState {
  switch (action.type) {
    case 'CONVERT_LEAD': {
      const { leadId, clientData } = action.payload;
      const lead = state.leads.find((l) => l.id === leadId);
      if (!lead) return state;

      const newCode = generateCodeForName(lead.companyName, state.clients);
      const newClient: Client = {
        code: newCode,
        name: lead.companyName,
        entityType: 'Company',
        efilingProfile: 'client',
        staffId: lead.partnerId || 'erik',
        payroll: false,
        status: 'Active',
        yearEndAssumed: true,
        yearEndMonth: 2,
        taxElsewhere: false,
        lastAfsYear: 2026,
        lastIncomeTaxYear: 2026,
        lastAnnualReturnYear: 2025,
        beneficialOwnershipFiled: true,
        ...clientData,
      };

      const updatedLeads = state.leads.map((l) =>
        l.id === leadId ? { ...l, stage: 'Active Client' as const } : l
      );

      return {
        ...state,
        clients: [...state.clients, newClient],
        leads: updatedLeads,
      };
    }
    case 'UPDATE_CLIENT': {
      return {
        ...state,
        clients: state.clients.map((c) =>
          c.code === action.payload.clientCode ? { ...c, ...action.payload.patch } : c
        ),
      };
    }


    case 'ADD_CLIENT': {
      if (state.clients.some((c) => c.code === action.payload.code)) {
        return state;
      }
      return {
        ...state,
        clients: [...state.clients, action.payload],
      };
    }

    case 'UPDATE_TASK_STATUS': {
      const { taskId, status, metadata } = action.payload;
      const existing = state.taskStatusOverrides[taskId] || {};
      const updated: TaskStatusOverride = {
        ...existing,
        status,
        ...metadata,
        updatedAt: new Date().toISOString(),
      };

      return {
        ...state,
        taskStatusOverrides: {
          ...state.taskStatusOverrides,
          [taskId]: updated,
        },
      };
    }

    case 'INVITE_TEAM_MEMBER': {
      const id = action.payload.name.toLowerCase().replace(/[^a-z0-9]/g, '-').slice(0, 16);
      const newStaff: StaffMember = {
        id,
        name: action.payload.name,
        role: action.payload.role,
        kind: action.payload.kind || 'employee',
      };
      return {
        ...state,
        staff: [...state.staff, newStaff],
      };
    }

    case 'UPDATE_STAFF_ROLE': {
      return {
        ...state,
        staff: state.staff.map((s) =>
          s.id === action.payload.staffId ? { ...s, role: action.payload.role } : s
        ),
      };
    }

    case 'UPDATE_RATES': {
      return {
        ...state,
        rates: {
          ...state.rates,
          ...action.payload,
        },
      };
    }

    case 'SET_CURRENT_USER': {
      if (typeof action.payload === 'string') {
        const found = state.staff.find((s) => s.id === action.payload);
        if (found) {
          return {
            ...state,
            currentUser: {
              id: found.id,
              name: found.name,
              role: (found.role as PracticeUser['role']) || 'Team member',
              email: `${found.id}@fdoncall.co.za`,
              kind: found.kind,
            },
          };
        }
        return state;
      }
      return {
        ...state,
        currentUser: action.payload,
      };
    }

    case 'SET_DIVISION': {
      return {
        ...state,
        division: action.payload,
      };
    }

    case 'SET_AI_KEYS': {
      return {
        ...state,
        aiKeys: {
          ...state.aiKeys,
          ...action.payload,
        },
      };
    }

    case 'ADD_LEAD': {
      const id = `lead-${Date.now()}`;
      return {
        ...state,
        leads: [...state.leads, { ...action.payload, id }],
      };
    }

    case 'UPDATE_LEAD_STAGE': {
      return {
        ...state,
        leads: state.leads.map((l) =>
          l.id === action.payload.leadId ? { ...l, stage: action.payload.stage } : l
        ),
      };
    }

    case 'RESET_DATA': {
      return getInitialPracticeState();
    }

    case 'LOAD_STATE': {
      return action.payload;
    }

    default:
      return state;
  }
}

export function loadPracticeState(): PracticeState {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved) {
        return JSON.parse(saved);
      }
    } catch (e) {
      console.error('Failed to load practice state from localStorage', e);
    }
  }
  return getInitialPracticeState();
}

export function savePracticeState(state: PracticeState): void {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
    } catch (e) {
      console.error('Failed to save practice state to localStorage', e);
    }
  }
}

export interface PracticeStoreContextValue extends PracticeState {
  addClient: (client: Client) => void;
  updateClient: (clientCode: string, patch: Partial<Client>) => void;
  convertLead: (leadId: string, clientData?: Partial<Client>) => Client | undefined;
  updateTaskStatus: (
    taskId: string,
    status: string,
    metadata?: { sarsReference?: string; partnerSignOff?: boolean; submissionDate?: string }
  ) => void;
  inviteTeamMember: (member: {
    name: string;
    email: string;
    role: 'Partner' | 'Compliance Officer' | 'Accountant' | 'Team member' | 'Subcontractor';
    kind?: 'employee' | 'subcontractor';
  }) => void;
  updateStaffRole: (staffId: string, role: string) => void;
  updateRates: (rates: Partial<PracticeRates>) => void;
  setCurrentUser: (user: PracticeUser | string) => void;
  setDivision: (division: Division) => void;
  setAiKeys: (keys: Partial<AiApiKeys>) => void;
  addLead: (lead: Omit<PipelineLead, 'id'>) => void;
  updateLeadStage: (leadId: string, stage: PipelineLead['stage']) => void;
  exportData: () => PracticeState;
  resetData: () => void;
}

const PracticeStoreContext = React.createContext<PracticeStoreContextValue | null>(null);

export function PracticeStoreProvider({ children }: { children: React.ReactNode }) {
  const [state, dispatch] = React.useReducer(practiceReducer, null, loadPracticeState);

  // Sync to localStorage on state changes
  React.useEffect(() => {
    savePracticeState(state);
  }, [state]);

  const addClient = React.useCallback((client: Client) => {
    dispatch({ type: 'ADD_CLIENT', payload: client });
  }, []);

  const convertLead = React.useCallback(
    (leadId: string, clientData?: Partial<Client>) => {
      const targetLead = state.leads.find((l) => l.id === leadId);
      if (!targetLead) return undefined;
      dispatch({ type: 'CONVERT_LEAD', payload: { leadId, clientData } });
      const code = generateCodeForName(targetLead.companyName, state.clients);
      const created: Client = {
        code,
        name: targetLead.companyName,
        entityType: 'Company',
        efilingProfile: 'client',
        staffId: targetLead.partnerId || 'erik',
        payroll: false,
        status: 'Active',
        yearEndAssumed: true,
        yearEndMonth: 2,
        taxElsewhere: false,
        lastAfsYear: 2026,
        lastIncomeTaxYear: 2026,
        lastAnnualReturnYear: 2025,
        beneficialOwnershipFiled: true,
        ...clientData,
      };
      return created;
    },
    [state.leads, state.clients]
  );

  const updateTaskStatus = React.useCallback(
    (
      taskId: string,
      status: string,
      metadata?: { sarsReference?: string; partnerSignOff?: boolean; submissionDate?: string }
    ) => {
      dispatch({ type: 'UPDATE_TASK_STATUS', payload: { taskId, status, metadata } });
    },
    []
  );

  const inviteTeamMember = React.useCallback(
    (member: {
      name: string;
      email: string;
      role: 'Partner' | 'Compliance Officer' | 'Accountant' | 'Team member' | 'Subcontractor';
      kind?: 'employee' | 'subcontractor';
    }) => {
      dispatch({ type: 'INVITE_TEAM_MEMBER', payload: member });
    },
    []
  );

  const updateStaffRole = React.useCallback((staffId: string, role: string) => {
    dispatch({ type: 'UPDATE_STAFF_ROLE', payload: { staffId, role } });
  }, []);

  const updateRates = React.useCallback((rates: Partial<PracticeRates>) => {
    dispatch({ type: 'UPDATE_RATES', payload: rates });
  }, []);

  const setCurrentUser = React.useCallback((user: PracticeUser | string) => {
    dispatch({ type: 'SET_CURRENT_USER', payload: user });
  }, []);

  const setDivision = React.useCallback((division: Division) => {
    dispatch({ type: 'SET_DIVISION', payload: division });
  }, []);

  const setAiKeys = React.useCallback((keys: Partial<AiApiKeys>) => {
    dispatch({ type: 'SET_AI_KEYS', payload: keys });
  }, []);

  const addLead = React.useCallback((lead: Omit<PipelineLead, 'id'>) => {
    dispatch({ type: 'ADD_LEAD', payload: lead });
  }, []);

  const updateLeadStage = React.useCallback((leadId: string, stage: PipelineLead['stage']) => {
    dispatch({ type: 'UPDATE_LEAD_STAGE', payload: { leadId, stage } });
  }, []);

  const exportData = React.useCallback(() => {
    return state;
  }, [state]);

  const resetData = React.useCallback(() => {
    if (typeof window !== 'undefined' && window.localStorage) {
      window.localStorage.removeItem(STORAGE_KEY);
    }
    dispatch({ type: 'RESET_DATA' });
  }, []);
  const updateClient = React.useCallback((clientCode: string, patch: Partial<Client>) => {
    dispatch({ type: 'UPDATE_CLIENT', payload: { clientCode, patch } });
  }, []);


  const value = React.useMemo<PracticeStoreContextValue>(
    () => ({
      ...state,
      addClient,
      updateClient,
      convertLead,
      updateTaskStatus,
      inviteTeamMember,
      updateStaffRole,
      updateRates,
      setCurrentUser,
      setDivision,
      setAiKeys,
      addLead,
      updateLeadStage,
      exportData,
      resetData,
    }),
    [
      state,
      addClient,
      updateClient,
      convertLead,
      updateTaskStatus,
      inviteTeamMember,
      updateStaffRole,
      updateRates,
      setCurrentUser,
      setDivision,
      setAiKeys,
      addLead,
      updateLeadStage,
      exportData,
      resetData,
    ]
  );

  return <PracticeStoreContext.Provider value={value}>{children}</PracticeStoreContext.Provider>;
}

export function usePracticeStore(): PracticeStoreContextValue {
  const context = React.useContext(PracticeStoreContext);
  if (!context) {
    throw new Error('usePracticeStore must be used within a PracticeStoreProvider');
  }
  return context;
}
