import { useEffect, useState } from 'react';
import { canDownload, offerDownload } from './download';
import { AmountInput } from './parts';
import { latestEndedYear } from './estimate-helpers';
import { estimatePdf } from '../export/pdf';
import { clientSheet, type VatMode } from '../export/sheet';
import { estimateXlsx } from '../export/xlsx';
import { STAFF } from '../data/seed';
import { emp501Tier } from '../domain/catalogue';
import { MONTHS, MONTHS_LONG, endOfMonth, iso, parts, shiftMonth } from '../domain/dates';
import {
  FIXED_FEES,
  STANDARD_RATE,
  applicable,
  bandHours,
  computeEstimate,
  effectiveSchedule,
  formatMonthShort,
  itrLabel,
  servicesFromEstimate,
  suggestedMonths,
  suggestedSelection,
  type Estimate as EstimateResult,
  type EstimateInput,
  type EstimateKey,
  type Frequency,
  type RegularKey,
} from '../domain/estimate';
import { TIMING, XERO_PLANS, payrollBand, rand, turnoverBand, xeroPlanFee, type XeroPlan } from '../domain/pricing';
import type { Client, EntityType, ServiceCode, VatCategory } from '../domain/types';
import type { ClientEdits, Model, SavedEstimate } from './model';

/** Inputs that follow the pricing bands until someone types over them. */
type Followed = 'BOOKKEEPING' | 'PAYROLL' | 'AFS' | 'REVIEW' | 'SIMPLEPAY';

interface Form {
  name: string;
  staffId: string;
  input: EstimateInput;
  xeroPlan: XeroPlan;
  monthsTouched: boolean;
  touched: Followed[];
  /** Existing client: their code, and the estimate of the services on record when the page opened */
  clientCode?: string;
  baseline?: EstimateInput;
  /** Regular work (accounting, payroll, subscriptions) is not on record for this client yet */
  notRecorded?: boolean;
}

function startOptions(asOf: string): string[] {
  const [y, m] = parts(asOf);
  return Array.from({ length: 12 }, (_, k) => {
    const [ty, tm] = shiftMonth(y, m, k + 1);
    return iso(ty, tm, 1).slice(0, 7);
  });
}

/** Re-apply the pricing bands to every input nobody has typed over. */
function followBands(input: EstimateInput, touched: Followed[]): EstimateInput {
  const h = bandHours(input.turnover, input.employeeCount);
  const next = { ...input, hours: { ...input.hours }, recharges: { ...input.recharges } };
  for (const k of ['BOOKKEEPING', 'PAYROLL', 'AFS', 'REVIEW'] as const) if (!touched.includes(k)) next.hours[k] = h[k];
  if (!touched.includes('SIMPLEPAY')) next.recharges.SIMPLEPAY = payrollBand(input.employeeCount).band.simplePayFee;
  return next;
}

function initialForm(asOf: string): Form {
  const input: EstimateInput = {
    startMonth: startOptions(asOf)[0],
    entityType: 'Company',
    yearEndMonth: 2,
    vatCategory: 'B',
    turnover: 4_000_000,
    payroll: true,
    employeeCount: 8,
    provisionalTaxpayer: false,
    directors: 1,
    rate: STANDARD_RATE,
    marchIncreasePct: 0,
    irp6Payable: true,
    selected: {},
    hours: { BOOKKEEPING: 0, PAYROLL: 0, MGMT: 0, AFS: 0, REVIEW: 0 },
    months: { AFS: 10, REVIEW: 10, ITR: 11, CIPC_AR: 8 },
    recharges: { XERO: xeroPlanFee('Starter'), SIMPLEPAY: 0 },
  };
  input.months = suggestedMonths(input);
  return { name: '', staffId: 'erik', input: followBands(input, []), xeroPlan: 'Starter', monthsTouched: false, touched: [] };
}

