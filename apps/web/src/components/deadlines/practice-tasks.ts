import type { Client, ServiceCode, TaskStatus } from 'fdoncall-practice/domain/types';
import { STAFF } from 'fdoncall-practice/data/seed';
import { diffDays } from 'fdoncall-practice/domain/dates';
import { defaultServices, generateTasks, needsReview, urgency, type Urgency } from 'fdoncall-practice/domain/rules';

export interface PracticeTaskItem {
  id: string;
  clientCode: string;
  clientName: string;
  service: ServiceCode;
  period: string;
  part?: string;
  due?: string;
  dueNote?: string;
  statutory: boolean;
  needsPartnerReview: boolean;
  urgency: Urgency;
  status: TaskStatus;
  staffId: string;
  staffName: string;
  daysUntilDue?: number;
}

export interface PracticeKpi {
  overdue: number;
  due7Days: number;
  due30Days: number;
  missingDate: number;
}

export interface PracticeTaskSummary {
  tasks: PracticeTaskItem[];
  kpi: PracticeKpi;
}

export function aggregatePracticeTasks(clients: Client[], asOfDate: string): PracticeTaskSummary {
  const tasks: PracticeTaskItem[] = [];

  for (const client of clients) {
    const services = defaultServices(client);
    const clientTasks = generateTasks(client, services, asOfDate);

    const staff = STAFF.find((s) => s.id === client.staffId);
    const sub = client.subcontractorId ? STAFF.find((s) => s.id === client.subcontractorId) : undefined;
    const staffName = staff ? (sub ? `${staff.name} with ${sub.name}` : staff.name) : 'Practice Pool';

    for (const t of clientTasks) {
      let daysUntilDue: number | undefined = undefined;
      if (t.due) {
        daysUntilDue = diffDays(t.due, asOfDate);
      }

      tasks.push({
        id: `${client.code}-${t.id}`,
        clientCode: client.code,
        clientName: client.name,
        service: t.service,
        period: t.period,
        part: t.part,
        due: t.due,
        dueNote: t.dueNote,
        statutory: t.statutory,
        needsPartnerReview: Boolean(needsReview(t, true)),
        urgency: urgency(t, 'Not started', asOfDate),
        status: 'Not started',
        staffId: client.staffId,
        staffName,
        daysUntilDue,
      });
    }
  }

  // Calculate practice-wide KPI metrics
  let overdue = 0;
  let due7Days = 0;
  let due30Days = 0;
  let missingDate = 0;

  for (const t of tasks) {
    if (!t.due) {
      missingDate++;
    } else if (t.due < asOfDate) {
      overdue++;
    } else if (t.daysUntilDue !== undefined) {
      if (t.daysUntilDue <= 7) {
        due7Days++;
        due30Days++;
      } else if (t.daysUntilDue <= 30) {
        due30Days++;
      }
    }
  }

  return {
    tasks,
    kpi: {
      overdue,
      due7Days,
      due30Days,
      missingDate,
    },
  };
}

export interface TaskFilterOptions {
  horizon?: '30' | '90' | '365';
  staffId?: string;
  serviceCode?: string;
  asOfDate: string;
}

export function filterPracticeTasks(tasks: PracticeTaskItem[], options: TaskFilterOptions): PracticeTaskItem[] {
  const { horizon = '365', staffId, serviceCode, asOfDate } = options;

  return tasks.filter((t) => {
    // Staff filter
    if (staffId && staffId !== 'all' && t.staffId !== staffId) {
      return false;
    }

    // Service filter
    if (serviceCode && serviceCode !== 'all' && t.service !== serviceCode) {
      return false;
    }

    // Horizon filter
    if (horizon === '30') {
      if (!t.due) return true; // Keep missing date tasks as blockers
      if (t.due < asOfDate) return true; // Keep overdue
      return t.daysUntilDue !== undefined && t.daysUntilDue <= 30;
    }

    if (horizon === '90') {
      if (!t.due) return true;
      if (t.due < asOfDate) return true;
      return t.daysUntilDue !== undefined && t.daysUntilDue <= 90;
    }

    return true; // 365 days / all
  });
}
