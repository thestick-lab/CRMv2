import { useMemo, useState } from 'react';
import { CLIENTS, GROUPS, STAFF } from '../data/seed';
import { SERVICE_TYPES } from '../domain/catalogue';
import { compareTasks, defaultServices, generateTasks } from '../domain/rules';
import type { EstimateInput } from '../domain/estimate';
import type { Client, Irp6Outcome, ServiceCode, StaffMember, Task, TaskStatus, TurnoverSource, VatCategory } from '../domain/types';

export interface ClientEdits {
  yearEndMonth?: number;
  provisionalTaxpayer?: boolean;
  incorporationDate?: string;
  employeeCount?: number;
  /** null = not registered (switched off) */
  vatCategory?: VatCategory | null;
  vatRegisteredOn?: string;
  payroll?: boolean;
  payrollFrom?: string;
  efilingProfile?: 'client' | 'firm';
  efilingTransferredOn?: string;
  turnover?: number;
  turnoverYear?: number;
  turnoverSource?: TurnoverSource;
  added?: ServiceCode[];
  removed?: ServiceCode[];
}

/** An estimate accepted by a new client or saved for an existing one. */
export interface SavedEstimate {
  average: number;
  annual: number;
  input: EstimateInput;
  savedOn: string;
}

export interface Model {
  asOf: string;
  clients: Client[];
  client: (code: string) => Client | undefined;
  servicesFor: (code: string) => ServiceCode[];
  tasks: Task[];
  tasksFor: (code: string) => Task[];
  status: (taskId: string) => TaskStatus;
  setStatus: (taskId: string, status: TaskStatus) => void;
  irp6: (taskId: string) => Irp6Outcome;
  setIrp6: (taskId: string, outcome: Irp6Outcome) => void;
  editClient: (code: string, patch: ClientEdits) => void;
  setService: (code: string, service: ServiceCode, on: boolean) => void;
  addClient: (client: Client, services: ServiceCode[], estimate: SavedEstimate) => void;
  /** Existing client: switch services to match the estimate and keep it as their estimated cost */
  saveEstimate: (code: string, services: ServiceCode[], estimate: SavedEstimate) => void;
  estimateFor: (code: string) => SavedEstimate | undefined;
  editCount: number;
  reset: () => void;
}

export const staffName = (id: string | undefined) => STAFF.find((s) => s.id === id)?.name ?? '—';
export const staffMember = (id: string | undefined): StaffMember | undefined => STAFF.find((s) => s.id === id);
export const groupName = (id: string | undefined) => GROUPS.find((g) => g.id === id)?.name;

const SERVICE_ORDER = SERVICE_TYPES.map((s) => s.code);

