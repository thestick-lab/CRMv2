import type { PipelineLead } from '@/context/PracticeStoreContext';

export const PIPELINE_STAGES = [
  { id: 'Lead', label: 'Lead', description: 'Inbound enquiry or referral' },
  { id: 'Discovery', label: 'Discovery', description: 'Diagnostic interview & scope' },
  { id: 'Estimate Sent', label: 'Estimate Sent', description: '12-Month proposal dispatched' },
  { id: 'KYC & Transfer', label: 'KYC & Transfer', description: 'CIPC BO register & eFiling transfer' },
  { id: 'Active Client', label: 'Active Client', description: 'Onboarded practice client' },
] as const;

export type PipelineStage = (typeof PIPELINE_STAGES)[number]['id'];

export interface StageMetrics {
  count: number;
  monthlyValue: number;
  turnover: number;
}

export interface PipelineMetrics {
  totalLeads: number;
  totalMonthlyValue: number;
  totalTurnover: number;
  byStage: Record<PipelineStage, StageMetrics>;
}

export function groupLeadsByStage(leads: PipelineLead[]): Record<PipelineStage, PipelineLead[]> {
  const result: Record<PipelineStage, PipelineLead[]> = {
    'Lead': [],
    'Discovery': [],
    'Estimate Sent': [],
    'KYC & Transfer': [],
    'Active Client': [],
  };

  for (const lead of leads) {
    if (result[lead.stage]) {
      result[lead.stage].push(lead);
    } else {
      result['Lead'].push(lead);
    }
  }

  return result;
}

export function computePipelineTotals(leads: PipelineLead[]): PipelineMetrics {
  const byStage: Record<PipelineStage, StageMetrics> = {
    'Lead': { count: 0, monthlyValue: 0, turnover: 0 },
    'Discovery': { count: 0, monthlyValue: 0, turnover: 0 },
    'Estimate Sent': { count: 0, monthlyValue: 0, turnover: 0 },
    'KYC & Transfer': { count: 0, monthlyValue: 0, turnover: 0 },
    'Active Client': { count: 0, monthlyValue: 0, turnover: 0 },
  };

  let totalMonthlyValue = 0;
  let totalTurnover = 0;

  for (const lead of leads) {
    const stage = byStage[lead.stage] ? lead.stage : 'Lead';
    byStage[stage].count += 1;
    byStage[stage].monthlyValue += lead.estimatedMonthlyFee;
    byStage[stage].turnover += lead.turnover;

    totalMonthlyValue += lead.estimatedMonthlyFee;
    totalTurnover += lead.turnover;
  }

  return {
    totalLeads: leads.length,
    totalMonthlyValue,
    totalTurnover,
    byStage,
  };
}

export function formatZar(amount: number): string {
  return new Intl.NumberFormat('en-ZA', {
    style: 'currency',
    currency: 'ZAR',
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatTurnover(amount: number): string {
  if (amount >= 1_000_000) {
    return `R ${(amount / 1_000_000).toFixed(1)}M`;
  }
  if (amount >= 1_000) {
    return `R ${(amount / 1_000).toFixed(0)}k`;
  }
  return `R ${amount}`;
}
