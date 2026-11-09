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
  TrendingUp,
  Search,
  X,
} from 'lucide-react';

export function EstimateCalculator() {
  const { clients, rates, updateClient, savedEstimates, saveEstimate } = usePracticeStore();
  const [selectedClientCode, setSelectedClientCode] = React.useState<string>('new');
  const [clientSearch, setClientSearch] = React.useState('');
  const [searchOpen, setSearchOpen] = React.useState(false);

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
  const [provisionalTaxpayer] = React.useState(true);
  const [directors] = React.useState(1);
  const [staffId, setStaffId] = React.useState('erik');
  const [startMonth] = React.useState('2026-12');

  // Services Hours & Toggles
  const [bookkeepingHours, setBookkeepingHours] = React.useState(4);
  const [payrollHours, setPayrollHours] = React.useState(0.75);
  const [mgmtHours, setMgmtHours] = React.useState(0);
  const [afsHours, setAfsHours] = React.useState(16);
  const [reviewHours] = React.useState(0);
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

  const filteredClients = React.useMemo(() => {
    const q = clientSearch.trim().toLowerCase();
    if (!q) return clients;
    return clients.filter(
      (c) => c.code.toLowerCase().includes(q) || c.name.toLowerCase().includes(q)
    );
  }, [clients, clientSearch]);

  const handleSelectClient = (c: Client) => {
    setSelectedClientCode(c.code);
    setClientSearch(`${c.code} - ${c.name}`);
    setSearchOpen(false);

    setName(c.name);
    setEntityType(c.entityType);
    setYearEndMonth(c.yearEndMonth);
    setTurnover(c.turnover || 4000000);
    setVatCategory(c.vatCategory);
    setPayroll(Boolean(c.payroll));
    setEmployeeCount(c.employeeCount || 8);
    setStaffId(c.staffId);

    const saved = savedEstimates[c.code];
    if (saved) {
      if (saved.hours?.BOOKKEEPING !== undefined) setBookkeepingHours(saved.hours.BOOKKEEPING);
      if (saved.hours?.PAYROLL !== undefined) setPayrollHours(saved.hours.PAYROLL);
      if (saved.hours?.MGMT !== undefined) setMgmtHours(saved.hours.MGMT);
      if (saved.hours?.AFS !== undefined) setAfsHours(saved.hours.AFS);
      if (saved.months?.AFS !== undefined) setAfsMonth(saved.months.AFS);
      if (saved.months?.ITR !== undefined) setItrMonth(saved.months.ITR);
      if (saved.months?.CIPC_AR !== undefined) setCipcMonth(saved.months.CIPC_AR);
      if (saved.selected) setSelected(saved.selected);
      if (saved.recharges?.SIMPLEPAY !== undefined) setSimplePayFee(saved.recharges.SIMPLEPAY);
    }
  };

  const handleNewProspect = () => {
    setSelectedClientCode('new');
    setClientSearch('');
    setName('New Prospect Venture (Pty) Ltd');
    setEntityType('Company');
    setYearEndMonth(2);
    setTurnover(4000000);
    setVatCategory('B');
    setPayroll(true);
    setEmployeeCount(8);
  };

  const xeroFee = xeroPlan === 'Starter' ? 391.3 : xeroPlan === 'Standard' ? 691.3 : 952.17;

  // Compute live estimate with editable fixedFees overrides
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
        REVIEW: reviewHours > 0 ? afsMonth : 10,
        ITR: itrMonth,
        CIPC_AR: cipcMonth,
      },
      recharges: {
        XERO: selected.XERO ? xeroFee : 0,
        SIMPLEPAY: selected.SIMPLEPAY ? simplePayFee : 0,
      },
      fixedFees: rates.serviceFees,
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
      yearEndAssumed: false,
      turnover,
      vatCategory,
      payroll,
      employeeCount,
      staffId,
      status: 'Active',
      efilingProfile: 'client',
      lastAfsYear: null,
      lastIncomeTaxYear: null,
      lastAnnualReturnYear: null,
      beneficialOwnershipFiled: null,
      taxElsewhere: false,
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
      const currentInput: EstimateInput = {
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
          REVIEW: reviewHours > 0 ? afsMonth : 10,
          ITR: itrMonth,
          CIPC_AR: cipcMonth,
        },
        recharges: {
          XERO: selected.XERO ? xeroFee : 0,
          SIMPLEPAY: selected.SIMPLEPAY ? simplePayFee : 0,
        },
        fixedFees: rates.serviceFees,
      };

      saveEstimate(selectedClientCode, currentInput);
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
    <div className="space-y-6 text-xs w-full max-w-full">
      {/* Target Selector Bar with Typeahead Search */}
      <div className="p-4 rounded-xl border border-border bg-card shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="space-y-0.5">
          <label className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Calculator className="h-4 w-4 text-primary" />
            Estimate Calculation Target
          </label>
          <p className="text-muted-foreground">
            Select an active client to recalculate retainer or search prospect.
          </p>
        </div>

        <div className="flex items-center gap-2 w-full md:w-80 relative">
          <div className="relative w-full">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <input
              type="text"
              value={clientSearch}
              onChange={(e) => {
                setClientSearch(e.target.value);
                setSearchOpen(true);
              }}
              onFocus={() => setSearchOpen(true)}
              placeholder="Search existing client (e.g. Axe, ALC)..."
              className="w-full pl-9 pr-8 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono text-xs focus:outline-none focus:ring-1 focus:ring-primary"
            />
            {clientSearch && (
              <button
                type="button"
                onClick={() => {
                  setClientSearch('');
                  handleNewProspect();
                }}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}

            {/* Typeahead Suggestions Popover */}
            {searchOpen && filteredClients.length > 0 && (
              <div className="absolute left-0 right-0 top-full mt-1 z-50 max-h-60 overflow-y-auto rounded-lg border border-border bg-card shadow-xl p-1 space-y-0.5">
                <button
                  type="button"
                  onClick={() => {
                    handleNewProspect();
                    setSearchOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 rounded hover:bg-muted font-semibold text-primary transition-colors cursor-pointer"
                >
                  + New Prospect (Blank Calculator)
                </button>
                {filteredClients.map((c) => (
                  <button
                    key={c.code}
                    type="button"
                    onClick={() => {
                      handleSelectClient(c);
                    }}
                    className="w-full text-left px-3 py-2 rounded hover:bg-muted font-mono transition-colors flex items-center justify-between cursor-pointer"
                  >
                    <span className="font-semibold text-primary">{c.code}</span>
                    <span className="text-foreground truncate ml-2 font-sans">{c.name}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleNewProspect}
            className="shrink-0 text-xs cursor-pointer"
          >
            New Prospect
          </Button>
        </div>
      </div>

      {/* Full-Width Vertical Stack Layout */}
      <div className="space-y-6 w-full">
        {/* Section 1: Client & Practice Scope */}
        <div className="p-5 rounded-xl border border-border bg-card space-y-4 shadow-xs w-full">
          <h3 className="font-semibold text-foreground border-b border-border/70 pb-2.5 flex items-center justify-between">
            <span>Client &amp; Practice Scope</span>
            <Badge variant="outline" className="font-mono text-[10px]">
              {selectedClientCode === 'new' ? 'New Prospect' : selectedClientCode}
            </Badge>
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="font-medium text-foreground block mb-1">Legal Name</label>
              <input
                type="text"
                value={name}
                disabled={selectedClientCode !== 'new'}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground disabled:opacity-70 text-xs"
              />
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Entity Type</label>
              <select
                value={entityType}
                disabled={selectedClientCode !== 'new'}
                onChange={(e) => setEntityType(e.target.value as EntityType)}
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
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
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono text-xs"
              />
            </div>

            <div>
              <label className="font-medium text-foreground block mb-1">Financial Year End</label>
              <select
                value={yearEndMonth}
                onChange={(e) => setYearEndMonth(Number(e.target.value))}
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
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
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground text-xs"
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
                className="w-full px-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono text-xs"
              />
            </div>
          </div>
        </div>

        {/* Section 2: Services Section */}
        <div className="space-y-4 w-full">
          <h3 className="text-sm font-semibold text-foreground px-1">
            Services &amp; Calculation Configuration
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Regular work */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
              <h4 className="font-semibold text-foreground border-b border-border/70 pb-2">
                Regular work (Monthly Hours)
              </h4>

              <div className="space-y-2.5">
                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.BOOKKEEPING}
                      onChange={() => toggleService('BOOKKEEPING')}
                      className="rounded text-primary focus:ring-primary"
                    />
                    <span>Monthly Bookkeeping</span>
                  </label>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      step="0.5"
                      value={bookkeepingHours}
                      onChange={(e) => setBookkeepingHours(Number(e.target.value))}
                      className="w-14 px-1.5 py-0.5 rounded border border-border bg-background text-center text-xs"
                    />
                    <span className="text-muted-foreground text-[10px]">h/mo</span>
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
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      step="0.25"
                      value={payrollHours}
                      onChange={(e) => setPayrollHours(Number(e.target.value))}
                      className="w-14 px-1.5 py-0.5 rounded border border-border bg-background text-center text-xs"
                    />
                    <span className="text-muted-foreground text-[10px]">h/mo</span>
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
                    <span>Virtual FD &amp; Mgmt Accts</span>
                  </label>
                  <div className="flex items-center gap-1.5 font-mono">
                    <input
                      type="number"
                      step="0.5"
                      value={mgmtHours}
                      onChange={(e) => setMgmtHours(Number(e.target.value))}
                      className="w-14 px-1.5 py-0.5 rounded border border-border bg-background text-center text-xs"
                    />
                    <span className="text-muted-foreground text-[10px]">h/mo</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Compliance & Annual Work */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
              <h4 className="font-semibold text-foreground border-b border-border/70 pb-2">
                Compliance &amp; Annual work
              </h4>

              <div className="space-y-2">
                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.VAT201}
                      onChange={() => toggleService('VAT201')}
                      className="rounded text-primary"
                    />
                    <span>VAT returns (VAT201)</span>
                  </div>
                  <span className="font-mono text-muted-foreground text-[11px]">R {rates.serviceFees.VAT201 ?? 545}</span>
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.EMP201}
                      onChange={() => toggleService('EMP201')}
                      className="rounded text-primary"
                    />
                    <span>PAYE returns (EMP201)</span>
                  </div>
                  <span className="font-mono text-muted-foreground text-[11px]">R {rates.serviceFees.EMP201 ?? 495}</span>
                </label>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.IRP6}
                      onChange={() => toggleService('IRP6')}
                      className="rounded text-primary"
                    />
                    <span>Provisional Tax (IRP6)</span>
                  </div>
                  <span className="font-mono text-muted-foreground text-[11px]">R {rates.serviceFees.IRP6_PAYABLE ?? 650}</span>
                </label>

                <div className="flex items-center justify-between p-1 rounded hover:bg-muted/40">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selected.AFS}
                      onChange={() => toggleService('AFS')}
                      className="rounded text-primary"
                    />
                    <span>Annual Financial Statements</span>
                  </label>
                  <div className="flex items-center gap-1 font-mono">
                    <input
                      type="number"
                      value={afsHours}
                      onChange={(e) => setAfsHours(Number(e.target.value))}
                      className="w-12 px-1 py-0.5 rounded border border-border bg-background text-center text-xs"
                    />
                    <span className="text-muted-foreground text-[10px]">h in</span>
                    <select
                      value={afsMonth}
                      onChange={(e) => setAfsMonth(Number(e.target.value))}
                      className="px-1 py-0.5 rounded border border-border bg-background text-xs"
                    >
                      {MONTHS.map((m, idx) => (
                        <option key={m} value={idx + 1}>
                          {m}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <label className="flex items-center justify-between cursor-pointer p-1 rounded hover:bg-muted/40">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={selected.CIPC_AR}
                      onChange={() => toggleService('CIPC_AR')}
                      className="rounded text-primary"
                    />
                    <span>CIPC Annual Return &amp; BO</span>
                  </div>
                  <span className="font-mono text-muted-foreground text-[11px]">R {rates.serviceFees.CIPC_SUBMISSION ?? 525} + fee</span>
                </label>
              </div>
            </div>

            {/* Software Recharges */}
            <div className="p-4 rounded-xl border border-border bg-card space-y-3 shadow-xs">
              <h4 className="font-semibold text-foreground border-b border-border/70 pb-2">
                Software Recharges (At Cost)
              </h4>

              <div className="space-y-3">
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
                    className="w-full px-2.5 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono text-xs"
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
                      className="w-full pl-7 pr-3 py-1.5 rounded-lg border border-border bg-background text-foreground font-mono text-xs"
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Section 3: Quote & 12-Month Cashflow Projection at the bottom */}
        <div className="space-y-4 w-full pt-4 border-t border-border">
          {/* Retainer KPI Tiles */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                className="bg-[#c4161c] hover:bg-[#a51217] text-white flex items-center gap-1.5 shadow-xs cursor-pointer"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Download PDF Quote</span>
              </Button>

              <Button
                size="sm"
                variant="outline"
                onClick={handleDownloadExcel}
                className="flex items-center gap-1.5 cursor-pointer"
              >
                <FileSpreadsheet className="h-3.5 w-3.5" />
                <span>Download Excel Workings</span>
              </Button>

              {selectedClientCode !== 'new' && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleSaveToClient}
                  className="flex items-center gap-1.5 cursor-pointer"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>Save to Client Record</span>
                </Button>
              )}

              <Button
                size="sm"
                variant="outline"
                onClick={() => setDocumensoOpen(true)}
                className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 border-emerald-500/30 cursor-pointer"
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
                  {estimateResult.months.map((m: string, idx: number) => (
                    <tr key={m} className="hover:bg-muted/20">
                      <td className="py-2 px-2.5 font-semibold text-foreground">{m}</td>
                      <td className="py-2 px-2.5 font-sans text-muted-foreground">
                        {idx === 2 ? 'Provisional Tax (IRP6)' : idx === 8 ? 'AFS & Annual Return' : 'Monthly Retainer'}
                      </td>
                      <td className="py-2 px-2.5 text-right font-tnum">
                        R {estimateResult.totals[idx]?.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
                      </td>
                      <td className="py-2 px-2.5 text-right font-tnum text-primary font-medium">
                        R {estimateResult.totalsInclVat[idx]?.toLocaleString('en-ZA', { minimumFractionDigits: 0, maximumFractionDigits: 0 })}
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
        open={documensoOpen}
        onOpenChange={setDocumensoOpen}
        target={{ kind: 'sla', client: activeClientObject }}
      />
    </div>
  );
}
