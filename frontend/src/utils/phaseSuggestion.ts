import type { BodyStat } from '../types';

export interface TrendResult {
  hasEnoughData: boolean;
  weeklyRateKg: number | null;
  weeklyRatePct: number | null;
  direction: 'up' | 'down' | 'stable' | null;
  suggestionKcal: number | null;
  message: string;
}

const MIN_SPAN_DAYS = 10;

export function analyzeWeightTrend(stats: BodyStat[], phase: string | null): TrendResult {
  const weighed = stats.filter((s) => s.weight != null).sort((a, b) => a.date.localeCompare(b.date));

  if (weighed.length < 3) {
    return {
      hasEnoughData: false,
      weeklyRateKg: null,
      weeklyRatePct: null,
      direction: null,
      suggestionKcal: null,
      message: 'Log bodyweight a few more times to get a trend-based suggestion.',
    };
  }

  const first = weighed[0];
  const last = weighed[weighed.length - 1];
  const spanDays = (new Date(last.date).getTime() - new Date(first.date).getTime()) / 86400000;

  if (spanDays < MIN_SPAN_DAYS) {
    return {
      hasEnoughData: false,
      weeklyRateKg: null,
      weeklyRatePct: null,
      direction: null,
      suggestionKcal: null,
      message: `Only ${Math.round(spanDays)} days of data so far — check back after ~10+ days for a reliable trend.`,
    };
  }

  const avgWeight = weighed.reduce((sum, s) => sum + (s.weight || 0), 0) / weighed.length;
  const weeklyRateKg = ((last.weight! - first.weight!) / spanDays) * 7;
  const weeklyRatePct = (weeklyRateKg / avgWeight) * 100;
  const direction = weeklyRatePct > 0.15 ? 'up' : weeklyRatePct < -0.15 ? 'down' : 'stable';

  let suggestionKcal: number | null = null;
  let message: string;

  const phaseNorm = phase || 'maintain';

  if (phaseNorm === 'cut') {
    if (weeklyRatePct > -0.3) {
      suggestionKcal = -250;
      message = `You're losing about ${Math.abs(weeklyRatePct).toFixed(1)}%/week — slower than the 0.5–1% target for a cut. Consider a ~250 kcal cut.`;
    } else if (weeklyRatePct < -1.2) {
      suggestionKcal = 200;
      message = `You're losing about ${Math.abs(weeklyRatePct).toFixed(1)}%/week — faster than the 0.5–1% target, which risks muscle loss. Consider adding ~200 kcal back.`;
    } else {
      suggestionKcal = 0;
      message = `Losing about ${Math.abs(weeklyRatePct).toFixed(1)}%/week is right in the sustainable range. No change needed.`;
    }
  } else if (phaseNorm === 'bulk') {
    if (weeklyRatePct < 0.1) {
      suggestionKcal = 100;
      message = `Weight is essentially flat — add ~100 kcal and reassess in a couple weeks, per the "small, slow increases" approach.`;
    } else if (weeklyRatePct > 0.75) {
      suggestionKcal = -200;
      message = `Gaining about ${weeklyRatePct.toFixed(1)}%/week is faster than needed for lean gains — consider cutting back ~200 kcal.`;
    } else {
      suggestionKcal = 0;
      message = `Gaining about ${weeklyRatePct.toFixed(1)}%/week is a reasonable lean-bulk pace. No change needed.`;
    }
  } else {
    if (Math.abs(weeklyRatePct) > 0.25) {
      suggestionKcal = weeklyRatePct > 0 ? -150 : 150;
      message = `Weight is drifting ${direction === 'up' ? 'up' : 'down'} about ${Math.abs(weeklyRatePct).toFixed(1)}%/week while trying to maintain — consider ${suggestionKcal > 0 ? 'adding' : 'cutting'} ~${Math.abs(suggestionKcal)} kcal.`;
    } else {
      suggestionKcal = 0;
      message = 'Weight is holding steady — maintenance calories look right.';
    }
  }

  return { hasEnoughData: true, weeklyRateKg, weeklyRatePct, direction, suggestionKcal, message };
}
