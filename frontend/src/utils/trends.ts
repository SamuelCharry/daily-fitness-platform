export interface MetricPoint {
  date: string;
  value: number;
}

export interface DeltaResult {
  delta: number | null;
  fromDate: string | null;
}

// Finds the change between the latest point and the closest point at least
// `days` earlier - not a fixed-index lookback, since logging isn't always daily.
export function changeOverDays(points: MetricPoint[], days: number): DeltaResult {
  if (points.length === 0) return { delta: null, fromDate: null };

  const latest = points[points.length - 1];
  const targetTime = new Date(latest.date).getTime() - days * 86400000;

  let best: MetricPoint | null = null;
  for (const p of points) {
    const t = new Date(p.date).getTime();
    if (t <= targetTime && (!best || t > new Date(best.date).getTime())) {
      best = p;
    }
  }

  if (!best || best === latest) return { delta: null, fromDate: null };
  return { delta: latest.value - best.value, fromDate: best.date };
}

export type TrendDirection = 'up' | 'down' | 'stable' | null;

// Direction over the trailing `days`, using a 1% move (relative to the earliest
// value in that window) as the threshold between "stable" and a real trend.
export function trendDirection(points: MetricPoint[], days = 14): TrendDirection {
  if (points.length < 2) return null;
  const latest = points[points.length - 1];
  const cutoff = new Date(latest.date).getTime() - days * 86400000;
  const windowed = points.filter((p) => new Date(p.date).getTime() >= cutoff);
  if (windowed.length < 2) return null;

  const first = windowed[0];
  const last = windowed[windowed.length - 1];
  if (first.value === 0) return null;
  const pctChange = ((last.value - first.value) / Math.abs(first.value)) * 100;

  if (pctChange > 1) return 'up';
  if (pctChange < -1) return 'down';
  return 'stable';
}

export function pointsFromStats<T extends { date: string }>(stats: T[], key: keyof T): MetricPoint[] {
  return stats
    .filter((s) => s[key] != null)
    .map((s) => ({ date: s.date, value: Number(s[key]) }))
    .sort((a, b) => a.date.localeCompare(b.date));
}
