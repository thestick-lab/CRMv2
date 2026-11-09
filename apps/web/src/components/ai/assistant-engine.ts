import type { PracticeState } from '@/context/PracticeStoreContext';
import { computeEstimate } from 'fdoncall-practice/domain/estimate';
import { can, type PermissionState, type Role } from '@/lib/permissions';

/**
 * The assistant answers from practice-wide data (clients, rates, quotes, the
 * team register), so it is gated on a data grant: `Clients — view` or
 * `Deadlines — view`. Support Tech and a Limited Subcontractor hold neither
 * unconditionally, and the trigger never renders for them.
 */
export function canUseAssistant(
  role: Role,
  matrix?: PermissionState['matrix']
): boolean {
  return can(role, 'Clients', 'view', matrix) || can(role, 'Deadlines', 'view', matrix);
}

/**
 * The state slice the engine may read. A role with the full client grant sees
 * the practice as-is; anything else gets an empty register, pipeline and team
 * so no scoped-out record can be queried through a prompt.
 */
export function scopeAssistantState(
  state: PracticeState,
  role: Role,
  matrix?: PermissionState['matrix']
): PracticeState {
  if (can(role, 'Clients', 'view', matrix)) return state;
  return {
    ...state,
    clients: [],
    quotes: [],
    invoices: [],
    timeEntries: [],
    staff: [],
    rates: { ...state.rates, standardHourlyRate: 0, serviceFees: {} },
  };
}

export function answerPracticeAssistantQuery(query: string, state: PracticeState): string {
  const q = query.trim().toLowerCase();

  // 1. Practice Clients
  if (q.includes('client') || q.includes('how many client') || q.includes('companies')) {
    const total = state.clients.length;
    const ptyLtd = state.clients.filter((c) => c.entityType === 'Company').length;
    const cc = state.clients.filter((c) => c.entityType === 'Close corporation').length;
    const trusts = state.clients.filter((c) => c.entityType === 'Trust').length;
    const indiv = state.clients.filter((c) => c.entityType === 'Individual').length;

    return `FD on Call manages **${total} active clients** across the Western Cape:\n- **${ptyLtd}** Private Companies (Pty Ltd)\n- **${cc}** Close Corporations (CC)\n- **${trusts}** Inter Vivos Trusts\n- **${indiv}** High-Net-Worth Individuals\n\nAll accounts are synchronized with CIPC Annual Returns and SARS eFiling profiles.`;
  }

  // 2. Practice Rates & Escalation
  if (q.includes('rate') || q.includes('hourly') || q.includes('fee') || q.includes('escalat')) {
    return `Our standard practice billing rate is **R ${state.rates.standardHourlyRate} excl. VAT/hour**, with a standard **${state.rates.marchEscalationPct}% annual escalation** applied on 1 March aligned with the South African tax year.`;
  }

  // 3. Partners & Team
  if (q.includes('partner') || q.includes('who are the partner') || q.includes('team') || q.includes('staff')) {
    const partners = state.staff.filter((s) => s.role === 'Partner').map((s) => s.name);
    const total = state.staff.length;
    return `FD on Call has **${total} team members**. The engagement partners are **${partners.join(' and ')}** (CA(SA)), based at our Durbanville, Cape Town practice.`;
  }

  // 4. Sales Pipeline — open fee quotes
  if (q.includes('lead') || q.includes('prospect') || q.includes('pipeline') || q.includes('quote') || q.includes('onboarding')) {
    const openQuotes = state.quotes.filter(
      (quote) => quote.stage !== 'Closed Lost' && quote.stage !== 'Active Client'
    );
    const monthlyTotal = openQuotes.reduce(
      (sum, quote) => sum + computeEstimate(quote.estimateInput).average,
      0
    );
    const zarFormatted = new Intl.NumberFormat('en-ZA', { style: 'currency', currency: 'ZAR', maximumFractionDigits: 0 }).format(monthlyTotal);
    return `Our sales pipeline currently tracks **${openQuotes.length} open quotes** worth **${zarFormatted} / month** (R ${Math.round(monthlyTotal * 12).toLocaleString()} annual run-rate).`;
  }

  // 5. Public Holidays & Deadlines
  if (q.includes('holiday') || q.includes('easter') || q.includes('good friday') || q.includes('sars deadline')) {
    return `South African statutory compliance deadlines automatically roll back to the preceding business day when falling on a weekend or public holiday (Public Holidays Act 36 of 1994 & SARS s25 TAA). For example, Good Friday in 2026 is on **2026-04-03** and Family Day is on **2026-04-06**.`;
  }

  // Fallback Practice Assistant response
  return `I am your **FD on Call Practice Copilot**. I can assist you with:\n- Statutory SARS filing dates & Computus holiday rollbacks\n- Client portfolio summaries (${state.clients.length} active clients)\n- Billing rates (R ${state.rates.standardHourlyRate}/hr, ${state.rates.marchEscalationPct}% March escalation)\n- Open quotes & retainer run-rates\n\nHow can I help you manage your practice today?`;
}
