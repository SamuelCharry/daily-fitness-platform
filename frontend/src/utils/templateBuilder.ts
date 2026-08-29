import type { Exercise } from '../types';
import { isBigMuscle, loadPlanFor, type RoutineTemplate, type SessionLength } from '../data/routineTemplates';

export interface BuiltWorkoutExercise {
  exercise_id: number;
  order_index: number;
  target_sets: number;
  rep_range_min: number;
  rep_range_max: number;
  rir_target: number;
  rest_seconds: number;
  comments: string | null;
}

export interface BuiltWorkout {
  name: string;
  day_index: number;
  exercises: BuiltWorkoutExercise[];
}

// Same day-type always gets the same exercise for a given muscle (AAA, not ABC) -
// a repeated Full Body or Upper day should be the same session run again, not a
// different variant, so progress tracking on an exercise stays continuous week to week.
function pickForMuscle(pool: Exercise[], count: number): Exercise[] {
  if (pool.length === 0) return [];
  const sorted = [...pool].sort((a, b) => {
    if (a.is_compound !== b.is_compound) return a.is_compound ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  return sorted.slice(0, count);
}

// Builds each day's workout body ready to POST, picking real exercises from the
// live library for every muscle the template assigns to that day, with the
// exercise count and set target scaled by how long a session should run.
export function buildWorkoutsFromTemplate(
  template: RoutineTemplate,
  minutes: SessionLength,
  exercises: Exercise[],
): BuiltWorkout[] {
  const plan = loadPlanFor(template.key, minutes);

  return template.days.map((day, dayIndex) => {
    const dayExercises: BuiltWorkoutExercise[] = [];

    day.muscles.forEach((muscle) => {
      const pool = exercises.filter((e) => e.muscle === muscle);
      if (pool.length === 0) return;
      const count = plan.exercisesPerMuscle + (isBigMuscle(muscle) ? plan.extraForBigMuscles : 0);
      const picked = pickForMuscle(pool, count);
      picked.forEach((ex) => {
        // Compounds default to a lower-rep, longer-rest scheme; isolation work to
        // higher reps and shorter rest - both are starting points, editable per row.
        dayExercises.push({
          exercise_id: ex.id,
          order_index: 0,
          target_sets: plan.setsPerExercise,
          rep_range_min: ex.is_compound ? 6 : 10,
          rep_range_max: ex.is_compound ? 10 : 15,
          rir_target: 2,
          rest_seconds: ex.is_compound ? 120 : 75,
          comments: null,
        });
      });
    });

    return {
      name: day.name,
      day_index: dayIndex,
      exercises: dayExercises.map((e, i) => ({ ...e, order_index: i })),
    };
  });
}
