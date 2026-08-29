// Weekly-sets guideline by frequency, from the Muscle Building Manual's programming notes.
import type { Routine } from '../types';

export interface VolumeStatus {
  frequency: number;
  weeklySets: number;
  minRecommended: number;
  maxRecommended: number | null;
  status: 'missing' | 'low' | 'ok' | 'high';
}

export function evaluateVolume(frequency: number, weeklySets: number): VolumeStatus {
  if (frequency === 0) {
    return { frequency, weeklySets, minRecommended: 6, maxRecommended: null, status: 'missing' };
  }

  let minRecommended: number;
  let maxRecommended: number | null;

  if (frequency >= 3) {
    minRecommended = frequency * 1;
    maxRecommended = frequency * 3;
  } else if (frequency === 2) {
    minRecommended = 4;
    maxRecommended = 12;
  } else {
    minRecommended = 6;
    maxRecommended = null;
  }

  const status: VolumeStatus['status'] =
    weeklySets < minRecommended ? 'low' : maxRecommended != null && weeklySets > maxRecommended ? 'high' : 'ok';

  return { frequency, weeklySets, minRecommended, maxRecommended, status };
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
    return { muscle, ...evaluateVolume(data.workoutIds.size, data.sets) };
  });
}
