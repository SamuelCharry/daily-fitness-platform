import type { BodyweightPoint } from '../types';

export default function BodyweightChart({ points }: { points: BodyweightPoint[] }) {
  if (points.length < 2) {
    return <span className="spinner-text">Log at least two bodyweight entries to see a trend.</span>;
  }

  const w = 560;
  const h = 140;
  const pad = 8;
  const weights = points.map((p) => p.weight);
  const min = Math.min(...weights);
  const max = Math.max(...weights);
  const range = max - min || 1;

  const coords = points.map((p, i) => {
    const x = pad + (i / (points.length - 1)) * (w - pad * 2);
    const y = pad + (1 - (p.weight - min) / range) * (h - pad * 2);
    return [x, y] as const;
  });
  const path = coords.map((c, i) => (i === 0 ? 'M' : 'L') + c[0].toFixed(1) + ',' + c[1].toFixed(1)).join(' ');

  return (
    <svg width="100%" height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none">
      <path d={path} fill="none" stroke="var(--accent)" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
      {coords.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r={2.5} fill="var(--accent)" />
      ))}
    </svg>
  );
}
