// Weekly set targets per muscle, taken directly from the user's own "SISTEMA"
// program (the Upper/Lower 4x protocol tab). These replace a generic formula —
// they're the actual numbers the program is built around, not a textbook range.
// `isFloor` marks a muscle the sheet flags as "min?" — meaning the number is a
// floor to hit at minimum, not a ceiling to avoid going over.

export interface MuscleVolumeTarget {
  muscle: string;
  weeklySets: number;
  isFloor: boolean;
}

export const MUSCLE_VOLUME_TARGETS: MuscleVolumeTarget[] = [
  { muscle: 'chest', weeklySets: 4.5, isFloor: false },
  { muscle: 'upper_pec', weeklySets: 2, isFloor: false },
  { muscle: 'front_delt', weeklySets: 3.25, isFloor: false },
  { muscle: 'side_delt', weeklySets: 4, isFloor: false },
  { muscle: 'rear_delt', weeklySets: 2.25, isFloor: false },
  { muscle: 'triceps', weeklySets: 4, isFloor: false },
  { muscle: 'biceps', weeklySets: 3.75, isFloor: false },
  { muscle: 'brachialis', weeklySets: 2.5, isFloor: false },
  { muscle: 'forearms', weeklySets: 0.75, isFloor: false },
  { muscle: 'lats', weeklySets: 3.5, isFloor: false },
  { muscle: 'upper_back', weeklySets: 4, isFloor: false },
  { muscle: 'traps', weeklySets: 0.75, isFloor: false },
  { muscle: 'spinal_erectors', weeklySets: 4.5, isFloor: false },
  { muscle: 'quads', weeklySets: 5, isFloor: false },
  { muscle: 'hamstrings', weeklySets: 6.25, isFloor: true },
  { muscle: 'glutes', weeklySets: 5.75, isFloor: false },
  { muscle: 'calves', weeklySets: 3, isFloor: false },
  { muscle: 'abs', weeklySets: 3, isFloor: false },
  { muscle: 'obliques', weeklySets: 0, isFloor: false },
];

const BY_MUSCLE = new Map(MUSCLE_VOLUME_TARGETS.map((t) => [t.muscle, t]));

export function targetFor(muscle: string): MuscleVolumeTarget | undefined {
  return BY_MUSCLE.get(muscle);
}
