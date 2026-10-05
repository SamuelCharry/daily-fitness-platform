// Turns a routine's weekly plan into plain-language warnings. Every warning says
// which kind of problem it is (volumen, frecuencia, recuperación, redundancia,
// agenda), what was found and what to do about it.
import type { Routine, Workout, WorkoutExerciseEntry } from '../types';
import { evaluateVolume, type MuscleVolumeRow } from './volumeGuideline';
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
  for (const e of workout.exercises) sets.set(e.muscle, (sets.get(e.muscle) || 0) + (e.target_sets || 0));
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

  const byMuscle = new Map<string, { sets: number; days: Set<number> }>();
  for (const w of scheduled) {
    for (const [muscle, sets] of muscleSets(w)) {
      const current = byMuscle.get(muscle) || { sets: 0, days: new Set<number>() };
      current.sets += sets;
      current.days.add(w.id);
      byMuscle.set(muscle, current);
    }
  }
  const rows = [...new Set([...allMuscles, ...byMuscle.keys()])].sort((a, b) => muscleName(a).localeCompare(muscleName(b))).map(muscle => {
    const data = byMuscle.get(muscle) || { sets: 0, days: new Set<number>() };
    return { muscle, ...evaluateVolume(data.days.size, data.sets, muscle) };
  });

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

  // Volumen
  const untrained = rows.filter(r => r.status === 'missing' && r.target != null && r.target > 0);
  if (untrained.length) warnings.push({ key: 'vol-missing', kind: 'volumen', title: `Sin trabajo: ${untrained.map(r => muscleName(r.muscle)).join(', ')}`, detail: `Ningún día de la semana ${untrained.length === 1 ? 'lo entrena' : 'los entrena'} y ${untrained.length === 1 ? 'tiene' : 'tienen'} objetivo semanal. Agrega ejercicios en algún día.` });
  for (const r of rows) {
    if (r.target == null || r.target === 0) continue;
    const target = `${r.target}${r.isFloor ? '+' : ''}`;
    if (r.status === 'low') warnings.push({ key: `vol-low-${r.muscle}`, kind: 'volumen', muscle: r.muscle, title: `${muscleName(r.muscle)}: poco volumen (${r.weeklySets} de ${target} series)`, detail: 'Está por debajo del 75 % de tu objetivo semanal. Suma series o un ejercicio.' });
    else if (r.status === 'high') warnings.push({ key: `vol-high-${r.muscle}`, kind: 'volumen', muscle: r.muscle, title: `${muscleName(r.muscle)}: demasiado volumen (${r.weeklySets} de ${target} series)`, detail: 'Pasa en más de un 35 % tu objetivo. Más series aquí suman fatiga sin mucho estímulo extra.' });
  }

  // Frecuencia: only meaningful for muscles with a real weekly target.
  for (const r of rows) {
    if (r.frequency === 1 && r.target != null && r.target >= 3) {
      const day = scheduled.find(w => byMuscle.get(r.muscle)?.days.has(w.id));
      warnings.push({ key: `freq-${r.muscle}`, kind: 'frecuencia', muscle: r.muscle, title: `${muscleName(r.muscle)}: solo 1 día por semana`, detail: `Todo su volumen cae en ${day?.name || 'un solo día'}. Repartir las mismas series en 2 días suele dar mejor resultado y series de más calidad.` });
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