/** An existing client's estimate: their profile and the services on record, or the estimate they last saved. */
function formFromClient(asOf: string, c: Client, services: ServiceCode[], saved?: SavedEstimate): Form {
  const startMonth = startOptions(asOf)[0];
  if (saved) {
    const input = { ...saved.input, startMonth };
    const plan = XERO_PLANS.find((p) => p.fee === input.recharges.XERO)?.plan ?? 'Starter';
    const all: Followed[] = ['BOOKKEEPING', 'PAYROLL', 'AFS', 'REVIEW', 'SIMPLEPAY'];
    return { name: c.name, staffId: c.staffId, input, xeroPlan: plan, monthsTouched: true, touched: all, clientCode: c.code, baseline: input };
  }
  const has = (s: ServiceCode) => services.includes(s);
  const company = c.entityType === 'Company' || c.entityType === 'Close corporation';
  const input: EstimateInput = {
    startMonth,
    entityType: c.entityType,
    yearEndMonth: company ? c.yearEndMonth : 2,
    vatCategory: c.vatCategory,
    turnover: c.turnover,
    payroll: c.payroll,
    employeeCount: c.employeeCount,
    provisionalTaxpayer: !!c.provisionalTaxpayer,
    incorporationDate: c.incorporationDate,
    directors: 0,
    rate: STANDARD_RATE,
    marchIncreasePct: 0,
    irp6Payable: true,
    selected: {
      BOOKKEEPING: false,
      PAYROLL: false,
      MGMT: false,
      REVIEW: false,
      COIDA: false,
      DIR_ITR12: false,
      DIR_IRP6: false,
      XERO: false,
      SIMPLEPAY: false,
      ITREG: false,
      CIPC_REG: false,
      AFS: has('AFS'),
      ITR: has('ITR14') || has('ITR12') || has('ITR12T'),
      IRP6: has('IRP6'),
      VAT201: has('VAT201'),
      EMP201: has('EMP201'),
      EMP501: has('EMP501'),
      CIPC_AR: has('CIPC_AR'),
      BO: has('BO'),
    },
    hours: { BOOKKEEPING: 0, PAYROLL: 0, MGMT: 0, AFS: 0, REVIEW: 0 },
    months: { AFS: 8, REVIEW: 8, ITR: 9, CIPC_AR: 8 },
    recharges: { XERO: xeroPlanFee('Starter'), SIMPLEPAY: 0 },
  };
  input.months = suggestedMonths(input);
  const followed = followBands(input, []);
  return { name: c.name, staffId: c.staffId, input: followed, xeroPlan: 'Starter', monthsTouched: false, touched: [], clientCode: c.code, baseline: followed, notRecorded: true };
}

function makeCode(name: string, taken: string[]): string {
  const letters = (name.toUpperCase().match(/[A-Z]/g) ?? ['N', 'E', 'W']).join('').padEnd(3, 'X').slice(0, 3);
  let n = 100 + ([...name].reduce((a, ch) => (a * 31 + ch.charCodeAt(0)) % 9973, 7) % 900);
  while (taken.includes(`${letters}-${n}`)) n = n >= 999 ? 100 : n + 1;
  return `${letters}-${n}`;
}

const VAT_OPTIONS: [VatCategory, string][] = [
  ['A', 'Category A (two-monthly, odd months)'],
  ['B', 'Category B (two-monthly, even months)'],
  ['C', 'Category C (monthly)'],
  ['D', 'Category D (six-monthly, Feb and Aug)'],
  ['E', 'Category E (annually, at year end)'],
  ['F', 'Category F (four-monthly, Feb, Jun, Oct)'],
];

