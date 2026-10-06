import type { Routine, WorkoutExerciseEntry } from '../types';
import { computeMuscleVolumeRows, volumeMuscle, volumeMuscleName } from './volumeGuideline';
import { WEEKDAYS } from '../data/labels';

export type Priority = 'sufficient' | 'medium' | 'high';
export interface TuningOptions {
  minutes: number; restMinutes: number; executionMinutes: number;
  priorities: Record<string, Priority>;
}
export interface TuningChange { id: number; target_sets: number; rest_seconds: number }
export interface TuningDay {
  label: string; before: number; sets: number; minutes: number; desiredMinutes: number;
  groups: { muscle: string; frequency: number; desired: number; sets: number; priority: Priority }[];
  problems: string[];
}
export interface TuningOrder { workout_id: number; slot_ids: number[]; name: string; names: string[] }
export interface TuningPreview { orders: TuningOrder[]; days: TuningDay[]; changes: TuningChange[]; feasible: boolean }

export const LOWER_MUSCLES = new Set(['quads', 'hamstrings', 'glutes', 'calves', 'spinal_erectors']);
// F1 has no TNF ceiling: 6/8/10 are editable-plan starting goals, not limits from the manual.
export function tuningTarget(frequency: number, priority: Priority): number {
  const index = priority === 'high' ? 2 : priority === 'medium' ? 1 : 0;
  return (frequency === 1 ? [6, 8, 10] : frequency === 2 ? [2, 4, 6] : [1, 2, 3])[index];
}

export function fineTune(routine: Routine, options: TuningOptions): TuningPreview {
  const { minutes, restMinutes, executionMinutes, priorities } = options;
  if (![minutes, restMinutes, executionMinutes].every(Number.isFinite) || minutes < 1 || restMinutes < 0.5 || executionMinutes < 0.25) throw new Error('Revisa los tiempos antes de calcular.');
  const rows = computeMuscleVolumeRows(routine, []);
  const frequencies = new Map(rows.map(r => [r.muscle, r.frequency]));
  const scheduled = routine.workouts.filter(w => w.weekday != null);
  const workouts = [...(scheduled.length ? scheduled : routine.workouts)].sort((a,b) => (a.weekday ?? 9) - (b.weekday ?? 9) || (a.day_index ?? 0) - (b.day_index ?? 0));
  const calendar = new Map<string, typeof workouts>();
  for (const w of workouts) {
    const key = w.weekday == null ? `workout-${w.id}` : `day-${w.weekday}`;
    calendar.set(key, [...(calendar.get(key) || []), w]);
  }
  const result: TuningPreview = { orders: [], days: [], changes: [], feasible: true };
  const rank = (e: WorkoutExerciseEntry) => (e.target_sets || 0) <= 0 ? 3 : priorities[volumeMuscle(e.muscle)] === 'high' ? 0 : priorities[volumeMuscle(e.muscle)] === 'medium' ? 1 : 2;
  for (const w of workouts) {
    const ordered = [...w.exercises].sort((a,b) => rank(a) - rank(b) || a.order_index - b.order_index);
    result.orders.push({workout_id:w.id, slot_ids:ordered.map(e=>e.id), name:w.name, names:ordered.map(e=>e.name)});
  }
  const cost = restMinutes + executionMinutes;
  const capacity = Math.floor((minutes + 1e-9) / cost);
  for (const sameDay of calendar.values()) {
    const slots = sameDay.flatMap(w => w.exercises).filter(e => (e.target_sets || 0) > 0);
    const grouped = new Map<string, WorkoutExerciseEntry[]>();
    for (const slot of slots) {
      const muscle = volumeMuscle(slot.muscle);
      grouped.set(muscle, [...(grouped.get(muscle) || []), slot]);
    }
    const problems: string[] = [];
    const groups = [...grouped.entries()].map(([muscle, entries]) => {
      const frequency = frequencies.get(muscle) || 1;
      const priority = priorities[muscle] || 'sufficient';
      const desired = tuningTarget(frequency, priority);
      const minimum = Math.max(entries.length, tuningTarget(frequency, 'sufficient'));
      const ceiling = frequency === 1 ? Infinity : frequency === 2 ? 6 : 3;
      if (entries.length > ceiling) problems.push(`${volumeMuscleName(muscle)}: ${entries.length} ejercicios necesitan al menos ${entries.length} series. Reduce ejercicios para entrar en el baseline de F${frequency}.`);
      return { muscle, frequency, priority, desired: Math.max(desired, minimum), sets: minimum };
    });
    let count = groups.reduce((n, g) => n + g.sets, 0);
    if (count > capacity) problems.push(`El mínimo conservando ejercicios y baseline necesita ${count} series (${Number((count * cost).toFixed(1))} min). En ${minutes} min caben ${capacity}. Amplía el tiempo o reorganiza ejercicios y frecuencia.`);
    // Preserve everyone's minimum first, then allocate high priorities, then medium.
    for (const priority of ['high', 'medium', 'sufficient'] as const) {
      let advanced = true;
      while (count < capacity && advanced) {
        advanced = false;
        for (const g of groups.filter(g => g.priority === priority)) {
          if (count < capacity && g.sets < g.desired) { g.sets++; count++; advanced = true; }
        }
      }
    }
    for (const g of groups) {
      const entries = grouped.get(g.muscle)!;
      // Split a muscle's total across its selected variants, never multiply by region.
      entries.forEach((e, i) => result.changes.push({ id: e.id, target_sets: Math.floor(g.sets / entries.length) + (i < g.sets % entries.length ? 1 : 0), rest_seconds: Math.round(restMinutes * 60) }));
    }
    const weekday = sameDay[0].weekday;
    result.days.push({ label: `${weekday == null ? '' : `${WEEKDAYS[weekday]} · `}${sameDay.map(w => w.name).join(' + ')}`, before: slots.reduce((n,e) => n + (e.target_sets || 0), 0), sets: count, minutes: Number((count * cost).toFixed(1)), desiredMinutes: Number((groups.reduce((n,g)=>n+g.desired,0)*cost).toFixed(1)), groups, problems });
    if (problems.length) result.feasible = false;
  }
  if (!result.changes.length) result.feasible = false;
  return result;
}
