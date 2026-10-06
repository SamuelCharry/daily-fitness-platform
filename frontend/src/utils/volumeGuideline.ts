import type { Routine, Workout } from '../types';
import { baselineFor, type VolumeBaseline } from '../data/muscleVolumeTargets';
import { muscleName } from '../data/labels';
// TNF groups chest regions together and trapezius/rhomboids together.
// Only the library's primary muscle is counted; no invented indirect-set credit.
export function volumeMuscle(muscle: string): string {
  if (muscle === 'upper_pec' || muscle === 'lower_pec') return 'chest';
  return muscle === 'traps' ? 'upper_back' : muscle;
}
export function volumeMuscleName(muscle: string): string {
  return muscle === 'upper_back' ? 'Espalda alta / trapecios' : muscleName(muscle);
}
export interface VolumeDay {
  weekday: number | null;
  workoutIds: number[];
  names: string[];
  sets: number;
}
export interface MuscleVolumeRow {
  muscle: string;
  frequency: number;
  weeklySets: number;
  baseline: VolumeBaseline | null;
  days: VolumeDay[];
  status: 'missing' | 'low' | 'ok' | 'high' | 'mixed';
}
export function evaluateVolume(days: VolumeDay[]): Pick<MuscleVolumeRow, 'frequency' | 'weeklySets' | 'baseline' | 'status'> {
  const frequency = days.length;
  const weeklySets = days.reduce((n, d) => n + d.sets, 0);
  const baseline = baselineFor(frequency);
  if (!baseline) return { frequency, weeklySets, baseline, status: 'missing' };
  const low = days.some(d => d.sets < baseline.min);
  const high = baseline.max != null && days.some(d => d.sets > baseline.max!);
  return { frequency, weeklySets, baseline, status: low && high ? 'mixed' : low ? 'low' : high ? 'high' : 'ok' };
}
export function computeMuscleVolumeRows(routine: Routine, allMuscles: string[]): MuscleVolumeRow[] {
  const scheduled = routine.workouts.filter(w => w.weekday != null);
  return volumeRowsFor(scheduled.length ? scheduled : routine.workouts, allMuscles);
}
export function volumeRowsFor(workouts: Workout[], allMuscles: string[]): MuscleVolumeRow[] {
  const byMuscle = new Map<string, Map<string, VolumeDay>>();
  for (const w of workouts) {
    const dayKey = w.weekday == null ? `workout-${w.id}` : `weekday-${w.weekday}`;
    for (const ex of w.exercises) {
      const sets = ex.target_sets ?? 0;
      if (sets <= 0) continue;
      const muscle = volumeMuscle(ex.muscle);
      const days = byMuscle.get(muscle) || new Map<string, VolumeDay>();
      const day = days.get(dayKey) || { weekday: w.weekday, workoutIds: [], names: [], sets: 0 };
      day.sets += sets;
      if (!day.workoutIds.includes(w.id)) { day.workoutIds.push(w.id); day.names.push(w.name); }
      days.set(dayKey, day); byMuscle.set(muscle, days);
    }
  }
  return [...new Set([...allMuscles.map(volumeMuscle), ...byMuscle.keys()])]
    .sort((a, b) => volumeMuscleName(a).localeCompare(volumeMuscleName(b)))
    .map(muscle => {
      const days = [...(byMuscle.get(muscle)?.values() || [])].sort((a, b) => (a.weekday ?? 9) - (b.weekday ?? 9));
      return { muscle, days, ...evaluateVolume(days) };
    });
}
