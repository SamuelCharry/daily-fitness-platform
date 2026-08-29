import type { BodyStat, Profile } from '../types';
import { analyzeWeightTrend } from './phaseSuggestion';

export interface PersonalizationContext {
  weightKg: number | null;
  heightCm: number | null;
  sex: 'male' | 'female' | null;
  age: number | null;
  phase: string | null;
  avgCalories: number | null;
  weeklyWeightRateKg: number | null;
}

function ageFromBirthdate(birthdate: string | null): number | null {
  if (!birthdate) return null;
  const b = new Date(birthdate);
  const today = new Date();
  let age = today.getFullYear() - b.getFullYear();
  const hasHadBirthdayThisYear = today.getMonth() > b.getMonth() || (today.getMonth() === b.getMonth() && today.getDate() >= b.getDate());
  if (!hasHadBirthdayThisYear) age--;
  return age;
}

export function buildPersonalizationContext(profile: Profile | null, stats: BodyStat[]): PersonalizationContext {
  const weighed = [...stats].filter((s) => s.weight != null).sort((a, b) => a.date.localeCompare(b.date));
  const weightKg = weighed.length ? weighed[weighed.length - 1].weight : null;

  const withCalories = stats.filter((s) => s.calories != null);
  const avgCalories = withCalories.length
    ? withCalories.reduce((sum, s) => sum + (s.calories || 0), 0) / withCalories.length
    : null;

  const trend = analyzeWeightTrend(stats, profile?.current_phase ?? null);

  return {
    weightKg,
    heightCm: profile?.height_cm ?? null,
    sex: profile?.sex === 'female' ? 'female' : profile?.sex === 'male' ? 'male' : null,
    age: ageFromBirthdate(profile?.birthdate ?? null),
    phase: profile?.current_phase ?? null,
    avgCalories,
    weeklyWeightRateKg: trend.hasEnoughData ? trend.weeklyRateKg : null,
  };
}
