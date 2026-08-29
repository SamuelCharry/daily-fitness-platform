import { useState } from 'react';
import type { BodyStat } from '../types';
import { changeOverDays, pointsFromStats, trendDirection } from '../utils/trends';
import AreaTrendChart from './AreaTrendChart';

interface MetricDef {
  key: keyof BodyStat;
  label: string;
  unit: string;
  format: (v: number) => string;
}

const METRICS: MetricDef[] = [
  { key: 'weight', label: 'Weight', unit: 'kg', format: (v) => v.toFixed(1) },
  { key: 'steps', label: 'Steps', unit: '', format: (v) => Math.round(v).toLocaleString() },
  { key: 'sleep_minutes', label: 'Sleep', unit: 'h', format: (v) => (v / 60).toFixed(1) },
];

const RANGES: { key: string; days: number | null }[] = [
  { key: '1W', days: 7 },
  { key: '1M', days: 30 },
  { key: '3M', days: 90 },
  { key: '6M', days: 182 },
  { key: '1Y', days: 365 },
  { key: 'All', days: null },
];

function fmtDelta(delta: number | null, format: (v: number) => string, unit: string) {
  if (delta == null) return '—';
  const sign = delta > 0 ? '+' : '';
  return `${sign}${format(delta)}${unit ? ' ' + unit : ''}`;
}

const TREND_LABEL: Record<string, string> = { up: '↑ Increasing', down: '↓ Decreasing', stable: '→ Stable' };

export default function MetricTrendCard({ stats }: { stats: BodyStat[] }) {
  const [metricKey, setMetricKey] = useState<MetricDef['key']>('weight');
  const [rangeKey, setRangeKey] = useState('3M');

  const metric = METRICS.find((m) => m.key === metricKey)!;
  const allPoints = pointsFromStats(stats, metric.key);

  const range = RANGES.find((r) => r.key === rangeKey)!;
  const displayPoints =
    range.days == null
      ? allPoints
      : allPoints.filter((p) => {
          if (allPoints.length === 0) return false;
          const latest = allPoints[allPoints.length - 1];
          return new Date(p.date).getTime() >= new Date(latest.date).getTime() - (range.days as number) * 86400000;
        });

  const delta3 = changeOverDays(allPoints, 3);
  const delta7 = changeOverDays(allPoints, 7);
  const trend = trendDirection(allPoints, 14);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <div style={{ display: 'flex', gap: 4 }}>
          {METRICS.map((m) => (
            <button
              key={m.key}
              onClick={() => setMetricKey(m.key)}
              style={{
                border: 'none',
                background: metricKey === m.key ? 'var(--accent)' : 'transparent',
                color: metricKey === m.key ? 'var(--accent-text)' : '#a8a8aa',
                padding: '6px 14px',
                borderRadius: 6,
                font: "600 12px/1 'Inter Tight', sans-serif",
              }}
            >
              {m.label}
            </button>
          ))}
        </div>
        <div style={{ display: 'flex', gap: 3, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
          {RANGES.map((r) => (
            <button
              key={r.key}
              onClick={() => setRangeKey(r.key)}
              style={{
                border: 'none',
                background: rangeKey === r.key ? 'var(--accent)' : 'transparent',
                color: rangeKey === r.key ? 'var(--accent-text)' : '#a8a8aa',
                padding: '5px 10px',
                borderRadius: 5,
                font: "600 11px/1 'Inter Tight', sans-serif",
              }}
            >
              {r.key}
            </button>
          ))}
        </div>
      </div>

      <AreaTrendChart points={displayPoints} />

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        <span
          style={{
            font: "600 10px/1 'Inter', sans-serif",
            letterSpacing: '.06em',
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
          }}
        >
          Insights & Data
        </span>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase' }}>3-day change</span>
            <span style={{ font: "500 18px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>
              {fmtDelta(delta3.delta, metric.format, metric.unit)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase' }}>7-day change</span>
            <span style={{ font: "500 18px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>
              {fmtDelta(delta7.delta, metric.format, metric.unit)}
            </span>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase' }}>Trend (14d)</span>
            <span style={{ font: "500 18px/1 'Inter Tight', sans-serif", color: 'var(--accent)' }}>
              {trend ? TREND_LABEL[trend] : 'Not enough data'}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
