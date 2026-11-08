import * as React from 'react';
import type { Client, EntityType, VatCategory } from 'fdoncall-practice/domain/types';
import {
  computeEstimate,
  type Estimate,
  type EstimateInput,
  type EstimateKey,
} from 'fdoncall-practice/domain/estimate';
import { MONTHS, MONTHS_LONG, todayInSouthAfrica } from 'fdoncall-practice/domain/dates';
import { usePracticeStore } from '@/context/PracticeStoreContext';
import { downloadPdfQuote, downloadExcelQuote } from '@/lib/export-actions';
import { DocumensoDispatchDialog } from '@/components/integrations/DocumensoDispatchDialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Calculator,
  Download,
  FileSpreadsheet,
  Send,
  Save,
  Check,
  Building2,
  Calendar,
  DollarSign,
  TrendingUp,
} from 'lucide-react';
import { cn } from '@/lib/utils';

export function EstimateCalculator() {
  const { clients, staff, rates, updateClient } = usePracticeStore();
  const [selectedClientCode, setSelectedClientCode] = React.useState<string>('new');
  const [documensoOpen, setDocumensoOpen] = React.useState(false);
  const [saveSuccess, setSaveSuccess] = React.useState(false);

  // Form Inputs
  const [name, setName] = React.useState('New Prospect Venture (Pty) Ltd');
  const [entityType, setEntityType] = React.useState<EntityType>('Company');
  const [yearEndMonth, setYearEndMonth] = React.useState(2);
  const [turnover, setTurnover] = React.useState(4000000);
  const [vatCategory, setVatCategory] = React.useState<VatCategory | undefined>('B');
  const [payroll, setPayroll] = React.useState(true);
  const [employeeCount, setEmployeeCount] = React.useState(8);
  const [provisionalTaxpayer, setProvisionalTaxpayer] = React.useState(true);
  const [directors, setDirectors] = React.useState(1);
  const [staffId, setStaffId] = React.useState('erik');
  const [startMonth, setStartMonth] = React.useState('2026-12');

  // Services Hours & Toggles
  const [bookkeepingHours, setBookkeepingHours] = React.useState(4);
  const [payrollHours, setPayrollHours] = React.useState(0.75);
  const [mgmtHours, setMgmtHours] = React.useState(0);
  const [afsHours, setAfsHours] = React.useState(16);
  const [reviewHours, setReviewHours] = React.useState(0);
  const [afsMonth, setAfsMonth] = React.useState(8);
  const [itrMonth, setItrMonth] = React.useState(9);
  const [cipcMonth, setCipcMonth] = React.useState(8);
  const [xeroPlan, setXeroPlan] = React.useState<'Starter' | 'Standard' | 'Premium'>('Standard');
  const [simplePayFee, setSimplePayFee] = React.useState(235.5);

  // Selected Services
  const [selected, setSelected] = React.useState<Partial<Record<EstimateKey, boolean>>>({
    BOOKKEEPING: true,
    PAYROLL: true,
    MGMT: false,
    VAT201: true,
    EMP201: true,
    EMP501: true,
    IRP6: true,
    COIDA: false,
    AFS: true,
    REVIEW: false,
    ITR: true,
    DIR_ITR12: false,
    DIR_IRP6: false,
    CIPC_AR: true,
    BO: true,
    XERO: true,
    SIMPLEPAY: true,
  });

  // When picking an existing client, populate form
  const handleClientChange = (code: string) => {
    setSelectedClientCode(code);
    if (code === 'new') {
      setName('New Prospect Venture (Pty) Ltd');
      setEntityType('Company');
      setYearEndMonth(2);
      setTurnover(4000000);
      setVatCategory('B');
      setPayroll(true);
      setEmployeeCount(8);
      return;
    }

    const c = clients.find((item) => item.code === code);
    if (c) {
      setName(c.name);
      setEntityType(c.entityType);
      setYearEndMonth(c.yearEndMonth);
      setTurnover(c.turnover || 4000000);
      setVatCategory(c.vatCategory);
      setPayroll(Boolean(c.payroll));
      setEmployeeCount(c.employeeCount || 8);
      setStaffId(c.staffId);
    }
  };

  const xeroFee = xeroPlan === 'Starter' ? 391.3 : xeroPlan === 'Standard' ? 691.3 : 952.17;

  // Compute live estimate
  const estimateResult = React.useMemo<Estimate>(() => {
    const input: EstimateInput = {
      startMonth,
      entityType,
      yearEndMonth,
      vatCategory,
      turnover,
      payroll,
      employeeCount,
      provisionalTaxpayer,
      directors,
      rate: rates.standardHourlyRate,
      marchIncreasePct: rates.marchEscalationPct,
      irp6Payable: true,
      selected,
      hours: {
        BOOKKEEPING: bookkeepingHours,
        PAYROLL: payrollHours,
        MGMT: mgmtHours,
        AFS: afsHours,
        REVIEW: reviewHours,
      },
      months: {
        AFS: afsMonth,
        ITR: itrMonth,
        CIPC_AR: cipcMonth,
      },
      recharges: {
        XERO: selected.XERO ? xeroFee : 0,
        SIMPLEPAY: selected.SIMPLEPAY ? simplePayFee : 0,
      },
    };

    return computeEstimate(input);
  }, [
    startMonth,
    entityType,
    yearEndMonth,
    vatCategory,
    turnover,
    payroll,
    employeeCount,
    provisionalTaxpayer,
    directors,
    rates,
    selected,
    bookkeepingHours,
    payrollHours,
    mgmtHours,
    afsHours,
    reviewHours,
    afsMonth,
    itrMonth,
    cipcMonth,
    xeroFee,
    simplePayFee,
  ]);

  const activeClientObject: Client = React.useMemo(() => {
    const found = clients.find((c) => c.code === selectedClientCode);
    if (found) return found;
    return {
      code: 'PROP-001',
      name,
      entityType,
      yearEndMonth,
      turnover,
      vatCategory,
      payroll,
      employeeCount,
      staffId,
      status: 'Pending',
      efilingProfile: 'client',
    };
  }, [selectedClientCode, clients, name, entityType, yearEndMonth, turnover, vatCategory, payroll, employeeCount, staffId]);

  const handleDownloadPdf = () => {
    downloadPdfQuote(activeClientObject, estimateResult, todayInSouthAfrica());
  };

  const handleDownloadExcel = () => {
    downloadExcelQuote(activeClientObject, estimateResult, todayInSouthAfrica());
  };

  const handleSaveToClient = () => {
    if (selectedClientCode !== 'new') {
      updateClient(selectedClientCode, {
        turnover,
        yearEndMonth,
        vatCategory,
        payroll,
        employeeCount,
      });
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 2500);
    }
  };

  const toggleService = (key: EstimateKey) => {
    setSelected((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <div className="space-y-6 text-xs">
      {/* Top Selector: Existing Client vs New Prospect */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <label htmlFor="client-selector" className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Estimate Calculation Target
          </label>
          <p className="text-muted-foreground mt-0.5">
            Select an active client to recalculate their annual retainer or choose New Prospect for a commercial pitch.
          </p>
        </div>

        <select
          id="client-selector"
          value={selectedClientCode}
          onChange={(e) => handleClientChange(e.target.value)}
          className="px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono text-xs w-full sm:w-64"
        >
          <option value="new">+ New Prospect (Blank Calculator)</option>
          <optgroup label="Existing Practice Clients">
            {clients.map((c) => (
              <option key={c.code} value={c.code}>
                {c.code} - {c.name}
              </option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* Main Two-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Input Form */}
        <div className="lg:col-span-6 space-y-4">
          {/* General Inputs Card */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3.5 shadow-xs">
            <h3 className="font-semibold text-foreground border-b border-border/70 pb-2 flex items-center justify-between">
              <span>Client &amp; Practice Scope</span>
              <Badge variant="outline" className="font-mono text-[10px]">
                {selectedClientCode === 'new' ? 'New Prospect' : selectedClientCode}
              </Badge>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="font-medium text-foreground block mb-1">Legal Name</label>
                <input
                  type="text"
                  value={name}
                  disabled={selectedClientCode !== 'new'}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground disabled:opacity-70"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Entity Type</label>
                <select
                  value={entityType}
                  disabled={selectedClientCode !== 'new'}
                  onChange={(e) => setEntityType(e.target.value as EntityType)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="Company">Private Company (Pty Ltd)</option>
                  <option value="Close corporation">Close Corporation (CC)</option>
                  <option value="Trust">Trust</option>
                  <option value="Individual">Individual</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Annual Turnover (ZAR)</label>
                <input
                  type="number"
                  step="500000"
                  value={turnover}
                  onChange={(e) => setTurnover(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                />
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Financial Year End</label>
                <select
                  value={yearEndMonth}
                  onChange={(e) => setYearEndMonth(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                >
                  {MONTHS_LONG.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">VAT Category</label>
                <select
                  value={vatCategory || ''}
                  onChange={(e) => setVatCategory((e.target.value || undefined) as VatCategory | undefined)}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground"
                >
                  <option value="">Non-VAT</option>
                  <option value="A">Category A (Odd Months)</option>
                  <option value="B">Category B (Even Months)</option>
                  <option value="C">Category C (Monthly)</option>
                </select>
              </div>

              <div>
                <label className="font-medium text-foreground block mb-1">Payroll Employees</label>
                <input
                  type="number"
                  min="0"
                  value={employeeCount}
                  onChange={(e) => setEmployeeCount(Number(e.target.value))}
                  className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                />
              </div>
            </div>
          </div>

          {/* Regular Work Section */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
            <h3 className="font-semibold text-foreground border-b border-border/70 pb-2">
              Regular work (Monthly Hours)
            </h3>

            <div className="space-y-2.5">
              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.BOOKKEEPING}
                    onChange={() => toggleService('BOOKKEEPING')}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Monthly Accounting &amp; Bookkeeping</span>
                </label>
                <div className="flex items-center gap-2 font-mono">
                  <input
                    type="number"
                    step="0.5"
                    value={bookkeepingHours}
                    onChange={(e) => setBookkeepingHours(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded border border-border bg-background text-center"
                  />
                  <span className="text-muted-foreground">h/mo</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.PAYROLL}
                    onChange={() => toggleService('PAYROLL')}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Payroll Processing</span>
                </label>
                <div className="flex items-center gap-2 font-mono">
                  <input
                    type="number"
                    step="0.25"
                    value={payrollHours}
                    onChange={(e) => setPayrollHours(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded border border-border bg-background text-center"
                  />
                  <span className="text-muted-foreground">h/mo</span>
                </div>
              </div>

              <div className="flex items-center justify-between">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.MGMT}
                    onChange={() => toggleService('MGMT')}
                    className="rounded text-primary focus:ring-primary"
                  />
                  <span>Management Accounts &amp; Virtual FD</span>
                </label>
                <div className="flex items-center gap-2 font-mono">
                  <input
                    type="number"
                    step="0.5"
                    value={mgmtHours}
                    onChange={(e) => setMgmtHours(Number(e.target.value))}
                    className="w-16 px-2 py-1 rounded border border-border bg-background text-center"
                  />
                  <span className="text-muted-foreground">h/mo</span>
                </div>
              </div>
            </div>
          </div>

          {/* Compliance & Annual Work Section */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
            <h3 className="font-semibold text-foreground border-b border-border/70 pb-2">
              Compliance &amp; Annual work
            </h3>

            <div className="space-y-2">
              <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-muted/40">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.VAT201}
                    onChange={() => toggleService('VAT201')}
                    className="rounded text-primary"
                  />
                  <span>VAT returns (VAT201)</span>
                </div>
                <span className="font-mono text-muted-foreground">R 545 / return</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-muted/40">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.EMP201}
                    onChange={() => toggleService('EMP201')}
                    className="rounded text-primary"
                  />
                  <span>PAYE / UIF returns (EMP201)</span>
                </div>
                <span className="font-mono text-muted-foreground">R 495 / month</span>
              </label>

              <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-muted/40">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.IRP6}
                    onChange={() => toggleService('IRP6')}
                    className="rounded text-primary"
                  />
                  <span>Provisional Tax (IRP6)</span>
                </div>
                <span className="font-mono text-muted-foreground">R 650 / payment</span>
              </label>

              <div className="flex items-center justify-between p-1.5 rounded hover:bg-muted/40">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selected.AFS}
                    onChange={() => toggleService('AFS')}
                    className="rounded text-primary"
                  />
                  <span>Annual Financial Statements (AFS)</span>
                </label>
                <div className="flex items-center gap-2 font-mono">
                  <input
                    type="number"
                    value={afsHours}
                    onChange={(e) => setAfsHours(Number(e.target.value))}
                    className="w-14 px-1.5 py-0.5 rounded border border-border bg-background text-center"
                  />
                  <span className="text-muted-foreground">hours in</span>
                  <select
                    value={afsMonth}
                    onChange={(e) => setAfsMonth(Number(e.target.value))}
                    className="px-1 py-0.5 rounded border border-border bg-background"
                  >
                    {MONTHS.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <label className="flex items-center justify-between cursor-pointer p-1.5 rounded hover:bg-muted/40">
                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={selected.CIPC_AR}
                    onChange={() => toggleService('CIPC_AR')}
                    className="rounded text-primary"
                  />
                  <span>CIPC Annual Return &amp; Beneficial Ownership</span>
                </div>
                <span className="font-mono text-muted-foreground">R 525 + CIPC Fee</span>
              </label>
            </div>
          </div>

          {/* Software Recharges */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
            <h3 className="font-semibold text-foreground border-b border-border/70 pb-2">
              Software Recharges (At Cost)
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-1 font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={selected.XERO}
                    onChange={() => toggleService('XERO')}
                    className="rounded text-primary"
                  />
                  <span>Xero subscription</span>
                </label>
                <select
                  value={xeroPlan}
                  onChange={(e) => setXeroPlan(e.target.value as typeof xeroPlan)}
                  className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                >
                  <option value="Starter">Starter (R 391.30/mo)</option>
                  <option value="Standard">Standard (R 691.30/mo)</option>
                  <option value="Premium">Premium (R 952.17/mo)</option>
                </select>
              </div>

              <div>
                <label className="flex items-center gap-2 cursor-pointer mb-1 font-medium text-foreground">
                  <input
                    type="checkbox"
                    checked={selected.SIMPLEPAY}
                    onChange={() => toggleService('SIMPLEPAY')}
                    className="rounded text-primary"
                  />
                  <span>SimplePay Payroll Fee</span>
                </label>
                <div className="relative">
                  <span className="absolute left-2.5 top-1/2 -translate-y-1/2 font-mono text-muted-foreground">R</span>
                  <input
                    type="number"
                    value={simplePayFee}
                    onChange={(e) => setSimplePayFee(Number(e.target.value))}
                    className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Output Summary & 12-Month Table */}
        <div className="lg:col-span-6 space-y-4">
          {/* Retainer KPI Tiles */}
          <div className="grid grid-cols-2 gap-3.5">
            <div className="p-4 rounded-xl border border-border bg-card space-y-1 shadow-xs">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                Monthly Retainer (excl. VAT)
              </div>
              <div className="text-2xl font-bold font-mono font-tnum text-foreground">
                R {estimateResult.average.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground">
                R {estimateResult.averageInclVat.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} incl. 15% VAT
              </div>
            </div>

            <div className="p-4 rounded-xl border border-border bg-card space-y-1 shadow-xs">
              <div className="text-[10px] font-mono uppercase tracking-wider text-muted-foreground">
                12-Month Projected Value
              </div>
              <div className="text-2xl font-bold font-mono font-tnum text-primary">
                R {estimateResult.annual.toLocaleString('en-ZA', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <div className="text-[11px] font-mono text-muted-foreground flex items-center gap-1">
                <TrendingUp className="h-3 w-3 text-emerald-500" />
                <span>+6% March Escalation</span>
              </div>
            </div>
          </div>

          {/* Action Triggers */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
            <h4 className="font-semibold text-foreground">Proposal &amp; SLA Actions</h4>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                size="sm"
                onClick={handleDownloadPdf}
                className="bg-[#c4161c] hover:bg-[#a51217] text-white flex items-center gap-1.5 shadow-xs"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF Quote</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Download Excel Workings</span>
              </Button>

              {selectedClientCode !== 'new' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveToClient}
                  className="flex items-center gap-1.5"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save to Client Record</span>
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setDocumensoOpen(true)}
                className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30"
              >
                <Send className="h-3.5 w-3.5" />
                <span>Send SLA via Documenso</span>
              </Button>

              {saveSuccess && (
                <span className="text-emerald-600 dark:text-emerald-400 font-mono text-xs flex items-center gap-1">
                  <Check className="h-3.5 w-3.5" /> Updated client profile!
                </span>
              )}
            </div>
          </div>

          {/* 12-Month Rolling Matrix Table */}
          <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
            <div className="flex items-center justify-between pb-2 border-b border-border/70">
              <span className="font-semibold text-foreground">12-Month Cashflow Projection</span>
              <span className="font-mono text-[10px] text-muted-foreground">Dec 2026 – Nov 2027</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-[11px] font-mono min-w-[500px]">
                <thead className="bg-muted/40 border-b border-border text-[10px] text-muted-foreground uppercase">
                  <tr>
                    <th className="py-2 px-2.5">Month</th>
                    <th className="py-2 px-2.5">Work Description</th>
                    <th className="py-2 px-2.5 text-right">Excl. VAT</th>
                    <th className="py-2 px-2.5 text-right">Incl. 15% VAT</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {estimateResult.months.map((m, idx) => (
                    <tr key={m.monthKey} className="hover:bg-muted/20">
                      <td className="py-2 px-2.5 font-semibold text-foreground">{m.monthKey}</td>
                      <td className="py-2 px-2.5 font-sans text-muted-foreground">
                        {idx === 2 ? 'Provisional Tax (IRP6)' : idx === 8 ? 'AFS & Annual Return' : 'Monthly Retainer'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-tnum">
                        R {m.total.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2.5 text-right font-tnum text-primary font-medium">
                        R {m.totalInclVat.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Documenso SLA Dispatch Modal */}
      <DocumensoDispatchDialog
        client={activeClientObject}
        open={documensoOpen}
        onOpenChange={setDocumensoOpen}
      />
    </div>
  );
}