export function useModel(asOf: string): Model {
  const [statuses, setStatuses] = useState({} as Record<string, TaskStatus>);
  const [outcomes, setOutcomes] = useState({} as Record<string, Irp6Outcome>);
  const [edits, setEdits] = useState({} as Record<string, ClientEdits>);
  const [extra, setExtra] = useState([] as Client[]);
  const [estimates, setEstimates] = useState({} as Record<string, SavedEstimate>);

  const clients: Client[] = useMemo(
    () =>
      [...CLIENTS, ...extra].map((c) => {
        const e = edits[c.code];
        if (!e) return c;
        const next: Client = { ...c };
        if (e.yearEndMonth !== undefined) next.yearEndMonth = e.yearEndMonth;
        if (e.provisionalTaxpayer !== undefined) next.provisionalTaxpayer = e.provisionalTaxpayer;
        if (e.incorporationDate !== undefined) next.incorporationDate = e.incorporationDate || undefined;
        if (e.employeeCount !== undefined) next.employeeCount = Number.isFinite(e.employeeCount) ? e.employeeCount : undefined;
        if (e.yearEndMonth !== undefined) next.yearEndAssumed = false;
        if (e.vatCategory !== undefined) {
          next.vatCategory = e.vatCategory ?? undefined;
          next.vatRegisteredOn = e.vatCategory ? e.vatRegisteredOn || undefined : undefined;
        }
        if (e.payroll !== undefined) {
          next.payroll = e.payroll;
          next.payrollFrom = e.payroll ? e.payrollFrom || undefined : undefined;
        }
        if (e.efilingProfile !== undefined) {
          next.efilingProfile = e.efilingProfile;
          next.efilingTransferredOn = e.efilingTransferredOn;
        }
        if (e.turnover !== undefined) next.turnover = Number.isFinite(e.turnover) ? e.turnover : undefined;
        if (e.turnoverYear !== undefined) next.turnoverYear = e.turnoverYear;
        if (e.turnoverSource !== undefined) next.turnoverSource = e.turnoverSource;
        return next;
      }),
    [edits, extra],
  );

  const services = useMemo(() => {
    const map = new Map<string, ServiceCode[]>();
    for (const c of clients) {
      const e = edits[c.code] ?? {};
      const set = new Set<ServiceCode>(defaultServices(c));
      for (const s of e.added ?? []) set.add(s);
      for (const s of e.removed ?? []) set.delete(s);
      map.set(c.code, SERVICE_ORDER.filter((s) => set.has(s)));
    }
    return map;
  }, [clients, edits]);

  const tasks: Task[] = useMemo(
    () => clients.flatMap((c) => generateTasks(c, services.get(c.code) ?? [], asOf)).sort(compareTasks),
    [clients, services, asOf],
  );

  const byClient = useMemo(() => {
    const map = new Map<string, Task[]>();
    for (const t of tasks) {
      const list = map.get(t.clientCode) ?? [];
      list.push(t);
      map.set(t.clientCode, list);
    }
    return map;
  }, [tasks]);

  const editClient = (code: string, patch: ClientEdits) =>
    setEdits((prev: Record<string, ClientEdits>) => ({ ...prev, [code]: { ...prev[code], ...patch } }));

  return {
    asOf,
    clients,
    client: (code) => clients.find((c) => c.code === code),
    servicesFor: (code) => services.get(code) ?? [],
    tasks,
    tasksFor: (code) => byClient.get(code) ?? [],
    status: (id) => statuses[id] ?? 'Not started',
    setStatus: (id, s) => setStatuses((prev: Record<string, TaskStatus>) => ({ ...prev, [id]: s })),
    irp6: (id) => outcomes[id] ?? 'unknown',
    setIrp6: (id, o) => setOutcomes((prev: Record<string, Irp6Outcome>) => ({ ...prev, [id]: o })),
    editClient,
    setService: (code, service, on) => {
      const e: ClientEdits = edits[code] ?? {};
      const added = new Set<ServiceCode>(e.added ?? []);
      const removed = new Set<ServiceCode>(e.removed ?? []);
      if (on) {
        removed.delete(service);
        added.add(service);
      } else {
        added.delete(service);
        removed.add(service);
      }
      editClient(code, { added: [...added], removed: [...removed] });
    },
    addClient: (client, chosen, estimate) => {
      const defaults = defaultServices(client);
      setExtra((prev: Client[]) => [...prev, client]);
      setEstimates((prev: Record<string, SavedEstimate>) => ({ ...prev, [client.code]: estimate }));
      editClient(client.code, {
        added: chosen.filter((s) => !defaults.includes(s)),
        removed: defaults.filter((s) => !chosen.includes(s)),
      });
    },
    saveEstimate: (code, chosen, estimate) => {
      // Explicit lists, so profile changes saved at the same time cannot switch on a service that was left unticked.
      setEstimates((prev: Record<string, SavedEstimate>) => ({ ...prev, [code]: estimate }));
      editClient(code, { added: [...chosen], removed: SERVICE_ORDER.filter((s) => !chosen.includes(s)) });
    },
    estimateFor: (code) => estimates[code],
    editCount: Object.keys(statuses).length + Object.keys(outcomes).length + Object.keys(edits).length + extra.length + Object.keys(estimates).length,
    reset: () => {
      setStatuses({});
      setOutcomes({});
      setEdits({});
      setExtra([]);
      setEstimates({});
    },
  };
}
