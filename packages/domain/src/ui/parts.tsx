import { serviceType } from '../domain/catalogue';
import { diffDays, formatDate, formatDateWithDay } from '../domain/dates';
import { needsReview, urgency, type Urgency } from '../domain/rules';
import { TASK_STATUSES, type Irp6Outcome, type Task, type TaskStatus } from '../domain/types';
import { staffName, type Model } from './model';

export function UrgencyChip({ task, model }: { task: Task; model: Model }) {
  const status = model.status(task.id);
  const u: Urgency = urgency(task, status, model.asOf);
  let text = '';
  if (u === 'done') text = status;
  else if (u === 'no-date') text = 'Date needed';
  else if (u === 'overdue') {
    if (!task.due) text = 'Likely late';
    else {
      const days = -diffDays(task.due, model.asOf);
      text = task.statutory ? `${days} day${days === 1 ? '' : 's'} late` : `Target passed`;
    }
  } else if (task.due) {
    const days = diffDays(task.due, model.asOf);
    text = days === 0 ? 'Due today' : days === 1 ? 'Due tomorrow' : `In ${days} days`;
  }
  return <span className={`chip chip-${u}`}>{text}</span>;
}

export function DueDate({ task }: { task: Task }) {
  if (!task.due) return <span className="due due-missing">No date yet</span>;
  return (
    <span className="due" title={task.estimated ? 'Estimate until SARS announces the filing season' : undefined}>
      {task.estimated ? '~' : ''}
      {formatDateWithDay(task.due)}
    </span>
  );
}

export function irp6Fee(outcome: Irp6Outcome): string {
  if (outcome === 'nil') return 'R575 (IRP6N)';
  if (outcome === 'payable') return 'R650 (IRP6P)';
  return 'R575 or R650';
}

export function taskFee(task: Task, model: Model): string {
  if (task.service === 'IRP6') return irp6Fee(model.irp6(task.id));
  return task.feeLabel;
}

export function reviewFor(task: Task, model: Model): boolean | undefined {
  if (task.service !== 'IRP6') return needsReview(task, undefined);
  const o = model.irp6(task.id);
  return needsReview(task, o === 'unknown' ? undefined : o === 'payable');
}

export function ReviewTag({ task, model }: { task: Task; model: Model }) {
  const r = reviewFor(task, model);
  if (r === false) return null;
  return <span className={`tag ${r ? 'tag-review' : 'tag-maybe'}`}>{r ? 'Partner review' : 'Review if payable'}</span>;
}

export function StatusSelect({ task, model }: { task: Task; model: Model }) {
  const value = model.status(task.id);
  const review = reviewFor(task, model);
  const options = TASK_STATUSES.filter((s) => s !== 'In review' || review !== false || value === 'In review');
  return (
    <select
      id={`status-${task.id}`}
      className={`status status-${value.replace(/\s+/g, '-').toLowerCase()}`}
      value={value}
      aria-label="Status"
      onChange={(e: any) => model.setStatus(task.id, e.target.value as TaskStatus)}
    >
      {options.map((s) => (
        <option key={s} value={s}>
          {s}
        </option>
      ))}
    </select>
  );
}

export function Irp6Select({ task, model }: { task: Task; model: Model }) {
  if (task.service !== 'IRP6') return null;
  return (
    <select
      id={`irp6-${task.id}`}
      className="outcome"
      value={model.irp6(task.id)}
      aria-label="Provisional tax outcome"
      onChange={(e: any) => model.setIrp6(task.id, e.target.value as Irp6Outcome)}
    >
      <option value="unknown">Amount not known yet</option>
      <option value="nil">Nil return</option>
      <option value="payable">Tax payable</option>
    </select>
  );
}

export function taskTitle(task: Task): string {
  const t = serviceType(task.service);
  return `${t.short} · ${task.period}${task.part ? ` · ${task.part}` : ''}`;
}

/** One deadline as a row: date, what, who, fee, status. */
export function TaskRow({ task, model, showClient = true }: { task: Task; model: Model; showClient?: boolean }) {
  const client = model.client(task.clientCode);
  const assignee = staffName(task.assigneeId);
  return (
    <li className={`task urgency-${urgency(task, model.status(task.id), model.asOf)}`}>
      <div className="task-when">
        <DueDate task={task} />
        <UrgencyChip task={task} model={model} />
      </div>
      <div className="task-what">
        {showClient && client && (
          <a className="task-client" href={`#client-${client.code}`}>
            {client.name} <span className="code">{client.code}</span>
          </a>
        )}
        <div className="task-title">
          <span className="svc">{serviceType(task.service).short}</span> {task.period}
          {task.part && <span className="part"> · {task.part}</span>}
        </div>
        <div className="task-meta">
          {task.missing && <span className="chip chip-no-date">{task.missing}</span>}
          {task.info && <span className="note info">{task.info}</span>}
          {task.dueNote && <span className="note">{task.dueNote}</span>}
          {!task.statutory && !task.dueNote && <span className="note">Internal target</span>}
          <ReviewTag task={task} model={model} />
        </div>
      </div>
      <div className="task-who">
        <span className="person">{assignee}</span>
        <span className="fee">{taskFee(task, model)}</span>
      </div>
      <div className="task-status">
        <Irp6Select task={task} model={model} />
        <StatusSelect task={task} model={model} />
      </div>
    </li>
  );
}

export function plural(n: number, one: string, many = `${one}s`) {
  return `${n} ${n === 1 ? one : many}`;
}

export { formatDate };

/** Whole rands with commas between the thousands, e.g. 2,400,000 */
export const groupThousands = (n: number | undefined) =>
  n === undefined || !Number.isFinite(n) ? '' : String(Math.round(n)).replace(/\B(?=(\d{3})+(?!\d))/g, ',');

/**
 * A rand amount typed with commas between the thousands. The commas are added as you type,
 * and the cursor stays next to the digit you were typing.
 */
export function AmountInput({ id, value, onChange, placeholder }: { id: string; value: number | undefined; onChange: (n: number | undefined) => void; placeholder?: string }) {
  const handle = (e: any) => {
    const el = e.target as HTMLInputElement;
    const raw = el.value;
    const caret = el.selectionStart ?? raw.length;
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').replace(/^0+(?=\d)/, '').length;
    const digits = raw.replace(/\D/g, '').replace(/^0+(?=\d)/, '').slice(0, 13);
    const formatted = digits ? groupThousands(Number(digits)) : '';
    el.value = formatted;
    let pos = 0;
    for (let seen = 0; pos < formatted.length && seen < digitsBefore; pos++) if (/\d/.test(formatted[pos])) seen++;
    try {
      el.setSelectionRange(pos, pos);
    } catch {
      /* not focused */
    }
    onChange(digits ? Number(digits) : undefined);
  };
  return <input id={id} type="text" inputMode="numeric" autoComplete="off" placeholder={placeholder} value={groupThousands(value)} onChange={handle} className="amount" />;
}
