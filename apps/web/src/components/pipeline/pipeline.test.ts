import { describe, expect, it } from 'vitest';
import {
  PIPELINE_STAGES,
  computePipelineTotals,
  groupLeadsByStage,
} from './pipeline-data';
import { INITIAL_LEADS } from '@/context/PracticeStoreContext';

describe('Onboarding Pipeline data helpers and stage calculations', () => {
  it('defines the 5 statutory onboarding stages in exact sequence', () => {
    expect(PIPELINE_STAGES).toHaveLength(5);
    const stageIds = PIPELINE_STAGES.map((s) => s.id);
    expect(stageIds).toEqual([
      'Lead',
      'Discovery',
      'Estimate Sent',
      'KYC & Transfer',
      'Active Client',
    ]);
  });

  it('groups leads by stage correctly', () => {
    const grouped = groupLeadsByStage(INITIAL_LEADS);
    expect(grouped['Lead']).toHaveLength(1);
    expect(grouped['Discovery']).toHaveLength(1);
    expect(grouped['Estimate Sent']).toHaveLength(1);
    expect(grouped['KYC & Transfer']).toHaveLength(1);
    expect(grouped['Active Client']).toHaveLength(0);
  });

  it('computes pipeline value totals and metrics', () => {
    const metrics = computePipelineTotals(INITIAL_LEADS);
    expect(metrics.totalLeads).toBe(4);
    expect(metrics.totalTurnover).toBe(51000000); // 6.5M + 24M + 12M + 8.5M
    expect(metrics.totalMonthlyValue).toBe(37700); // 6500 + 14200 + 9800 + 7200

    expect(metrics.byStage['Lead'].count).toBe(1);
    expect(metrics.byStage['Lead'].monthlyValue).toBe(6500);

    expect(metrics.byStage['Discovery'].count).toBe(1);
    expect(metrics.byStage['Discovery'].monthlyValue).toBe(14200);
  });
});
