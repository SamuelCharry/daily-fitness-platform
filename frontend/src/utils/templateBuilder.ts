import type { Exercise } from '../types';
import { isBigMuscle, loadPlanFor, type RoutineTemplate, type SessionLength } from '../data/routineTemplates';

export interface BuiltWorkoutExercise {
  exercise_id: number;
  order_index: number;
  target_sets: number;
  comments: string | null;
}

export interface BuiltWorkout {
  name: string;
  day_index: number;
  exercises: BuiltWorkoutExercise[];
}

function pickForMuscle(pool: Exercise[], count: number, rotationOffset: number): Exercise[] {
  if (pool.length === 0) return [];
  const sorted = [...pool].sort((a, b) => {
    if (a.is_compound !== b.is_compound) return a.is_compound ? -1 : 1;
    return a.name.localeCompare(b.name);
  });
  const picked: Exercise[] = [];
  for (let i = 0; i < count; i++) {
    picked.push(sorted[(i + rotationOffset) % sorted.length]);
  }
  // De-dupe in case the rotation wrapped onto the same exercise twice (small pools).
  return [...new Map(picked.map((e) => [e.id, e])).values()];
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
      const picked = pickForMuscle(pool, count, dayIndex);
      picked.forEach((ex) => {
        dayExercises.push({
          exercise_id: ex.id,
          order_index: 0,
          target_sets: plan.setsPerExercise,
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
