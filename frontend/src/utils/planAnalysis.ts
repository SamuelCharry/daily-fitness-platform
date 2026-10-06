// Turns a routine's weekly plan into plain-language warnings. Every warning says
// which kind of problem it is (volumen, frecuencia, recuperación, redundancia,
// agenda), what was found and what to do about it.
import type { Routine, Workout, WorkoutExerciseEntry } from '../types';
import { volumeRowsFor, volumeMuscle, volumeMuscleName, type MuscleVolumeRow } from './volumeGuideline';
import { baselineLabel } from '../data/muscleVolumeTargets';
import { jointActionName, muscleName, planeName, WEEKDAYS } from '../data/labels';

export type WarningKind = 'volumen' | 'frecuencia' | 'recuperacion' | 'redundancia' | 'agenda';

export interface PlanWarning {
  key: string;
  kind: WarningKind;
  title: string;
  detail: string;
  muscle?: string;
  workoutId?: number;
}

// Display order: fix the calendar first, then what hurts recovery, then volume.
export const KIND_LABEL: Record<WarningKind, string> = {
  agenda: 'Agenda',
  recuperacion: 'Recuperación',
  redundancia: 'Redundancia',
  volumen: 'Volumen',
  frecuencia: 'Frecuencia',
};

// Small muscles that recover within a day; back-to-back days for them are fine.
const FAST_RECOVERY = new Set(['abs', 'obliques', 'calves', 'forearms']);

export interface RedundantPair {
  other: string;
  muscle: string;
  jointAction: string | null;
  plane: string | null;
}

// Exercises in the same day that hit the same muscle through the same joint action.
export function redundantPairs(exercises: WorkoutExerciseEntry[]): Map<number, RedundantPair> {
  const found = new Map<number, RedundantPair>();
  exercises.forEach((a, i) => exercises.forEach((b, j) => {
    if (i !== j && !found.has(a.exercise_id) && a.muscle === b.muscle && a.joint_action && a.joint_action === b.joint_action) {
      found.set(a.exercise_id, { other: b.name, muscle: a.muscle, jointAction: a.joint_action, plane: a.plane });
    }
  }));
  return found;
}

function muscleSets(workout: Workout): Map<string, number> {
  const sets = new Map<string, number>();
  for (const e of workout.exercises) {
    if (!(e.target_sets && e.target_sets > 0)) continue;
    const muscle = volumeMuscle(e.muscle);
    sets.set(muscle, (sets.get(muscle) || 0) + e.target_sets);
  }
  return sets;
}

export interface PlanAnalysis {
  scheduled: Workout[];
  usesSchedule: boolean;
  rows: MuscleVolumeRow[];
  warnings: PlanWarning[];
}

