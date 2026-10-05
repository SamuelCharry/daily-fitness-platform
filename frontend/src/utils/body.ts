// Body-composition estimates for the summary. Everything here is an estimate built
// from tape measurements and the scale, so callers show it as "aprox." and say which
// dates the inputs came from.
import type { BodyStat, Profile } from '../types';
import { mean, shiftDate } from './journal';

const DAY_MS = 86400000;

export function daysBetween(from: string, to: string): number {
  return Math.round((new Date(`${to}T12:00:00`).getTime() - new Date(`${from}T12:00:00`).getTime()) / DAY_MS);
}

// U.S. Navy circumference method. Men: waist + neck + height. Women also need the hip,
// which this check-in no longer asks for, so a female profile only gets an estimate
// when an older hip measurement exists.
export function navyBodyFat(sex: string | null, heightCm: number, waist: number, neck: number, hip: number | null): number | null {
  if (!heightCm || !waist || !neck) return null;
  let value: number;
  if (sex === 'female') {
    if (!hip || waist + hip - neck <= 0) return null;
    value = 495 / (1.29579 - 0.35004 * Math.log10(waist + hip - neck) + 0.221 * Math.log10(heightCm)) - 450;
  } else {
    if (waist - neck <= 0) return null;
    value = 495 / (1.0324 - 0.19077 * Math.log10(waist - neck) + 0.15456 * Math.log10(heightCm)) - 450;
  }
  return Number.isFinite(value) && value > 2 && value < 60 ? value : null;
}

// Height-normalised FFMI (Kouri et al.), comparable across heights.
export function ffmi(weightKg: number, heightCm: number, bodyFatPct: number): number {
  const h = heightCm / 100;
  return (weightKg * (1 - bodyFatPct / 100)) / (h * h) + 6.1 * (1.8 - h);
}

const FFMI_BANDS: [number, string][] = [
  [18, 'Por debajo del promedio'],
  [19, 'Promedio'],
  [20, 'Sobre el promedio'],
  [21, 'Excelente'],
  [22, 'Superior'],
  [23, 'Cerca del techo natural'],
  [Infinity, 'Por encima del rango natural típico'],
];

export function ffmiBand(value: number, sex: string | null): string {
  const adjusted = sex === 'female' ? value + 3.5 : value;
  return FFMI_BANDS.find(([max]) => adjusted <= max)![1];
}

// Average of one field over the `windowDays` that end at the most recent date that has it.
// Using the latest window (not "the last 7 calendar days") keeps the estimate alive when
// logging stopped, and the returned date lets the UI say how old it is.
export function recentAverage(stats: BodyStat[], key: keyof BodyStat, windowDays = 7): { value: number; date: string; count: number } | null {
  const withValue = stats.filter(s => typeof s[key] === 'number');
  if (!withValue.length) return null;
  const last = withValue[withValue.length - 1].date;
  const window = withValue.filter(s => s.date > shiftDate(last, -windowDays));
  return { value: mean(window.map(s => s[key] as number))!, date: last, count: window.length };
}

// Least-squares slope of weight against time, in kg per week. Needs at least 4 weigh-ins
// spread over 7+ days; fewer than that is noise (water, salt, glycogen), not a rate.
export function weeklyRate(stats: BodyStat[], endDate: string, windowDays = 21): number | null {
  const points = stats.filter(s => s.weight != null && s.date > shiftDate(endDate, -windowDays) && s.date <= endDate);
  if (points.length < 4 || daysBetween(points[0].date, points[points.length - 1].date) < 7) return null;
  const xs = points.map(p => daysBetween(points[0].date, p.date));
  const ys = points.map(p => p.weight!);
  const mx = mean(xs)!, my = mean(ys)!;
  const den = xs.reduce((sum, x) => sum + (x - mx) ** 2, 0);
  if (!den) return null;
  return (xs.reduce((sum, x, i) => sum + (x - mx) * (ys[i] - my), 0) / den) * 7;
}

// Accepts "7.5", "7,5" or "7:30" (hours) and returns minutes.
export function parseSleep(text: string): number | null {
  const raw = text.trim();
  if (!raw) return null;
  const clock = raw.match(/^(\d{1,2}):(\d{1,2})$/);
  const hours = clock ? Number(clock[1]) + Number(clock[2]) / 60 : Number(raw.replace(',', '.'));
  if (!Number.isFinite(hours) || hours < 0 || hours > 24) return NaN;
  return Math.round(hours * 60);
}

export function formatSleep(minutes: number | null): string {
  if (minutes == null) return '';
  const h = Math.floor(minutes / 60), m = minutes % 60;
  return m ? `${h}:${String(m).padStart(2, '0')}` : String(h);
}

export function age(birthdate: string | null | undefined, today: string): number | null {
  if (!birthdate) return null;
  const [by, bm, bd] = birthdate.split('-').map(Number);
  const [ty, tm, td] = today.split('-').map(Number);
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

export interface Composition {
  bodyFat: number | null;
  ffmi: number | null;
  band: string | null;
  inputsDate: string | null;
  missing: string[];
}

export function composition(stats: BodyStat[], profile: Profile | null): Composition {
  const missing: string[] = [];
  if (!profile?.height_cm) missing.push('estatura (en Preferencias)');
  const weight = recentAverage(stats, 'weight');
  const waist = recentAverage(stats, 'waist');
  const neck = recentAverage(stats, 'neck', 30);
  const hip = recentAverage(stats, 'hip', 60);
  if (!weight) missing.push('peso');
  if (!waist) missing.push('cintura');
  if (!neck) missing.push('cuello');
  if (missing.length || !profile?.height_cm || !weight || !waist || !neck) return { bodyFat: null, ffmi: null, band: null, inputsDate: null, missing };
  const bodyFat = navyBodyFat(profile.sex, profile.height_cm, waist.value, neck.value, hip?.value ?? null);
  if (bodyFat == null) return { bodyFat: null, ffmi: null, band: null, inputsDate: null, missing: profile.sex === 'female' ? ['cadera'] : ['medidas válidas'] };
  const value = ffmi(weight.value, profile.height_cm, bodyFat);
  return { bodyFat, ffmi: value, band: ffmiBand(value, profile.sex), inputsDate: [weight.date, waist.date].sort()[0], missing };
}
