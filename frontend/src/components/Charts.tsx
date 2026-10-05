import { useEffect, useRef, useState } from 'react';
import { daysBetween } from '../utils/body';
import { displayDate, mean, shiftDate } from '../utils/journal';

export interface Point { date: string; value: number }

function useWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);
  useEffect(() => {
    if (!ref.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(220, entries[0].contentRect.width)));
    observer.observe(ref.current);
    return () => observer.disconnect();
  }, []);
  return [ref, width] as const;
}

function niceTicks(low: number, high: number, count = 4): number[] {
  const span = high - low || 1;
  const raw = span / count;
  const pow = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map(m => m * pow).find(s => s >= raw)!;
  const ticks: number[] = [];
  for (let v = Math.ceil(low / step) * step; v <= high + 1e-9; v += step) ticks.push(Number(v.toFixed(6)));
  return ticks;
}

function format(value: number, decimals: number) {
  return value.toLocaleString('es-CO', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
}

const H = 190, TOP = 12, BOTTOM = 26, LEFT = 44, RIGHT = 12;

// One measure over time. Line form shows the daily value faintly and the 7-day
// average as the main line; bar form shows one bar per day. Hover shows the day.
export function TrendChart({ points, start, end, kind = 'line', unit, decimals = 1, target, targetLabel = 'Objetivo', average = false, zeroBased = kind === 'bar' }: {
  points: Point[];
  start: string;
  end: string;
  kind?: 'line' | 'bar';
  unit: string;
  decimals?: number;
  target?: number | null;
  targetLabel?: string;
  average?: boolean;
  zeroBased?: boolean;
}) {
  const [ref, width] = useWidth<HTMLDivElement>(560);
  const [hover, setHover] = useState<number | null>(null);
  const visible = points.filter(p => p.date >= start && p.date <= end).sort((a, b) => a.date.localeCompare(b.date));
  if (!visible.length) return <div ref={ref} className="chart-empty"><p>Sin datos en este periodo</p><span>Registra este dato en el check-in diario y aparecerá aquí.</span></div>;

  const totalDays = Math.max(1, daysBetween(start, end));
  const plotW = width - LEFT - RIGHT;
  const x = (date: string) => LEFT + (daysBetween(start, date) / totalDays) * plotW;
  const averages = average ? visible.map(p => ({ date: p.date, value: mean(visible.filter(q => q.date > shiftDate(p.date, -7) && q.date <= p.date).map(q => q.value))! })) : [];
  const values = [...visible.map(p => p.value), ...(target != null ? [target] : [])];
  let low = zeroBased ? 0 : Math.min(...values), high = Math.max(...values);
  const pad = (high - low) * 0.12 || Math.abs(high) * 0.02 || 1;
  if (!zeroBased) low -= pad;
  high += pad;
  const ticks = niceTicks(low, high);
  low = Math.min(low, ticks[0]); high = Math.max(high, ticks[ticks.length - 1]);
  const y = (v: number) => TOP + (1 - (v - low) / (high - low)) * (H - TOP - BOTTOM);
  const barW = Math.max(2, Math.min(18, plotW / (totalDays + 1) - 2));
  const path = (list: Point[]) => list.map((p, i) => `${i ? 'L' : 'M'}${x(p.date).toFixed(1)},${y(p.value).toFixed(1)}`).join('');
  const active = hover != null ? visible[hover] : null;
  const activeAvg = hover != null && average ? averages[hover] : null;

  function onMove(e: React.MouseEvent<SVGSVGElement>) {
    const box = e.currentTarget.getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * width;
    let best = 0;
    visible.forEach((p, i) => { if (Math.abs(x(p.date) - px) < Math.abs(x(visible[best].date) - px)) best = i; });
    setHover(best);
  }

  const tipLeft = active ? Math.min(Math.max(x(active.date), 70), width - 70) : 0;
  return (
    <div ref={ref} className="chart-wrap">
      <svg className="chart" viewBox={`0 0 ${width} ${H}`} width="100%" height={H} onMouseMove={onMove} onMouseLeave={() => setHover(null)} role="img" aria-label={`${visible.length} registros entre ${displayDate(start)} y ${displayDate(end)}`}>
        {ticks.map(t => <g key={t}><line x1={LEFT} x2={width - RIGHT} y1={y(t)} y2={y(t)} className="chart-grid" /><text x={LEFT - 8} y={y(t) + 4} textAnchor="end" className="chart-axis">{format(t, Math.abs(t) >= 1000 || Number.isInteger(t) ? 0 : 1)}</text></g>)}
        <text x={LEFT} y={H - 6} className="chart-axis">{displayDate(start)}</text>
        <text x={width - RIGHT} y={H - 6} textAnchor="end" className="chart-axis">{displayDate(end)}</text>
        {target != null && <><line x1={LEFT} x2={width - RIGHT} y1={y(target)} y2={y(target)} className="chart-target" /><text x={width - RIGHT} y={y(target) - 6} textAnchor="end" className="chart-axis">{targetLabel} {format(target, decimals)}</text></>}
        {kind === 'bar' && visible.map((p, i) => {
          const top = y(p.value), base = y(Math.max(low, 0));
          return <path key={p.date} className={`chart-bar${hover === i ? ' active' : ''}`} d={`M${x(p.date) - barW / 2},${base}V${top + 3}q0,-3 3,-3h${barW - 6}q3,0 3,3V${base}Z`} />;
        })}
        {kind === 'line' && <>
          <path d={path(visible)} className={average ? 'chart-line-faint' : 'chart-line'} />
          {visible.map((p, i) => <circle key={p.date} cx={x(p.date)} cy={y(p.value)} r={hover === i ? 5 : average ? 2.5 : 3.5} className={average ? 'chart-dot-faint' : 'chart-dot'} />)}
          {average && <path d={path(averages)} className="chart-line" />}
        </>}
        {active && <line x1={x(active.date)} x2={x(active.date)} y1={TOP} y2={H - BOTTOM} className="chart-crosshair" />}
      </svg>
      {active && (
        <div className="chart-tip" style={{ left: tipLeft }}>
          <strong>{displayDate(active.date)}</strong>
          <span>{format(active.value, decimals)} {unit}</span>
          {activeAvg && <span>Promedio 7 días: {format(activeAvg.value, decimals)} {unit}</span>}
        </div>
      )}
    </div>
  );
}

export interface HeatCell { date: string; level: number | null; text: string }

// Calendar heatmap, weeks as columns (Monday on top). `level` is 0-4; null = no data.
export function CalendarHeatmap({ cells, end, weeks = 26, legend }: { cells: Map<string, HeatCell>; end: string; weeks?: number; legend: [string, string] }) {
  const [hover, setHover] = useState<HeatCell | null>(null);
  const endWeekday = (new Date(`${end}T12:00:00`).getDay() + 6) % 7;
  const firstMonday = shiftDate(end, -endWeekday - (weeks - 1) * 7);
  const columns = Array.from({ length: weeks }, (_, w) => Array.from({ length: 7 }, (_, d) => shiftDate(firstMonday, w * 7 + d)));
  return (
    <div className="heatmap">
      <div className="heatmap-grid" style={{ gridTemplateColumns: `24px repeat(${weeks}, minmax(0, 1fr))` }}>
        <div className="heatmap-labels">{['L', '', 'X', '', 'V', '', 'D'].map((l, i) => <span key={i}>{l}</span>)}</div>
        {columns.map(days => (
          <div key={days[0]} className="heatmap-week">
            {days.map(date => {
              const cell = cells.get(date);
              const future = date > end;
              return <span
                key={date}
                className={`heat-cell ${future ? 'future' : cell?.level == null ? 'empty' : `l${cell.level}`}`}
                onMouseEnter={() => !future && setHover(cell || { date, level: null, text: 'Sin registro' })}
                onMouseLeave={() => setHover(null)}
                title={future ? undefined : `${displayDate(date)}: ${cell?.text || 'Sin registro'}`}
              />;
            })}
          </div>
        ))}
      </div>
      <div className="heatmap-foot">
        <span className="heatmap-hover">{hover ? <><strong>{displayDate(hover.date)}</strong> · {hover.text}</> : 'Pasa el cursor por un día'}</span>
        <span className="heatmap-scale">{legend[0]}<i className="heat-cell empty" /><i className="heat-cell l0" /><i className="heat-cell l1" /><i className="heat-cell l2" /><i className="heat-cell l3" /><i className="heat-cell l4" />{legend[1]}</span>
      </div>
    </div>
  );
}
