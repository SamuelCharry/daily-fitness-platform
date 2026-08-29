import type { WorkoutSession } from '../types';

export interface RirBreakdown {
  workingSets: number;
  looseSets: number;
  unrated: number;
  total: number;
  workingPct: number;
}

// A "working set" is 0-2 RIR, per the manual's definition - anything looser didn't
// come close enough to failure to count as a real growth stimulus.
export function computeRirBreakdown(sessions: WorkoutSession[]): RirBreakdown {
  let workingSets = 0;
  let looseSets = 0;
  let unrated = 0;

  for (const session of sessions) {
    for (const set of session.sets) {
      if (set.rir == null) unrated++;
      else if (set.rir <= 2) workingSets++;
      else looseSets++;
    }
  }

  const total = workingSets + looseSets + unrated;
  return { workingSets, looseSets, unrated, total, workingPct: total ? Math.round((workingSets / total) * 100) : 0 };
}

export interface ExerciseNameLookup {
  [workoutExerciseId: number]: { name: string; muscle: string };
}

export interface StallAlert {
  workoutExerciseId: number;
  name: string;
  muscle: string;
  sessionsChecked: number;
  message: string;
}

// Reactive deload signal: an exercise whose top set hasn't improved (weight or reps)
// across its last 2+ logged sessions. Mirrors the manual's "deload reactively, not on
// a schedule" stance - only flag it when the data actually shows stagnation.
export function findStalls(sessions: WorkoutSession[], lookup: ExerciseNameLookup): StallAlert[] {
  const byExercise = new Map<number, { date: string; topWeight: number; topReps: number }[]>();

  const sorted = [...sessions]
    .filter((s) => s.finished_at != null)
    .sort((a, b) => a.date.localeCompare(b.date));

  for (const session of sorted) {
    const perExercise = new Map<number, { topWeight: number; topReps: number }>();
    for (const set of session.sets) {
      if (set.weight == null && set.reps == null) continue;
      const cur = perExercise.get(set.workout_exercise_id) || { topWeight: 0, topReps: 0 };
      cur.topWeight = Math.max(cur.topWeight, set.weight || 0);
      cur.topReps = Math.max(cur.topReps, set.reps || 0);
      perExercise.set(set.workout_exercise_id, cur);
    }
    for (const [weId, best] of perExercise) {
      const list = byExercise.get(weId) || [];
      list.push({ date: session.date, ...best });
      byExercise.set(weId, list);
    }
  }

  const alerts: StallAlert[] = [];
  for (const [weId, points] of byExercise) {
    if (points.length < 3) continue;
    const last3 = points.slice(-3);
    const improved = (a: (typeof last3)[number], b: (typeof last3)[number]) =>
      b.topWeight > a.topWeight || (b.topWeight === a.topWeight && b.topReps > a.topReps);
    const stalledRecently = !improved(last3[0], last3[1]) && !improved(last3[1], last3[2]);
    if (stalledRecently) {
      const info = lookup[weId];
      alerts.push({
        workoutExerciseId: weId,
        name: info?.name || `Exercise #${weId}`,
        muscle: info?.muscle || '',
        sessionsChecked: last3.length,
        message: `No improvement in weight or reps across the last ${last3.length} sessions.`,
      });
    }
  }
  return alerts;
}