export function analysePlan(routine: Routine, allMuscles: string[]): PlanAnalysis {
  const scheduledOnly = routine.workouts.filter(w => w.weekday != null);
  const usesSchedule = scheduledOnly.length > 0;
  // Until days are on the calendar, assume every day of the routine is trained once a week.
  const scheduled = usesSchedule ? scheduledOnly : routine.workouts;
  const warnings: PlanWarning[] = [];

  const rows = volumeRowsFor(scheduled, allMuscles);

  // Agenda
  if (!routine.workouts.length) {
    warnings.push({ key: 'agenda-empty', kind: 'agenda', title: 'Tu programa no tiene días', detail: 'Agrega un día (Push, Pull, Upper…) y arrástralo a la semana.' });
  } else if (!usesSchedule) {
    warnings.push({ key: 'agenda-none', kind: 'agenda', title: 'Ningún día está en el calendario', detail: 'Arrastra cada día a la semana. Mientras tanto, los cálculos suponen que haces cada día una vez por semana.' });
  } else {
    const loose = routine.workouts.filter(w => w.weekday == null);
    if (loose.length) warnings.push({ key: 'agenda-loose', kind: 'agenda', title: `${loose.map(w => w.name).join(', ')} sin día asignado`, detail: 'Los días sin fecha no cuentan en el volumen ni en la frecuencia. Arrástralos a la semana o elimínalos.' });
    for (let d = 0; d < 7; d++) {
      const same = scheduled.filter(w => w.weekday === d);
      if (same.length > 1) warnings.push({ key: `agenda-double-${d}`, kind: 'agenda', title: `${WEEKDAYS[d]}: ${same.map(w => w.name).join(' + ')}`, detail: 'Dos entrenos el mismo día. Si es a propósito (doble sesión) está bien; si no, mueve uno a un día libre.' });
    }
  }

  // TNF baseline: compare each training day's DIRECT sets, never a weekly average.
  // No direct work is descriptive in the summary, not a mandatory training target.
  for (const r of rows) {
    if (!r.baseline) continue;
    for (const [index, day] of r.days.entries()) {
      const low = day.sets < r.baseline.min;
      const high = r.baseline.max != null && day.sets > r.baseline.max;
      if (!low && !high) continue;
      const label = day.weekday == null ? day.names.join(' + ') : `${WEEKDAYS[day.weekday]} · ${day.names.join(' + ')}`;
      warnings.push({ key: `vol-${r.muscle}-${index}`, kind: 'volumen', muscle: r.muscle, workoutId: day.workoutIds[0],
        title: `${volumeMuscleName(r.muscle)}: ${day.sets} series en ${label}`,
        detail: `${r.frequency} días/semana → baseline TNF de ${baselineLabel(r.baseline)} series directas por día. Este día queda ${low ? 'por debajo' : 'por encima'}. Es un punto de partida para series a 0–1 RIR; revisa esfuerzo, progreso y recuperación antes de ajustar.` });
    }
  }

  // Recuperación: the same muscle on back-to-back days (Sunday → Monday included).
  if (usesSchedule) {
    for (let d = 0; d < 7; d++) {
      const next = (d + 1) % 7;
      for (const a of scheduled.filter(w => w.weekday === d)) {
        for (const b of scheduled.filter(w => w.weekday === next)) {
          const sa = muscleSets(a), sb = muscleSets(b);
          const shared = [...sa.keys()].filter(m => !FAST_RECOVERY.has(m) && sb.has(m) && sa.get(m)! >= 2 && sb.get(m)! >= 2);
          if (shared.length) warnings.push({ key: `rec-${a.id}-${b.id}`, kind: 'recuperacion', workoutId: b.id, title: `${shared.map(muscleName).join(', ')}: ${WEEKDAYS[d].toLowerCase()} y ${WEEKDAYS[next].toLowerCase()} seguidos`, detail: `${a.name} y ${b.name} trabajan lo mismo con menos de 48 h de descanso. Deja un día entre ellos o cambia el orden de la semana.` });
        }
      }
    }
  }

  // Redundancia
  for (const w of routine.workouts) {
    const seen = new Set<string>();
    for (const [, pair] of redundantPairs(w.exercises)) {
      const group = `${pair.muscle}-${pair.jointAction}`;
      if (seen.has(group)) continue;
      seen.add(group);
      const names = w.exercises.filter(e => e.muscle === pair.muscle && e.joint_action === pair.jointAction).map(e => e.name);
      warnings.push({ key: `red-${w.id}-${group}`, kind: 'redundancia', workoutId: w.id, muscle: pair.muscle, title: `${w.name}: ${names.join(' y ')} hacen lo mismo`, detail: `Ambos trabajan ${muscleName(pair.muscle).toLowerCase()} con ${jointActionName(pair.jointAction)} (plano ${planeName(pair.plane)}). Compiten por la misma recuperación sin añadir un estímulo nuevo: cambia uno por otro movimiento o junta sus series en uno.` });
    }
  }

  return { scheduled, usesSchedule, rows, warnings };
}
