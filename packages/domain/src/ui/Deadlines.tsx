import { useState } from 'react';
import { STAFF } from '../data/seed';
import { SERVICE_TYPES } from '../domain/catalogue';
import { addMonths, diffDays, formatMonthKey, monthKey } from '../domain/dates';
import { urgency } from '../domain/rules';
import type { Task } from '../domain/types';
import type { Model } from './model';
import { TaskRow, plural } from './parts';

type Range = '30' | '90' | '365';

export function Deadlines({ model }: { model: Model }) {
  const [person, setPerson] = useState('all');
  const [service, setService] = useState('all');
  const [range, setRange] = useState('30' as Range);
  const [showDone, setShowDone] = useState(false);

  const open = (t: Task) => urgency(t, model.status(t.id), model.asOf) !== 'done';
  const counts = {
    overdue: model.tasks.filter((t) => urgency(t, model.status(t.id), model.asOf) === 'overdue').length,
    week: model.tasks.filter((t) => urgency(t, model.status(t.id), model.asOf) === 'week').length,
    month: model.tasks.filter((t) => ['week', 'month'].includes(urgency(t, model.status(t.id), model.asOf))).length,
    noDate: model.tasks.filter((t) => urgency(t, model.status(t.id), model.asOf) === 'no-date').length,
  };

  const end = range === '365' ? addMonths(model.asOf, 12) : undefined;
  const filtered = model.tasks.filter((t) => {
    if (person !== 'all' && t.assigneeId !== person) return false;
    if (service !== 'all' && t.service !== service) return false;
    if (!showDone && !open(t)) return false;
    return true;
  });

  const overdue = filtered.filter((t) => urgency(t, model.status(t.id), model.asOf) === 'overdue');
  const noDate = filtered.filter((t) => !t.due && !t.likelyLate);
  const upcoming = filtered.filter((t) => {
    if (!t.due || t.due < model.asOf) return false;
    if (end) return t.due <= end;
    return diffDays(t.due, model.asOf) <= Number(range);
  });
  const done = filtered.filter((t) => !open(t) && t.due && t.due < model.asOf);

  const months = new Map<string, Task[]>();
  for (const t of upcoming) {
    const k = monthKey(t.due!);
    months.set(k, [...(months.get(k) ?? []), t]);
  }

  return (
    <section className="view" aria-labelledby="deadlines-h">
      <div className="view-head">
        <div>
          <h1 id="deadlines-h">Deadlines</h1>
          <p className="lede">
            Generated from each client's services, year end and VAT category. Overdue work stays at the top until it is
            submitted.
          </p>
        </div>
      </div>

      <div className="tiles" role="list">
        <Tile n={counts.overdue} label="Overdue" tone="overdue" />
        <Tile n={counts.week} label="Due in 7 days" tone="week" />
        <Tile n={counts.month} label="Due in 30 days" tone="month" />
        <Tile n={counts.noDate} label="Missing a date" tone="no-date" />
      </div>

      <div className="filters">
        <label className="field">
          <span>Person</span>
          <select id="f-person" value={person} onChange={(e: any) => setPerson(e.target.value)}>
            <option value="all">Everyone</option>
            {STAFF.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
                {s.kind === 'subcontractor' ? ' (subcontractor)' : ''}
              </option>
            ))}
          </select>
        </label>
        <label className="field">
          <span>Service</span>
          <select id="f-service" value={service} onChange={(e: any) => setService(e.target.value)}>
            <option value="all">All services</option>
            {SERVICE_TYPES.filter((s) => s.code !== 'BO').map((s) => (
              <option key={s.code} value={s.code}>
                {s.short}
              </option>
            ))}
          </select>
        </label>
        <div className="field">
          <span>Show</span>
          <div className="segmented" role="group" aria-label="Date range">
            {(
              [
                ['30', 'Next 30 days'],
                ['90', 'Next 90 days'],
                ['365', '12 months'],
              ] as [Range, string][]
            ).map(([v, l]) => (
              <button key={v} type="button" aria-pressed={range === v} onClick={() => setRange(v)}>
                {l}
              </button>
            ))}
          </div>
        </div>
        <label className="check">
          <input id="f-done" type="checkbox" checked={showDone} onChange={(e: any) => setShowDone(e.target.checked)} />
          Include submitted and done
        </label>
      </div>

      {overdue.length > 0 && (
        <Group title="Overdue" count={overdue.length} tone="overdue">
          {overdue.map((t) => (
            <TaskRow key={t.id} task={t} model={model} />
          ))}
        </Group>
      )}

      {[...months.entries()].map(([k, list]) => (
        <Group key={k} title={formatMonthKey(k)} count={list.length}>
          {list.map((t) => (
            <TaskRow key={t.id} task={t} model={model} />
          ))}
        </Group>
      ))}

      {upcoming.length === 0 && overdue.length === 0 && (
        <p className="empty">Nothing due in this range for the filters you picked.</p>
      )}

      {noDate.length > 0 && (
        <Group title="Missing a date" count={noDate.length} tone="no-date" note="Add the missing detail on the client's page to set the deadline.">
          {noDate.map((t) => (
            <TaskRow key={t.id} task={t} model={model} />
          ))}
        </Group>
      )}

      {showDone && done.length > 0 && (
        <Group title="Submitted and done" count={done.length}>
          {done.map((t) => (
            <TaskRow key={t.id} task={t} model={model} />
          ))}
        </Group>
      )}
    </section>
  );
}

function Tile({ n, label, tone }: { n: number; label: string; tone: string }) {
  return (
    <div role="listitem" className={`tile tile-${tone}${n === 0 ? ' tile-zero' : ''}`}>
      <span className="tile-n">{n}</span>
      <span className="tile-label">{label}</span>
    </div>
  );
}

function Group({ title, count, tone, note, children }: { title: string; count: number; tone?: string; note?: string; children: any }) {
  return (
    <div className={`group ${tone ? `group-${tone}` : ''}`}>
      <h2 className="group-h">
        {title} <span className="count">{plural(count, 'deadline')}</span>
      </h2>
      {note && <p className="group-note">{note}</p>}
      <ul className="tasks">{children}</ul>
    </div>
  );
}
