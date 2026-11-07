import { useState } from 'react';
import { GROUPS, STAFF } from '../data/seed';
import { serviceType } from '../domain/catalogue';
import { MONTHS } from '../domain/dates';
import { urgency } from '../domain/rules';
import type { Client } from '../domain/types';
import { groupName, staffName, type Model } from './model';
import { DueDate, plural } from './parts';

export function Clients({ model }: { model: Model }) {
  const [q, setQ] = useState('');
  const [person, setPerson] = useState('all');
  const [type, setType] = useState('all');
  const [group, setGroup] = useState('all');

  const needle = q.trim().toLowerCase();
  const list = model.clients.filter((c) => {
    if (needle && !`${c.name} ${c.code}`.toLowerCase().includes(needle)) return false;
    if (person !== 'all' && c.staffId !== person && c.subcontractorId !== person) return false;
    if (type !== 'all' && c.entityType !== type) return false;
    if (group !== 'all' && c.groupId !== group) return false;
    return true;
  });

  return (
    <section className="view" aria-labelledby="clients-h">
      <div className="view-head">
        <div>
          <h1 id="clients-h">Clients</h1>
          <p className="lede">
            {plural(model.clients.length, 'client')} in the prototype. Open a client to see their services and every deadline
            those services create.
          </p>
        </div>
        <a className="btn-primary" href="#estimate">
          New client estimate
        </a>
      </div>

      <div className="filters">
        <label className="field grow">
          <span>Search</span>
          <input id="c-search" type="search" placeholder="Name or client code" value={q} onChange={(e: any) => setQ(e.target.value)} />
        </label>
        <label className="field">
          <span>Responsible</span>
          <select id="c-person" value={person} onChange={(e: any) => setPerson(e.target.value)}>
            <option value="all">Everyone</option>
            {STAFF.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Type</span>
          <select id="c-type" value={type} onChange={(e: any) => setType(e.target.value)}>
            <option value="all">All types</option>
            <option>Company</option>
            <option>Trust</option>
            <option>Individual</option>
          </select>
        </label>
        <label className="field">
          <span>Group</span>
          <select id="c-group" value={group} onChange={(e: any) => setGroup(e.target.value)}>
            <option value="all">All groups</option>
            {GROUPS.map((g) => (
              <option key={g.id} value={g.id}>
                {g.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <div className="table-wrap">
        <table className="register">
          <thead>
            <tr>
              <th scope="col">Client</th>
              <th scope="col">Type</th>
              <th scope="col">Responsible</th>
              <th scope="col">Year end</th>
              <th scope="col">VAT</th>
              <th scope="col">Payroll</th>
              <th scope="col">Services</th>
              <th scope="col">Next deadline</th>
            </tr>
          </thead>
          <tbody>
            {list.map((c) => (
              <ClientRow key={c.code} c={c} model={model} />
            ))}
          </tbody>
        </table>
      </div>
      {list.length === 0 && <p className="empty">No clients match. Clear the search or filters.</p>}
    </section>
  );
}

function ClientRow({ c, model }: { c: Client; model: Model }) {
  const tasks = model.tasksFor(c.code);
  const states = tasks.map((t) => urgency(t, model.status(t.id), model.asOf));
  const overdue = states.filter((s) => s === 'overdue').length;
  const next = tasks.find((t, i) => t.due && t.due >= model.asOf && states[i] !== 'done');
  const services = model.servicesFor(c.code);
  const go = () => {
    location.hash = `client-${c.code}`;
  };
  return (
    <tr className="row-link" onClick={go}>
      <td>
        <a href={`#client-${c.code}`} className="client-name" onClick={(e: any) => e.stopPropagation()}>
          {c.name}
        </a>
        <div className="sub">
          <span className="code">{c.code}</span>
          {c.groupId && <span> · {groupName(c.groupId)}</span>}
        </div>
      </td>
      <td>{c.entityType}</td>
      <td>
        {staffName(c.staffId)}
        {c.subcontractorId && <div className="sub">with {staffName(c.subcontractorId)}</div>}
      </td>
      <td className="nowrap">
        {c.entityType === 'Company' ? MONTHS[c.yearEndMonth - 1] : 'Feb'}
        {c.yearEndAssumed && c.entityType === 'Company' && <span className="assumed" title="Assumed: not recorded in the sheet">*</span>}
      </td>
      <td className="nowrap">{c.vatCategory ? `Cat ${c.vatCategory}` : '—'}</td>
      <td>{c.payroll ? 'Yes' : '—'}</td>
      <td className="svc-list">{services.filter((s) => s !== 'BO').map((s) => serviceType(s).short).join(', ') || '—'}</td>
      <td>
        {overdue > 0 && <span className="chip chip-overdue">{plural(overdue, 'overdue item')}</span>}
        {next && (
          <div className="next">
            <span className="svc">{serviceType(next.service).short}</span> <DueDate task={next} />
          </div>
        )}
      </td>
    </tr>
  );
}
