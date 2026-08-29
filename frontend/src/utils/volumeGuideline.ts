// Weekly volume check, compared against the per-muscle targets in
// muscleVolumeTargets.ts (pulled from the user's own program) rather than a
// generic textbook formula. A muscle flagged `isFloor` in that table is a
// minimum to clear, not a ceiling to avoid — so it never gets flagged "high".
import type { Routine } from '../types';
import { targetFor } from '../data/muscleVolumeTargets';

export interface VolumeStatus {
  frequency: number;
  weeklySets: number;
  target: number | null;
  isFloor: boolean;
  status: 'missing' | 'low' | 'ok' | 'high';
}

export function evaluateVolume(frequency: number, weeklySets: number, muscle: string): VolumeStatus {
  const t = targetFor(muscle);
  const target = t ? t.weeklySets : null;
  const isFloor = t?.isFloor ?? false;

  if (frequency === 0) {
    return { frequency, weeklySets, target, isFloor, status: 'missing' };
  }
  if (target == null) {
    return { frequency, weeklySets, target, isFloor, status: 'ok' };
  }

  const lowBound = target * 0.75;
  const highBound = isFloor ? Infinity : target * 1.35;

  const status: VolumeStatus['status'] = weeklySets < lowBound ? 'low' : weeklySets > highBound ? 'high' : 'ok';
  return { frequency, weeklySets, target, isFloor, status };
}

export interface MuscleVolumeRow extends VolumeStatus {
  muscle: string;
}

// Aggregates target sets and frequency per muscle across a routine's workouts, and
// fills in any muscle from `allMuscles` that the routine doesn't train at all - so
// a fully-missing muscle group shows up as a gap instead of silently not appearing.
export function computeMuscleVolumeRows(routine: Routine, allMuscles: string[]): MuscleVolumeRow[] {
  const byMuscle = new Map<string, { sets: number; workoutIds: Set<number> }>();
  for (const w of routine.workouts) {
    for (const ex of w.exercises) {
      const cur = byMuscle.get(ex.muscle) || { sets: 0, workoutIds: new Set<number>() };
      cur.sets += ex.target_sets || 0;
      cur.workoutIds.add(w.id);
      byMuscle.set(ex.muscle, cur);
    }
  }

  const musclesToShow = new Set([...allMuscles, ...byMuscle.keys()]);
  return [...musclesToShow].sort().map((muscle) => {
    const data = byMuscle.get(muscle) || { sets: 0, workoutIds: new Set<number>() };
    return { muscle, ...evaluateVolume(data.workoutIds.size, data.sets, muscle) };
  });
}
