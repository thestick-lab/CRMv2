import { SERVICE_TYPES } from '../domain/catalogue';
import { formatDate, publicHolidays, yearOf } from '../domain/dates';
import { FILING_SEASONS } from '../domain/sars';
import { PAYROLL_BANDS, PRICE_DIFFERENCES, TIMING, TURNOVER_BANDS, XERO_PLANS, rand } from '../domain/pricing';
import { MONTHS } from '../domain/dates';
import type { Model } from './model';

const REVIEW_LABEL = { always: 'Yes', never: 'No', 'when-payable': 'Only when tax is payable' } as const;

export function Rules({ model }: { model: Model }) {
  const year = yearOf(model.asOf);
  const holidays = [year, year + 1].flatMap((y) => [...publicHolidays(y).entries()]);
  return (
    <section className="view" aria-labelledby="rules-h">
      <div className="view-head">
        <div>
          <h1 id="rules-h">Services and rules</h1>
          <p className="lede">
            How each service turns into deadlines. These rules are what the Tax and Compliance Officer should check before the
            data model is signed off.
          </p>
        </div>
      </div>

      <h2 className="section-h">Service catalogue</h2>
      <div className="table-wrap">
        <table className="rules">
          <thead>
            <tr>
              <th scope="col">Service</th>
              <th scope="col">Xero item</th>
              <th scope="col">Fee</th>
              <th scope="col">Partner review</th>
              <th scope="col">When it recurs</th>
              <th scope="col">Deadline rule</th>
              <th scope="col">Basis</th>
            </tr>
          </thead>
          <tbody>
            {SERVICE_TYPES.map((s) => (
              <tr key={s.code}>
                <th scope="row">{s.name}</th>
                <td className="code">{s.xeroItems}</td>
                <td>{s.feeLabel}</td>
                <td>{REVIEW_LABEL[s.review]}</td>
                <td>{s.recurrence}</td>
                <td>{s.deadlineRule}</td>
                <td>{s.basis}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h2 className="section-h">Pricing schedule</h2>
      <div className="pricing-grid">
        <div className="card">
          <h2 className="card-h">Turnover bands</h2>
          <div className="mini-wrap"><table className="mini">
            <thead>
              <tr>
                <th scope="col">Turnover</th>
                <th scope="col">Accounting h a month</th>
                <th scope="col">AFS h</th>
                <th scope="col">Review h</th>
                <th scope="col">CIPC fee</th>
              </tr>
            </thead>
            <tbody>
              {TURNOVER_BANDS.map((b) => (
                <tr key={b.label}>
                  <th scope="row">{b.label}</th>
                  <td>{b.accountingHours}</td>
                  <td>{b.afsHours}</td>
                  <td>{b.reviewHours}</td>
                  <td>{rand(b.cipcFee)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
        <div className="card">
          <h2 className="card-h">Payroll bands and Xero plans</h2>
          <div className="mini-wrap"><table className="mini">
            <thead>
              <tr>
                <th scope="col">Employees</th>
                <th scope="col">SimplePay a month</th>
                <th scope="col">Payroll h/month</th>
              </tr>
            </thead>
            <tbody>
              {PAYROLL_BANDS.map((b) => (
                <tr key={b.label}>
                  <th scope="row">{b.label.replace(' employees', '')}</th>
                  <td>{rand(b.simplePayFee)}</td>
                  <td>{b.payrollHours}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <div className="mini-wrap"><table className="mini">
            <thead>
              <tr>
                <th scope="col">Xero plan</th>
                <th scope="col">Excl. VAT</th>
                <th scope="col">Incl. VAT</th>
                <th scope="col">When</th>
              </tr>
            </thead>
            <tbody>
              {XERO_PLANS.map((p) => (
                <tr key={p.plan}>
                  <th scope="row">{p.plan}</th>
                  <td>{rand(p.fee)}</td>
                  <td>{rand(p.inclVat)}</td>
                  <td>{p.when}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <p className="card-note">
            Xero's prices include VAT, so the estimate uses the amount excluding VAT and adds VAT like any other line. SimplePay fees are taken
            as excluding VAT.
          </p>
          <p className="card-note">
            Timing defaults: AFS {TIMING.afsMonthsAfterYearEnd} months after year end, ITR12 in {MONTHS[TIMING.itr12Month - 1]}, directors' IRP6 in Aug
            and Feb, EMP501 in May and Oct, COIDA in {MONTHS[TIMING.coidaMonth - 1]}.
          </p>
        </div>
        <div className="card span-2">
          <h2 className="card-h">Prices to confirm</h2>
          <p className="card-note">The old pricing schedule and the current Xero items differ on these fixed fees. The prototype uses the Xero price.</p>
          <div className="mini-wrap"><table className="mini">
            <thead>
              <tr>
                <th scope="col">Service</th>
                <th scope="col">Xero</th>
                <th scope="col">Schedule</th>
              </tr>
            </thead>
            <tbody>
              {PRICE_DIFFERENCES.map((d) => (
                <tr key={d.service}>
                  <th scope="row">{d.service}</th>
                  <td>{d.xero}</td>
                  <td>{d.schedule}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
        </div>
      </div>

      <h2 className="section-h">Deadlines</h2>
      <div className="rules-grid">
        <div className="card">
          <h2 className="card-h">SARS filing seasons loaded</h2>
          <div className="mini-wrap"><table className="mini">
            <thead>
              <tr>
                <th scope="col">Tax year</th>
                <th scope="col">Non-provisional</th>
                <th scope="col">Provisional</th>
                <th scope="col">Trusts</th>
              </tr>
            </thead>
            <tbody>
              {FILING_SEASONS.map((s) => (
                <tr key={s.taxYear}>
                  <th scope="row">
                    <a href={s.sourceUrl} target="_blank" rel="noreferrer">
                      {s.taxYear}
                    </a>
                  </th>
                  <td>{formatDate(s.nonProvisional)}</td>
                  <td>{formatDate(s.provisional)}</td>
                  <td>{formatDate(s.trusts)}</td>
                </tr>
              ))}
            </tbody>
          </table></div>
          <p className="card-note">Later tax years show an estimate, marked with ~, until SARS announces the season.</p>
        </div>

        <div className="card">
          <h2 className="card-h">Assumptions to confirm</h2>
          <ul className="assumptions">
            <li>Companies without a recorded year end are taken as February year ends.</li>
            <li>A SARS deadline on a weekend or public holiday moves to the business day before.</li>
            <li>VAT201 uses the eFiling date: the last business day of the month after the period.</li>
            <li>VAT, EMP201, EMP501 and IRP6 have no history in the sheet, so only deadlines from today onward are generated.</li>
            <li>“Last done” years in the sheet are financial years (for individuals and trusts, the tax year ending February).</li>
            <li>Trust AFS has no statutory deadline; the prototype uses six months after year end as an internal target.</li>
            <li>The optional third IRP6 top-up payment is added by hand when needed.</li>
            <li>The CIPC annual return needs each company's incorporation date, which the sheet does not hold.</li>
            <li>VAT is charged on everything except CIPC fees paid to CIPC on the client's behalf and recovered.</li>
            <li>The CIPC annual return fee follows the client's last known turnover on their profile.</li>
          </ul>
        </div>

        <div className="card">
          <h2 className="card-h">Public holidays used</h2>
          <ul className="holidays">
            {holidays.map(([d, name]) => (
              <li key={d}>
                <span className="due">{formatDate(d)}</span> {name}
              </li>
            ))}
          </ul>
        </div>
      </div>
    </section>
  );
}
