import { useId } from 'react';
import { cn } from '@/lib/utils';

/* ---------------------------------------------------------------------------
 * Analytics visuals, hand-rolled SVG on the existing token system — no chart
 * dependency, no reference accent colours. Every visual is decorative for the
 * screen reader: the surrounding card carries the label and the figures, the
 * SVG is `aria-hidden`.
 * ------------------------------------------------------------------------- */

export interface LineAreaPoint {
  label: string;
  value: number;
}

export interface LineAreaChartProps {
  data: LineAreaPoint[];
  className?: string;
}

const CHART_WIDTH = 640;
const CHART_HEIGHT = 200;
const CHART_PAD = 16;

/**
 * Monthly billed revenue. A single bucket still draws a readable band, so the
 * 7D window does not collapse into an empty axis.
 */
export function LineAreaChart({ data, className }: LineAreaChartProps) {
  const gradientId = useId();
  if (data.length === 0) return null;
  const baseline = CHART_HEIGHT - CHART_PAD;
  const max = Math.max(...data.map((point) => point.value), 0);
  const scale = max > 0 ? max : 1;

  // A single bucket carries no trend, so it reads as a level band rather than
  // a line pinned to an arbitrary axis.
  const points =
    data.length === 1
      ? [
          { x: 0, y: CHART_HEIGHT / 2 },
          { x: CHART_WIDTH, y: CHART_HEIGHT / 2 },
        ]
      : data.map((point, index) => ({
          x: (index / Math.max(data.length - 1, 1)) * CHART_WIDTH,
          y: baseline - (point.value / scale) * (CHART_HEIGHT - CHART_PAD * 2),
        }));

  const line = points.map((point, index) => `${index === 0 ? 'M' : 'L'}${point.x},${point.y}`).join(' ');
  const area = `${line} L${CHART_WIDTH},${CHART_HEIGHT} L0,${CHART_HEIGHT} Z`;
  const endpoint = points[points.length - 1];

  return (
    <figure className={cn('space-y-2', className)}>
      <svg
        viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        preserveAspectRatio="none"
        className="h-36 w-full overflow-visible"
        aria-hidden="true"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#c4161c" stopOpacity="0.22" />
            <stop offset="100%" stopColor="#c4161c" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        <line
          x1="0"
          y1={baseline}
          x2={CHART_WIDTH}
          y2={baseline}
          style={{ stroke: 'var(--border)' }}
          strokeWidth="1"
          vectorEffect="non-scaling-stroke"
        />
        <path d={area} fill={`url(#${gradientId})`} />
        <path
          d={line}
          fill="none"
          stroke="#c4161c"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
        />
        {endpoint && (
          <circle cx={endpoint.x} cy={endpoint.y} r="4" fill="#c4161c" vectorEffect="non-scaling-stroke" />
        )}
      </svg>

      {data.length > 0 && (
        <figcaption className="flex items-center justify-between gap-2 font-mono text-[11px] uppercase tracking-wide text-muted-foreground">
          <span>{data[0].label}</span>
          {data.length > 2 && <span className="hidden sm:inline">{data[Math.floor(data.length / 2)].label}</span>}
          <span>{data[data.length - 1].label}</span>
        </figcaption>
      )}
    </figure>
  );
}

export interface DonutSlice {
  label: string;
  pct: number;
  detail?: string;
}

export interface DonutChartProps {
  slices: DonutSlice[];
  centerValue: string;
  centerLabel: string;
  className?: string;
}

/** Ring + legend, both driven by one ordered palette so they never disagree. */
const SLICE_STYLES = [
  { stroke: 'var(--primary)', opacity: 1 },
  { stroke: 'var(--primary)', opacity: 0.7 },
  { stroke: 'var(--primary)', opacity: 0.45 },
  { stroke: 'var(--primary)', opacity: 0.26 },
  { stroke: 'var(--muted-foreground)', opacity: 0.6 },
  { stroke: 'var(--muted-foreground)', opacity: 0.35 },
];

const RADIUS = 54;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ slices, centerValue, centerLabel, className }: DonutChartProps) {
  let offset = 0;
  const segments = slices.map((slice, index) => {
    const length = (Math.max(slice.pct, 0) / 100) * CIRCUMFERENCE;
    const segment = { ...slice, length, offset, style: SLICE_STYLES[index % SLICE_STYLES.length] };
    offset += length;
    return segment;
  });

  return (
    <div className={cn('flex flex-col items-center gap-5 sm:flex-row', className)}>
      <div className="relative h-32 w-32 shrink-0">
        <svg viewBox="0 0 140 140" className="h-32 w-32 -rotate-90" aria-hidden="true">
          <circle
            cx="70"
            cy="70"
            r={RADIUS}
            fill="none"
            style={{ stroke: 'var(--muted)' }}
            strokeWidth="16"
          />
          {segments.map((segment) => (
            <circle
              key={segment.label}
              cx="70"
              cy="70"
              r={RADIUS}
              fill="none"
              strokeWidth="16"
              strokeLinecap="butt"
              strokeDasharray={`${segment.length} ${CIRCUMFERENCE - segment.length}`}
              strokeDashoffset={-segment.offset}
              style={{ stroke: segment.style.stroke, opacity: segment.style.opacity }}
            />
          ))}
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-mono text-lg font-semibold leading-none tabular-nums text-foreground">
            {centerValue}
          </span>
          <span className="mt-1 font-mono text-[11px] uppercase tracking-[0.12em] text-muted-foreground">
            {centerLabel}
          </span>
        </div>
      </div>

      <ul className="w-full min-w-0 flex-1 space-y-1.5">
        {segments.map((segment) => (
          <li key={segment.label} className="flex items-center gap-2 text-xs">
            <span
              className="h-1.5 w-1.5 shrink-0 rounded-full"
              style={{ backgroundColor: segment.style.stroke, opacity: segment.style.opacity }}
              aria-hidden="true"
            />
            <span className="min-w-0 flex-1 truncate text-foreground">{segment.label}</span>
            <span className="shrink-0 font-mono text-[11px] tabular-nums text-muted-foreground">
              {segment.pct}%
            </span>
            {segment.detail && (
              <span className="w-20 shrink-0 text-right font-mono text-[11px] tabular-nums text-foreground">
                {segment.detail}
              </span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}

export interface BarListItem {
  label: string;
  value: number;
  detail?: string;
}

export interface BarListProps {
  items: BarListItem[];
  formatValue: (value: number) => string;
  className?: string;
}

/** Horizontal ranking bars; label and figure stay readable, the bar is support. */
export function BarList({ items, formatValue, className }: BarListProps) {
  const max = Math.max(...items.map((item) => item.value), 1);

  return (
    <ul className={cn('space-y-3', className)}>
      {items.map((item) => (
        <li key={item.label} className="space-y-1">
          <div className="flex items-baseline justify-between gap-3 text-xs">
            <span className="min-w-0 truncate text-foreground">{item.label}</span>
            <span className="shrink-0 font-mono tabular-nums text-muted-foreground">
              {item.detail ?? formatValue(item.value)}
            </span>
          </div>
          <div className="h-1.5 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full rounded-full bg-[#c4161c]/80"
              style={{ width: `${Math.max((item.value / max) * 100, 2)}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
