import { SERVICE_TYPES, emp501Tier, serviceType } from '../domain/catalogue';
import { MONTHS_LONG, formatDate } from '../domain/dates';
import { rand, turnoverBand } from '../domain/pricing';
import { urgency } from '../domain/rules';
import type { Client, ServiceCode, Task, TurnoverSource, VatCategory } from '../domain/types';
import { groupName, staffMember, staffName, type Model } from './model';
import { AmountInput, TaskRow, plural } from './parts';

export function ClientPage({ code, model }: { code: string; model: Model }) {
  const c = model.client(code);
  if (!c) {
    return (
      <section className="view">
        <p className="empty">
          No client with code {code}. <a href="#clients">Back to clients</a>
        </p>
      </section>
    );
  }
  const tasks = model.tasksFor(c.code);
  const states = tasks.map((t) => urgency(t, model.status(t.id), model.asOf));
  const overdue = states.filter((s) => s === 'overdue').length;
  const services = model.servicesFor(c.code);
  const members = c.groupId ? model.clients.filter((x) => x.groupId === c.groupId && x.code !== c.code) : [];

  const byService = new Map<ServiceCode, Task[]>();
  for (const t of tasks) byService.set(t.service, [...(byService.get(t.service) ?? []), t]);

  return (
    <section className="view" aria-labelledby="client-h">
      <a className="back" href="#clients">
        ← All clients
      </a>
      <div className="client-head view-head">
        <div>
          <p className="eyebrow">
            <span className="code">{c.code}</span> · {c.entityType}
            {c.groupId && <> · {groupName(c.groupId)}</>}
          </p>
          <h1 id="client-h">{c.name}</h1>
          <p className="lede">
            {staffName(c.staffId)} is responsible
            {c.subcontractorId && <>, with {staffName(c.subcontractorId)} ({staffMember(c.subcontractorId)?.role.toLowerCase()}) doing the work</>}.{' '}
            {overdue > 0 ? (
              <strong className="lede-alert">{plural(overdue, 'item')} overdue.</strong>
            ) : (
              'Nothing overdue.'
            )}
          </p>
        </div>
        <a className="btn-primary" href={`#estimate-${c.code}`}>
          12-month estimate
        </a>
      </div>

      <div className="client-grid">
        <div className="col">
          <Details c={c} model={model} />
          {members.length > 0 && (
            <div className="card">
              <h2 className="card-h">{groupName(c.groupId)}</h2>
              <ul className="members">
                {members.map((m) => (
                  <li key={m.code}>
                    <a href={`#client-${m.code}`}>{m.name}</a>
                    <span className="sub">
                      {m.entityType} · <span className="code">{m.code}</span>
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          )}
          <Services c={c} services={services} model={model} />
        </div>

        <div className="col col-wide">
          <div className="card card-flush">
            <h2 className="card-h">Deadlines</h2>
            {tasks.length === 0 && <p className="empty">No services switched on, so nothing is generated.</p>}
            {[...byService.entries()].map(([svc, list]) => (
              <div key={svc} className="svc-block">
                <h3 className="svc-h">
                  {serviceType(svc).name}
                  <span className="count">{plural(list.length, 'deadline')}</span>
                </h3>
                <ul className="tasks compact">
                  {list.map((t) => (
                    <TaskRow key={t.id} task={t} model={model} showClient={false} />
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Details({ c, model }: { c: Client; model: Model }) {
  const company = c.entityType === 'Company' || c.entityType === 'Close corporation';
  const individual = c.entityType === 'Individual';
  const tier = emp501Tier(c.employeeCount);
  return (
    <div className="card">
      <h2 className="card-h">Details</h2>
      <dl className="details">
        <div>
          <dt>Financial year end</dt>
          <dd>
            {company ? (
              <select
                id={`ye-${c.code}`}
                value={c.yearEndMonth}
                onChange={(e: any) => model.editClient(c.code, { yearEndMonth: Number(e.target.value) })}
              >
                {MONTHS_LONG.map((m, i) => (
                  <option key={m} value={i + 1}>
                    {m}
                  </option>
                ))}
              </select>
            ) : (
              'February (tax year)'
            )}
            {company && c.yearEndAssumed && <span className="hint">Assumed: not in the sheet</span>}
          </dd>
        </div>
        {individual && (
          <div>
            <dt>Provisional taxpayer</dt>
            <dd>
              <select
                id={`prov-${c.code}`}
                value={c.provisionalTaxpayer ? 'yes' : 'no'}
                onChange={(e: any) => model.editClient(c.code, { provisionalTaxpayer: e.target.value === 'yes' })}
              >
                <option value="no">No</option>
                <option value="yes">Yes</option>
              </select>
              <span className="hint">Sets the ITR12 deadline and switches on IRP6</span>
            </dd>
          </div>
        )}
        {company && (
          <div>
            <dt>Incorporation date</dt>
            <dd>
              <input
                id={`inc-${c.code}`}
                type="date"
                value={c.incorporationDate ?? ''}
                onChange={(e: any) => model.editClient(c.code, { incorporationDate: e.target.value })}
              />
              {!c.incorporationDate && <span className="hint warn">Needed for the CIPC annual return date</span>}
            </dd>
          </div>
        )}
        {!individual && <TurnoverField c={c} model={model} />}
        {model.estimateFor(c.code) && (
          <div>
            <dt>Estimated monthly cost</dt>
            <dd>
              {rand(model.estimateFor(c.code)!.average)} excl. VAT
              <span className="hint">
                {rand(model.estimateFor(c.code)!.annual)} for the year, from the estimate of {formatDate(model.estimateFor(c.code)!.savedOn)}
              </span>
            </dd>
          </div>
        )}
        <div>
          <dt>VAT</dt>
          <dd>
            <VatSwitch c={c} model={model} />
          </dd>
        </div>
        <div>
          <dt>Payroll</dt>
          <dd>
            <PayrollSwitch c={c} model={model} />
          </dd>
        </div>
        {c.payroll && (
          <div>
            <dt>Employees</dt>
            <dd>
              <input
                id={`emp-${c.code}`}
                type="number"
                min="0"
                inputMode="numeric"
                placeholder="Number"
                value={c.employeeCount ?? ''}
                onChange={(e: any) =>
                  model.editClient(c.code, { employeeCount: e.target.value === '' ? Number.NaN : Number(e.target.value) })
                }
              />
              <span className="hint">{tier ? `EMP501 ${tier.label}: ${tier.fee}` : 'Sets the EMP501 fee tier'}</span>
            </dd>
          </div>
        )}
        <div>
          <dt>eFiling profile</dt>
          <dd>
            <EfilingSwitch c={c} model={model} />
          </dd>
        </div>
        <div>
          <dt>{individual ? 'ID number' : 'Registration number'}</dt>
          <dd className="muted">Withheld in the prototype</dd>
        </div>
        <div>
          <dt>Last done</dt>
          <dd>
            {c.lastAfsYear !== null && <span className="kv">AFS {c.lastAfsYear}</span>}
            {c.lastIncomeTaxYear !== null && <span className="kv">Income tax {c.lastIncomeTaxYear}</span>}
            {c.lastAnnualReturnYear !== null && <span className="kv">Annual return {c.lastAnnualReturnYear}</span>}
            {c.beneficialOwnershipFiled && <span className="kv">Beneficial ownership filed</span>}
          </dd>
        </div>
        {c.notes && (
          <div>
            <dt>Notes</dt>
            <dd>{c.notes}</dd>
          </div>
        )}
      </dl>
    </div>
  );
}

function Services({ c, services, model }: { c: Client; services: ServiceCode[]; model: Model }) {
  const applicable = SERVICE_TYPES.filter((s) => s.appliesTo.includes(c.entityType));
  return (
    <div className="card">
      <h2 className="card-h">Services</h2>
      <p className="card-note">Switch a service on or off and its deadlines appear or disappear.</p>
      <ul className="services">
        {applicable.map((s) => {
          const on = services.includes(s.code);
          const disabled = s.code === 'VAT201' && !c.vatCategory;
          return (
            <li key={s.code} className={on ? 'on' : ''}>
              <label>
                <input
                  id={`svc-${c.code}-${s.code}`}
                  type="checkbox"
                  checked={on}
                  disabled={disabled}
                  onChange={(e: any) => model.setService(c.code, s.code, e.target.checked)}
                />
                <span className="svc-name">{s.name}</span>
              </label>
              <span className="svc-fee">{disabled ? 'Not VAT registered' : s.feeLabel}</span>
            </li>
          );
        })}
      </ul>
      {c.taxElsewhere && <p className="card-note">Income tax is done by another firm, so ITR14 and IRP6 start switched off.</p>}
    </div>
  );
}

const TURNOVER_SOURCES: TurnoverSource[] = ['AFS', 'Xero', 'Tax return', 'Client', 'Other'];

/** Last known turnover: sets the CIPC fee band and is what the person filing the annual return declares. */
function TurnoverField({ c, model }: { c: Client; model: Model }) {
  const band = turnoverBand(c.turnover);
  const thisYear = Number(model.asOf.slice(0, 4));
  const years = [thisYear, thisYear - 1, thisYear - 2, thisYear - 3];
  return (
    <div>
      <dt>Turnover (last known)</dt>
      <dd>
        <span className="unit unit-wide">
          R
          <AmountInput
            id={`to-${c.code}`}
            placeholder="Not recorded"
            value={c.turnover}
            onChange={(n: number | undefined) => model.editClient(c.code, { turnover: n ?? Number.NaN })}
          />
        </span>
        <span className="turnover-meta">
          <select
            id={`to-year-${c.code}`}
            aria-label="Financial year"
            value={c.turnoverYear ?? ''}
            onChange={(e: any) => model.editClient(c.code, { turnoverYear: Number(e.target.value) })}
          >
            <option value="" disabled>
              Year
            </option>
            {years.map((y) => (
              <option key={y} value={y}>
                FY {y}
              </option>
            ))}
          </select>
          <select
            id={`to-src-${c.code}`}
            aria-label="Source"
            value={c.turnoverSource ?? ''}
            onChange={(e: any) => model.editClient(c.code, { turnoverSource: e.target.value as TurnoverSource })}
          >
            <option value="" disabled>
              Source
            </option>
            {TURNOVER_SOURCES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </span>
        <span className={`hint ${band ? '' : 'warn'}`}>
          {band ? `${band.label}: CIPC annual return fee ${rand(band.cipcFee)}` : 'Needed for the CIPC annual return fee and filing'}
        </span>
      </dd>
    </div>
  );
}

/** Which eFiling profile the client's tax types sit on; switched once they are moved to FD on Call's profile. */
function EfilingSwitch({ c, model }: { c: Client; model: Model }) {
  const ours = c.efilingProfile === 'firm';
  const flip = () =>
    model.editClient(c.code, ours ? { efilingProfile: 'client', efilingTransferredOn: undefined } : { efilingProfile: 'firm', efilingTransferredOn: model.asOf });
  return (
    <>
      <span className="switch-row">
        <button
          id={`efiling-${c.code}`}
          type="button"
          role="switch"
          aria-checked={ours}
          aria-label="On FD on Call's eFiling profile"
          className="switch"
          onClick={flip}
        >
          <span className="knob" />
        </button>
        <span className="switch-label on">{ours ? "FD on Call's profile" : "Client's own profile"}</span>
      </span>
      <span className="hint">
        {ours
          ? c.efilingTransferredOn
            ? `Moved to our profile on ${formatDate(c.efilingTransferredOn)}`
            : 'On our profile'
          : 'Switch once the tax types are moved to our profile'}
      </span>
    </>
  );
}

const VAT_CATEGORIES: [VatCategory, string][] = [
  ['A', 'A: two-monthly, odd'],
  ['B', 'B: two-monthly, even'],
  ['C', 'C: monthly'],
  ['D', 'D: Feb and Aug'],
  ['E', 'E: annually'],
  ['F', 'F: Feb, Jun, Oct'],
];

/** VAT registration: switched on when the client registers, which starts the VAT201 deadlines. */
function VatSwitch({ c, model }: { c: Client; model: Model }) {
  const registered = !!c.vatCategory;
  const edits = (patch: { vatCategory?: VatCategory | null; vatRegisteredOn?: string }) =>
    model.editClient(c.code, { vatCategory: c.vatCategory ?? null, vatRegisteredOn: c.vatRegisteredOn, ...patch });
  const flip = () => (registered ? edits({ vatCategory: null, vatRegisteredOn: undefined }) : edits({ vatCategory: 'A', vatRegisteredOn: model.asOf }));
  return (
    <>
      <span className="switch-row">
        <button
          id={`vat-${c.code}`}
          type="button"
          role="switch"
          aria-checked={registered}
          aria-label="Registered for VAT"
          className="switch"
          onClick={flip}
        >
          <span className="knob" />
        </button>
        <span className="switch-label on">{registered ? 'Registered' : 'Not registered'}</span>
      </span>
      {registered ? (
        <>
          <select id={`vat-cat-${c.code}`} aria-label="VAT category" value={c.vatCategory} onChange={(e: any) => edits({ vatCategory: e.target.value as VatCategory })}>
            {VAT_CATEGORIES.map(([v, l]) => (
              <option key={v} value={v}>
                {l}
              </option>
            ))}
          </select>
          <label className="unit">
            From
            <input
              id={`vat-from-${c.code}`}
              type="date"
              value={c.vatRegisteredOn ?? ''}
              onChange={(e: any) => edits({ vatRegisteredOn: e.target.value })}
            />
          </label>
          <span className="hint">{c.vatRegisteredOn ? 'VAT returns start with the period that includes this date' : 'Registration date not recorded'}</span>
        </>
      ) : (
        <span className="hint">Switch on once the client is registered; VAT returns are then added</span>
      )}
    </>
  );
}

/** Payroll: switched on when the client starts running payroll with us, which starts the EMP201 and EMP501 deadlines. */
function PayrollSwitch({ c, model }: { c: Client; model: Model }) {
  const on = c.payroll;
  const edits = (patch: { payroll?: boolean; payrollFrom?: string }) =>
    model.editClient(c.code, { payroll: c.payroll, payrollFrom: c.payrollFrom, ...patch });
  return (
    <>
      <span className="switch-row">
        <button
          id={`payroll-${c.code}`}
          type="button"
          role="switch"
          aria-checked={on}
          aria-label="Runs payroll"
          className="switch"
          onClick={() => (on ? edits({ payroll: false, payrollFrom: undefined }) : edits({ payroll: true, payrollFrom: model.asOf }))}
        >
          <span className="knob" />
        </button>
        <span className="switch-label on">{on ? 'Runs payroll' : 'No payroll'}</span>
      </span>
      {on ? (
        <>
          <label className="unit">
            From
            <input id={`payroll-from-${c.code}`} type="date" value={c.payrollFrom ?? ''} onChange={(e: any) => edits({ payrollFrom: e.target.value })} />
          </label>
          <span className="hint">{c.payrollFrom ? 'EMP201 and EMP501 start with the periods from this date' : 'Start date not recorded'}</span>
        </>
      ) : (
        <span className="hint">Switch on when the client starts payroll; EMP201 and EMP501 are then added</span>
      )}
    </>
  );
}