export function EstimateView({ model, clientCode }: { model: Model; clientCode?: string }) {
  const existing = clientCode ? model.client(clientCode) : undefined;
  const [form, setForm] = useState(
    (existing ? formFromClient(model.asOf, existing, model.servicesFor(existing.code), model.estimateFor(existing.code)) : initialForm(model.asOf)) as Form,
  );
  const [error, setError] = useState('');
  const [vatMode, setVatMode] = useState('incl' as VatMode);
  const [format, setFormat] = useState('pdf' as ExportFormat);
  const [exporting, setExporting] = useState({ busy: false, note: '', tone: '' } as ExportStatus);
  const [downloadsOk, setDownloadsOk] = useState(true);
  useEffect(() => {
    let live = true;
    canDownload().then((ok) => live && setDownloadsOk(ok));
    return () => {
      live = false;
    };
  }, []);
  if (clientCode && !existing) {
    return (
      <section className="view">
        <p className="empty">
          No client with code {clientCode}. <a href="#clients">Back to clients</a>
        </p>
      </section>
    );
  }
  const i = form.input;
  const company = i.entityType === 'Company' || i.entityType === 'Close corporation';
  const sel = { ...suggestedSelection(i), ...i.selected };
  const est = computeEstimate(i);
  const band = turnoverBand(i.turnover);
  const pBand = payrollBand(i.employeeCount);

  const setInput = (patch: Partial<EstimateInput>) =>
    setForm((f: Form) => {
      let next = { ...f.input, ...patch };
      // Keep the annual months in step with the year end until someone moves them by hand.
      if (!f.monthsTouched && ('entityType' in patch || 'yearEndMonth' in patch || 'incorporationDate' in patch)) next.months = suggestedMonths(next);
      if ('turnover' in patch || 'employeeCount' in patch) next = followBands(next, f.touched);
      return { ...f, input: next };
    });
  const touch = (k: Followed) => (f: Form): Followed[] => (f.touched.includes(k) ? f.touched : [...f.touched, k]);
  const tick = (k: EstimateKey, on: boolean) => setInput({ selected: { ...i.selected, [k]: on } });
  const hours = (k: keyof EstimateInput['hours'], v: string) =>
    setForm((f: Form) => ({
      ...f,
      touched: k === 'MGMT' ? f.touched : touch(k)(f),
      input: { ...f.input, hours: { ...f.input.hours, [k]: Math.max(0, Number(v) || 0) } },
    }));
  const month = (k: keyof EstimateInput['months'], v: string) =>
    setForm((f: Form) => ({ ...f, monthsTouched: true, input: { ...f.input, months: { ...f.input.months, [k]: Number(v) } } }));
  const setSimplePay = (v: string) =>
    setForm((f: Form) => ({ ...f, touched: touch('SIMPLEPAY')(f), input: { ...f.input, recharges: { ...f.input.recharges, SIMPLEPAY: Math.max(0, Number(v) || 0) } } }));
  const setXeroPlan = (plan: XeroPlan) =>
    setForm((f: Form) => ({ ...f, xeroPlan: plan, input: { ...f.input, recharges: { ...f.input.recharges, XERO: xeroPlanFee(plan) } } }));
  const resetToBands = () => setForm((f: Form) => ({ ...f, touched: [], input: followBands(f.input, []) }));

  const baseline = form.baseline ? computeEstimate({ ...form.baseline, startMonth: i.startMonth }) : undefined;

  /** The client's copy, in the Estimation tab layout, as a PDF or an Excel file. */
  const exportFile = async () => {
    const clientName = (existing?.name ?? form.name).trim();
    if (!clientName) {
      setError('Enter the client name first.');
      setExporting({ busy: false, note: 'Enter the client name at the top first; it goes on the estimate.', tone: 'warn' });
      document.getElementById('est-name')?.focus();
      return;
    }
    setExporting({ busy: true, note: '', tone: '' });
    try {
      const sheet = clientSheet(est, { clientName, asOf: model.asOf, mode: vatMode, vatCategory: i.vatCategory, marchIncreasePct: i.marchIncreasePct });
      const data = format === 'pdf' ? await estimatePdf(sheet) : estimateXlsx(sheet);
      const filename = `${sheet.fileName}.${format}`;
      const mime = format === 'pdf' ? 'application/pdf' : 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
      const outcome = await offerDownload(filename, data, mime);
      const notes: Record<typeof outcome, ExportStatus> = {
        saved: { busy: false, note: `Saved ${filename}`, tone: 'ok' },
        declined: { busy: false, note: '', tone: '' },
        busy: { busy: false, note: 'A save is already waiting for an answer. Try again in a moment.', tone: 'warn' },
        unavailable: { busy: false, note: 'Saving files is not available in this view.', tone: 'warn' },
      };
      setExporting(notes[outcome]);
    } catch {
      setExporting({ busy: false, note: 'The file could not be created. Try again.', tone: 'warn' });
    }
  };

  /** Existing client: profile changes made here go to the client, the ticked services become theirs, and the estimate is kept. */
  const save = () => {
    const c = existing!;
    const isCo = c.entityType === 'Company' || c.entityType === 'Close corporation';
    const from = `${i.startMonth}-01`;
    const patch: ClientEdits = {};
    if ((i.vatCategory ?? null) !== (c.vatCategory ?? null)) {
      patch.vatCategory = i.vatCategory ?? null;
      patch.vatRegisteredOn = i.vatCategory ? c.vatRegisteredOn ?? from : undefined;
    }
    if (i.payroll !== c.payroll) {
      patch.payroll = i.payroll;
      patch.payrollFrom = i.payroll ? from : undefined;
    }
    if (i.payroll && i.employeeCount !== c.employeeCount) patch.employeeCount = i.employeeCount;
    if (i.turnover !== c.turnover) {
      patch.turnover = i.turnover ?? Number.NaN;
      patch.turnoverSource = 'Client';
      patch.turnoverYear = latestEndedYear(model.asOf, isCo ? i.yearEndMonth : 2);
    }
    if (isCo && i.yearEndMonth !== c.yearEndMonth) patch.yearEndMonth = i.yearEndMonth;
    if (c.entityType === 'Individual' && i.provisionalTaxpayer !== !!c.provisionalTaxpayer) patch.provisionalTaxpayer = i.provisionalTaxpayer;
    if (isCo && i.incorporationDate !== c.incorporationDate) patch.incorporationDate = i.incorporationDate ?? '';
    if (Object.keys(patch).length) model.editClient(c.code, patch);
    model.saveEstimate(c.code, servicesFromEstimate(i), { average: est.average, annual: est.annual, input: i, savedOn: model.asOf });
    location.hash = `client-${c.code}`;
  };

  const accept = () => {
    const name = form.name.trim();
    if (!name) {
      setError('Enter the client name first.');
      document.getElementById('est-name')?.focus();
      return;
    }
    const [ay] = parts(model.asOf);
    const ye = company ? i.yearEndMonth : 2;
    let lastYear = ay;
    while (endOfMonth(lastYear, ye) > model.asOf) lastYear--;
    let lastAr: number | null = null;
    if (company) {
      lastAr = ay - 1;
      if (i.incorporationDate) {
        const [, im, id] = parts(i.incorporationDate);
        if (iso(ay, im, id) <= model.asOf) lastAr = ay;
      }
    }
    const client: Client = {
      code: makeCode(name, model.clients.map((c) => c.code)),
      name,
      entityType: i.entityType,
      vatCategory: i.vatCategory,
      yearEndMonth: ye,
      yearEndAssumed: false,
      efilingProfile: 'client',
      staffId: form.staffId,
      payroll: i.payroll,
      employeeCount: i.payroll ? i.employeeCount : undefined,
      provisionalTaxpayer: i.entityType === 'Individual' ? i.provisionalTaxpayer : undefined,
      incorporationDate: company ? i.incorporationDate : undefined,
      turnover: i.turnover,
      turnoverYear: i.turnover !== undefined ? lastYear : undefined,
      turnoverSource: i.turnover !== undefined ? 'Client' : undefined,
      lastAfsYear: i.entityType === 'Individual' ? null : lastYear,
      lastIncomeTaxYear: lastYear,
      lastAnnualReturnYear: lastAr,
      beneficialOwnershipFiled: company ? true : null,
      taxElsewhere: false,
      status: 'Active',
      notes: `Added from a fee estimate. Years before ${lastYear + 1} taken as done by the previous accountant.`,
    };
    model.addClient(client, servicesFromEstimate(i), { average: est.average, annual: est.annual, input: i, savedOn: model.asOf });
    location.hash = `client-${client.code}`;
  };

  const row = (k: EstimateKey, label: string, fee: string, controls?: any) => {
    const ok = applicable(k, i);
    return (
      <li key={k} className={!ok ? 'na' : sel[k] ? 'on' : ''}>
        <label className="est-tick">
          <input id={`est-${k}`} type="checkbox" checked={ok && !!sel[k]} disabled={!ok} onChange={(e: any) => tick(k, e.target.checked)} />
          <span className="est-label">{label}</span>
        </label>
        <span className="est-controls">{ok ? controls : null}</span>
        <span className="est-fee">{ok ? fee : notApplicable(k)}</span>
      </li>
    );
  };
  const monthSelect = (k: keyof EstimateInput['months']) => (
    <select id={`est-month-${k}`} aria-label="Month" value={i.months[k]} onChange={(e: any) => month(k, e.target.value)}>
      {MONTHS.map((m, idx) => (
        <option key={m} value={idx + 1}>
          {m}
        </option>
      ))}
    </select>
  );
  const hoursInput = (k: keyof EstimateInput['hours'], suffix: string) => (
    <span className="unit">
      <input id={`est-h-${k}`} type="number" min="0" step="0.25" inputMode="decimal" value={i.hours[k]} onChange={(e: any) => hours(k, e.target.value)} />
      {suffix}
    </span>
  );
  const setSchedule = (k: RegularKey, patch: { when?: Frequency; months?: number[] }) => {
    const cur = effectiveSchedule(i, k);
    setInput({ schedule: { ...i.schedule, [k]: { ...cur, ...patch } } });
  };
  /** Hours plus when the work happens: every month, with each VAT return, or chosen months. */
  const regular = (k: RegularKey) => {
    const sched = effectiveSchedule(i, k);
    return (
      <span className="regular">
        {hoursInput(k, sched.when === 'monthly' ? 'h a month' : 'h each time')}
        <select id={`est-when-${k}`} aria-label="When" value={sched.when} onChange={(e: any) => setSchedule(k, { when: e.target.value as Frequency })}>
          <option value="monthly">Every month</option>
          {i.vatCategory && <option value="vat">With each VAT return</option>}
          <option value="custom">Chosen months</option>
        </select>
        {sched.when === 'custom' && (
          <span className="month-chips" role="group" aria-label="Months">
            {MONTHS.map((m, idx) => {
              const on = sched.months.includes(idx + 1);
              return (
                <button
                  key={m}
                  type="button"
                  className="chip-btn"
                  aria-pressed={on}
                  onClick={() => setSchedule(k, { months: on ? sched.months.filter((x) => x !== idx + 1) : [...sched.months, idx + 1] })}
                >
                  {m}
                </button>
              );
            })}
          </span>
        )}
      </span>
    );
  };
  const tier = emp501Tier(i.employeeCount ?? 1);
  const itr = itrLabel(i.entityType);
  const irp6Fee = i.irp6Payable ? FIXED_FEES.IRP6_PAYABLE : FIXED_FEES.IRP6_NIL;

  return (
    <section className="view" aria-labelledby="est-h">
      {existing && (
        <a className="back" href={`#client-${existing.code}`}>
          ← {existing.name}
        </a>
      )}
      <div className="view-head">
        <div>
          {existing && (
            <p className="eyebrow">
              <span className="code">{existing.code}</span> · {existing.entityType}
            </p>
          )}
          <h1 id="est-h">{existing ? `${existing.name}: 12-month estimate` : 'New client estimate'}</h1>
          <p className="lede">
            {existing
              ? `Starts from the services on record. Tick more to see what the year from ${formatMonthShort(est.months[0])} would cost; saving updates their services and estimated monthly cost.`
              : "Tick the services a new client needs. Hours start from the pricing schedule's turnover and payroll bands, and each fee lands in the month the work is done. Clients are still invoiced for the work actually done each month."}
          </p>
        </div>
      </div>
      {form.notRecorded && (
        <p className="warnings">
          Monthly accounting, payroll processing, management accounts and subscriptions are not recorded for this client yet. Tick
          them below if they apply.
        </p>
      )}

      <div className="est-grid">
        <div className="card">
          <h2 className="card-h">Client</h2>
          <div className="form">
            {existing ? (
              <div className="fld">
                <span>Client</span>
                <p className="static">{existing.name}</p>
              </div>
            ) : (
            <label className="fld">
              <span>Client name</span>
              <input
                id="est-name"
                type="text"
                placeholder="e.g. Nova Engineering (Pty) Ltd"
                value={form.name}
                aria-invalid={!!error}
                onChange={(e: any) => {
                  setError('');
                  setExporting((x: ExportStatus) => (x.tone === 'warn' ? { busy: false, note: '', tone: '' } : x));
                  setForm((f: Form) => ({ ...f, name: e.target.value }));
                }}
              />
              {error && <span className="err">{error}</span>}
            </label>
            )}
            {existing ? (
              <div className="fld">
                <span>Type</span>
                <p className="static">{existing.entityType}</p>
              </div>
            ) : (
              <label className="fld">
                <span>Type</span>
                <select id="est-type" value={i.entityType} onChange={(e: any) => setInput({ entityType: e.target.value as EntityType })}>
                  <option>Company</option>
                  <option>Trust</option>
                  <option>Individual</option>
                </select>
              </label>
            )}
            {company ? (
              <label className="fld">
                <span>Financial year end</span>
                <select id="est-ye" value={i.yearEndMonth} onChange={(e: any) => setInput({ yearEndMonth: Number(e.target.value) })}>
                  {MONTHS_LONG.map((m, idx) => (
                    <option key={m} value={idx + 1}>
                      {m}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <div className="fld">
                <span>Year end</span>
                <p className="static">February (tax year)</p>
              </div>
            )}
            {i.entityType !== 'Individual' && (
              <label className="fld">
                <span>Annual turnover</span>
                <span className="unit unit-wide">
                  R
                  <AmountInput id="est-turnover" placeholder="Last known turnover" value={i.turnover} onChange={(n: number | undefined) => setInput({ turnover: n })} />
                </span>
                <span className="hint">
                  {band ? `Band: ${band.label}. CIPC annual return fee ${rand(band.cipcFee)}.` : 'Sets the default hours and the CIPC fee.'}
                </span>
              </label>
            )}
            <label className="fld">
              <span>VAT</span>
              <select
                id="est-vat"
                value={i.vatCategory ?? ''}
                onChange={(e: any) => setInput({ vatCategory: (e.target.value || undefined) as VatCategory | undefined })}
              >
                <option value="">Not registered</option>
                {VAT_OPTIONS.map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
            </label>
            <div className="fld fld-row">
              <label className="check">
                <input id="est-payroll" type="checkbox" checked={i.payroll} onChange={(e: any) => setInput({ payroll: e.target.checked })} />
                Has payroll
              </label>
              {i.payroll && (
                <label className="unit">
                  <input
                    id="est-emp"
                    type="number"
                    min="1"
                    value={i.employeeCount ?? ''}
                    onChange={(e: any) => setInput({ employeeCount: e.target.value === '' ? undefined : Math.max(1, Number(e.target.value)) })}
                  />
                  employees
                </label>
              )}
            </div>
            {i.entityType === 'Individual' && (
              <label className="check">
                <input
                  id="est-prov"
                  type="checkbox"
                  checked={i.provisionalTaxpayer}
                  onChange={(e: any) => setInput({ provisionalTaxpayer: e.target.checked })}
                />
                Provisional taxpayer
              </label>
            )}
            {company && (
              <>
                <label className="fld">
                  <span>Directors whose personal tax we do</span>
                  <input
                    id="est-directors"
                    type="number"
                    min="0"
                    value={i.directors}
                    onChange={(e: any) => setInput({ directors: Math.max(0, Math.floor(Number(e.target.value) || 0)) })}
                  />
                </label>
                <label className="fld">
                  <span>Incorporation date (optional)</span>
                  <input
                    id="est-inc"
                    type="date"
                    value={i.incorporationDate ?? ''}
                    onChange={(e: any) => setInput({ incorporationDate: e.target.value || undefined })}
                  />
                </label>
              </>
            )}
            <label className="fld">
              <span>Responsible</span>
              <select id="est-staff" value={form.staffId} onChange={(e: any) => setForm((f: Form) => ({ ...f, staffId: e.target.value }))}>
                {STAFF.filter((s) => s.kind === 'employee').map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </label>
            <div className="fld-pair">
              <label className="fld">
                <span>Estimate starts</span>
                <select id="est-start" value={i.startMonth} onChange={(e: any) => setInput({ startMonth: e.target.value })}>
                  {startOptions(model.asOf).map((m) => (
                    <option key={m} value={m}>
                      {formatMonthShort(m)}
                    </option>
                  ))}
                </select>
              </label>
              <label className="fld">
                <span>Hourly rate</span>
                <span className="unit">
                  R
                  <input id="est-rate" type="number" min="0" step="5" value={i.rate} onChange={(e: any) => setInput({ rate: Math.max(0, Number(e.target.value) || 0) })} />
                </span>
              </label>
              <label className="fld">
                <span>March increase</span>
                <span className="unit">
                  <input
                    id="est-inc-pct"
                    type="number"
                    min="0"
                    step="0.5"
                    value={i.marchIncreasePct}
                    onChange={(e: any) => setInput({ marchIncreasePct: Math.max(0, Number(e.target.value) || 0) })}
                  />
                  %
                </span>
              </label>
            </div>
          </div>
        </div>

        <div className="card">
          <div className="card-h-row">
            <h2 className="card-h">Services</h2>
            {form.touched.length > 0 && (
              <button type="button" className="link-btn" onClick={resetToBands}>
                Reset hours to the pricing bands
              </button>
            )}
          </div>
          <p className="card-note">
            Hours and subscriptions follow the turnover and payroll bands until you change them.
            {band ? ` Turnover band ${band.label}.` : ''}
            {i.payroll ? ` Payroll band ${pBand.band.label}.` : ''}
          </p>
          <div className="est-groups">
            <EstGroup title="Regular work">
              {row('BOOKKEEPING', 'Monthly accounting', `${rand(i.rate)} an hour`, regular('BOOKKEEPING'))}
              {row('PAYROLL', 'Payroll processing', `${rand(i.rate)} an hour`, regular('PAYROLL'))}
              {row('MGMT', 'Management accounts and FD support', `${rand(i.rate)} an hour`, regular('MGMT'))}
            </EstGroup>
            <EstGroup title="Compliance">
              {row('VAT201', 'VAT returns (VAT201)', `${rand(FIXED_FEES.VAT201)} each`, <span className="auto">{vatFrequency(i.vatCategory)}</span>)}
              {row('EMP201', 'PAYE returns (EMP201)', `${rand(FIXED_FEES.EMP201)} each`, <span className="auto">Monthly</span>)}
              {row('EMP501', 'Employer reconciliations (EMP501)', `${tier?.fee} each`, <span className="auto">{tier?.label}, May and Oct</span>)}
              {row(
                'IRP6',
                'Provisional tax (IRP6)',
                `${rand(irp6Fee)} each`,
                <select id="est-irp6" aria-label="Usual outcome" value={i.irp6Payable ? 'p' : 'n'} onChange={(e: any) => setInput({ irp6Payable: e.target.value === 'p' })}>
                  <option value="p">Usually tax payable</option>
                  <option value="n">Usually nil</option>
                </select>,
              )}
              {row('COIDA', 'COIDA return of earnings', rand(FIXED_FEES.COIDA), <span className="auto">In {MONTHS[TIMING.coidaMonth - 1]}</span>)}
            </EstGroup>
            <EstGroup title="Annual work">
              {row('AFS', 'Annual financial statements', `${rand(i.rate)} an hour`, <>{hoursInput('AFS', 'h in')}{monthSelect('AFS')}</>)}
              {row('REVIEW', 'Independent review', `${rand(i.rate)} an hour`, <>{hoursInput('REVIEW', 'h in')}{monthSelect('REVIEW')}</>)}
              {row('ITR', itr.name, rand(itr.fee), <>In {monthSelect('ITR')}</>)}
              {row(
                'DIR_ITR12',
                "Directors' income tax returns (ITR12)",
                `${rand(FIXED_FEES.ITR12)} each`,
                <span className="auto">
                  {i.directors} director{i.directors === 1 ? '' : 's'}, in {MONTHS[TIMING.itr12Month - 1]}
                </span>,
              )}
              {row(
                'DIR_IRP6',
                "Directors' provisional tax (IRP6)",
                `${rand(irp6Fee)} each`,
                <span className="auto">
                  {i.directors} director{i.directors === 1 ? '' : 's'}, Aug and Feb
                </span>,
              )}
              {row(
                'CIPC_AR',
                'CIPC annual return and FAS',
                `${rand(FIXED_FEES.CIPC_SUBMISSION)} + CIPC fee`,
                <>
                  In {monthSelect('CIPC_AR')}
                  <span className="auto">{band ? `CIPC fee ${rand(band.cipcFee)}, no VAT` : 'Add turnover for the CIPC fee'}</span>
                </>,
              )}
              {row('BO', 'Beneficial ownership update', rand(FIXED_FEES.BO), <span className="auto">With the annual return</span>)}
            </EstGroup>
            <EstGroup title="Recharges">
              {row(
                'XERO',
                'Xero subscription',
                `${rand(i.recharges.XERO)} a month excl. VAT`,
                <select id="est-xero-plan" aria-label="Xero plan" value={form.xeroPlan} onChange={(e: any) => setXeroPlan(e.target.value as XeroPlan)}>
                  {XERO_PLANS.map((p) => (
                    <option key={p.plan} value={p.plan}>
                      {p.plan}: {p.when.toLowerCase()}
                    </option>
                  ))}
                </select>,
              )}
              {row(
                'SIMPLEPAY',
                'SimplePay subscription',
                'At cost',
                <span className="unit">
                  R
                  <input id="est-amt-simplepay" type="number" min="0" step="0.5" value={i.recharges.SIMPLEPAY} onChange={(e: any) => setSimplePay(e.target.value)} />a month
                </span>,
              )}
            </EstGroup>
            <EstGroup title="Once-off setup">
              {row('ITREG', 'Income tax registration', rand(FIXED_FEES.ITREG), <span className="auto">First month</span>)}
              {row(
                'CIPC_REG',
                'Company registration',
                rand(FIXED_FEES.CIPC_REG),
                <span className="auto">Plus {rand(FIXED_FEES.CIPC_NAME)} CIPC name reservation</span>,
              )}
            </EstGroup>
          </div>
        </div>
      </div>

      <Sheet
        est={est}
        baseline={baseline}
        mode={vatMode}
        setMode={setVatMode}
        format={format}
        setFormat={(f: ExportFormat) => {
          setFormat(f);
          setExporting({ busy: false, note: '', tone: '' });
        }}
        onExport={exportFile}
        status={exporting}
        canSave={downloadsOk}
      />

      <div className="accept">
        <div>
          <h2 className="card-h">Next step</h2>
          <p className="card-note">
            {existing
              ? 'In the live system this sheet goes to the client through the portal for acceptance, as a PDF. Here, saving updates their services, deadlines and estimated monthly cost directly.'
              : 'In the live system this sheet goes to the client through the portal with the engagement letter. When they accept, the client is added with these services, the turnover is saved on their profile and their deadlines start. Here, the button does that step directly.'}
          </p>
        </div>
        <div className="accept-actions">
          {existing ? (
            <button id="est-save" type="button" className="btn-primary" onClick={save}>
              Save and update services
            </button>
          ) : (
            <button id="est-accept" type="button" className="btn-primary" onClick={accept}>
              Accept and add as client
            </button>
          )}
        </div>
      </div>
    </section>
  );
}

function vatFrequency(cat: VatCategory | undefined): string {
  switch (cat) {
    case 'C':
      return 'Monthly';
    case 'D':
      return 'Feb and Aug';
    case 'E':
      return 'Once a year';
    case 'F':
      return 'Feb, Jun and Oct';
    default:
      return 'Every two months';
  }
}

function notApplicable(k: EstimateKey): string {
  if (k === 'VAT201') return 'Not VAT registered';
  if (['EMP201', 'EMP501', 'PAYROLL', 'SIMPLEPAY', 'COIDA'].includes(k)) return 'No payroll';
  if (k === 'IRP6') return 'Not provisional';
  return 'Companies only';
}

function EstGroup({ title, children }: { title: string; children: any }) {
  return (
    <div className="est-group">
      <h3 className="est-group-h">{title}</h3>
      <ul className="est-list">{children}</ul>
    </div>
  );
}

type ExportFormat = 'pdf' | 'xlsx';
interface ExportStatus {
  busy: boolean;
  note: string;
  tone: '' | 'ok' | 'warn';
}

interface SheetProps {
  est: EstimateResult;
  baseline?: EstimateResult;
  mode: VatMode;
  setMode: (m: VatMode) => void;
  format: ExportFormat;
  setFormat: (f: ExportFormat) => void;
  onExport: () => void;
  status: ExportStatus;
  canSave: boolean;
}

function Seg<T extends string>({ label, value, options, onChange, id }: { label: string; value: T; options: [T, string][]; onChange: (v: T) => void; id: string }) {
  return (
    <div className="seg" role="group" aria-labelledby={`${id}-l`}>
      <span className="seg-label" id={`${id}-l`}>
        {label}
      </span>
      <span className="seg-opts">
        {options.map(([v, text]) => (
          <button key={v} id={`${id}-${v}`} type="button" aria-pressed={value === v} onClick={() => onChange(v)}>
            {text}
          </button>
        ))}
      </span>
    </div>
  );
}

function Sheet({ est, baseline, mode, setMode, format, setFormat, onExport, status, canSave }: SheetProps) {
  const incl = mode === 'incl';
  const delta = baseline ? Math.round(est.annual - baseline.annual) : 0;
  /** Whole rands in the sheet; the line detail keeps exact amounts. */
  const whole = (n: number) => rand(Math.round(n));
  const groups = ['Regular work', 'Compliance', 'Annual work', 'Recharges', 'Once-off'] as const;
  const inclVat = est.totalsInclVat;
  const max = Math.max(...est.totals, 1);
  const low = Math.min(...est.totals);
  const high = Math.max(...est.totals);
  return (
    <div className="sheet-card">
      <div className="sheet-summary">
        <div className="sum-main">
          <span className="sum-label">Estimated monthly cost</span>
          <span className="sum-n">{rand(est.average)}</span>
          <span className="sum-sub">excl. VAT · {rand(est.averageInclVat)} incl. VAT</span>
        </div>
        <div className="sum-side">
          <div>
            <span className="sum-label">Year total</span>
            <span className="sum-v">{rand(est.annual)}</span>
          </div>
          {baseline && (
            <div>
              <span className="sum-label">Services on record now</span>
              <span className="sum-v">
                {rand(baseline.annual)}
                {delta !== 0 && <span className={`delta ${delta > 0 ? 'up' : 'down'}`}>{`${delta > 0 ? '+' : '−'}${rand(Math.abs(delta))}`}</span>}
              </span>
            </div>
          )}
          <div>
            <span className="sum-label">Lowest and highest month</span>
            <span className="sum-v">
              {rand(low)} to {rand(high)}
            </span>
          </div>
        </div>
      </div>

      {est.warnings.length > 0 && (
        <ul className="warnings">
          {est.warnings.map((w) => (
            <li key={w}>{w}</li>
          ))}
        </ul>
      )}

      <div className="bars" role="img" aria-label={`Monthly fees from ${rand(low)} to ${rand(high)}, average ${rand(est.average)}`}>
        <div className="bars-plot">
          {est.totals.map((t, k) => (
            <div key={est.months[k]} className="bar-col" title={`${formatMonthShort(est.months[k])}: ${whole(t)}`}>
              <div className="bar" style={{ height: `${(t / max) * 100}%` }} />
            </div>
          ))}
          <div className="avg" style={{ bottom: `${(est.average / max) * 100}%` }}>
            <span>Average {rand(est.average)}</span>
          </div>
        </div>
        <div className="bars-x" aria-hidden="true">
          {est.months.map((m) => (
            <span key={m}>{formatMonthShort(m).split(' ')[0]}</span>
          ))}
        </div>
      </div>

      <div className="sheet-tools">
        <Seg
          id="est-vat-mode"
          label="Amounts"
          value={mode}
          onChange={setMode}
          options={[
            ['incl', 'VAT inclusive'],
            ['excl', 'VAT exclusive'],
          ]}
        />
        <div className="export-group">
          <Seg
            id="est-format"
            label="Export as"
            value={format}
            onChange={setFormat}
            options={[
              ['pdf', 'PDF'],
              ['xlsx', 'Excel'],
            ]}
          />
          <button id="est-export" type="button" className="btn-primary" onClick={onExport} disabled={status.busy || !canSave}>
            {status.busy ? 'Preparing…' : `Download ${format === 'pdf' ? 'PDF' : 'Excel'}`}
          </button>
        </div>
        <p className={`export-note ${status.tone}`} role="status">
          {!canSave
            ? 'Saving files is not available in this view.'
            : status.note || `The client's copy in the Estimation layout, ${incl ? 'VAT inclusive' : 'VAT exclusive'}, ready to send.`}
        </p>
      </div>

      <div className="table-wrap">
        <table className="sheet">
          <thead>
            <tr>
              <th scope="col">Service</th>
              {est.months.map((m) => (
                <th key={m} scope="col" className="num">
                  {formatMonthShort(m)}
                </th>
              ))}
              <th scope="col" className="num">
                Year
              </th>
            </tr>
          </thead>
          {groups.map((g) => {
            const lines = est.lines.filter((l) => l.group === g);
            if (!lines.length) return null;
            return (
              <tbody key={g}>
                <tr className="sheet-group">
                  <th scope="rowgroup" colSpan={14}>
                    {g}
                  </th>
                </tr>
                {lines.map((l) => (
                  <tr key={l.key}>
                    <th scope="row">
                      {l.label}
                      <span className="sub">{l.detail}</span>
                    </th>
                    {(incl ? l.amountsInclVat : l.amounts).map((a, k) => (
                      <td key={k} className={`num ${a === 0 ? 'zero' : ''}`}>
                        {a === 0 ? '–' : whole(a)}
                      </td>
                    ))}
                    <td className="num strong">{whole(incl ? l.totalInclVat : l.total)}</td>
                  </tr>
                ))}
              </tbody>
            );
          })}
          <tfoot>
            <tr>
              <th scope="row">Total excl. VAT</th>
              {est.totals.map((t, k) => (
                <td key={k} className="num strong">
                  {whole(t)}
                </td>
              ))}
              <td className="num strong">{whole(est.annual)}</td>
            </tr>
            <tr className="muted-row">
              <th scope="row">VAT at 15%</th>
              {est.vatByMonth.map((v, k) => (
                <td key={k} className="num">
                  {whole(v)}
                </td>
              ))}
              <td className="num">{whole(est.vat)}</td>
            </tr>
            <tr>
              <th scope="row">Total incl. VAT</th>
              {inclVat.map((t, k) => (
                <td key={k} className="num strong">
                  {whole(t)}
                </td>
              ))}
              <td className="num strong">{whole(est.annualInclVat)}</td>
            </tr>
          </tfoot>
        </table>
      </div>
      <p className="card-note sheet-foot">
        Fees from the Xero items list of 27 October 2026 and the firm's pricing schedule. {incl ? 'Service lines include VAT. ' : 'Service lines exclude VAT. '}VAT
        is charged on everything except CIPC fees, which are paid to CIPC on the client's behalf. Subscriptions are passed on at cost; Xero's
        prices include VAT, so the Xero line uses the price excluding VAT.{' '}
        {est.increaseApplied ? `Fees from ${formatMonthShort(est.increaseFrom)} include the March increase; recharges do not.` : 'Set the March increase to include next year’s fee increase.'}{' '}
        This is an estimate: invoices follow the work actually done each month, payable within 7 days.
      </p>
    </div>
  );
}
