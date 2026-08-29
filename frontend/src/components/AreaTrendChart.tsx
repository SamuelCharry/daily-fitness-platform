import type { MetricPoint } from '../utils/trends';

export default function AreaTrendChart({ points }: { points: MetricPoint[] }) {
  if (points.length < 2) {
    return <span className="spinner-text">Not enough data logged in this range yet.</span>;
  }

  const w = 640;
  const h = 180;
  const pad = 10;
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.value - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });

  const linePath = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');
  const areaPath =
    `M${coords[0][0].toFixed(1)},${(h - pad).toFixed(1)} ` +
    coords.map((c) => `L${c[0].toFixed(1)},${c[1].toFixed(1)}`).join(' ') +
    ` L${coords[coords.length - 1][0].toFixed(1)},${(h - pad).toFixed(1)} Z`;

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <defs>
        <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="var(--accent)" stopOpacity="0.35" />
          <stop offset="100%" stopColor="var(--accent)" stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill="url(#areaFill)" stroke="none" />
      <path d={linePath} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={points.length > 40 ? 0 : 2.2} fill="var(--accent)" />
      ))}
    </svg>
  );
}
