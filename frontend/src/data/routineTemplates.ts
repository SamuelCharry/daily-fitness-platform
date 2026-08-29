// Default routine templates, ranked by per-muscle training frequency — the
// variable the Glossary's "Frequency" and "Volume" entries treat as the main
// lever, and the same reasoning behind computeMuscleVolumeRows' min/max bands.
// Full Body trains everything most often, so it's the default recommendation;
// straight-through PPL trains each muscle least often, so it ranks last.

export type SessionLength = 45 | 60 | 90;

export const SESSION_LENGTHS: SessionLength[] = [45, 60, 90];

export interface TemplateDay {
  name: string;
  muscles: string[];
}

export interface RoutineTemplate {
  key: 'full_body' | 'upper_lower' | 'ppl';
  label: string;
  daysPerWeek: number;
  frequencyPerMuscle: number;
  rank: number; // 1 = recommended first
  rationale: string;
  days: TemplateDay[];
}

const UPPER_MUSCLES = ['chest', 'upper_pec', 'front_delt', 'side_delt', 'rear_delt', 'lats', 'upper_back', 'traps', 'triceps', 'biceps', 'brachialis', 'forearms'];
const LOWER_MUSCLES = ['quads', 'hamstrings', 'glutes', 'calves', 'spinal_erectors', 'abs', 'obliques'];
const ALL_MUSCLES = [...UPPER_MUSCLES, ...LOWER_MUSCLES];

const PUSH_MUSCLES = ['chest', 'upper_pec', 'front_delt', 'side_delt', 'triceps'];
const PULL_MUSCLES = ['lats', 'upper_back', 'traps', 'rear_delt', 'biceps', 'brachialis', 'forearms', 'spinal_erectors'];
const LEGS_MUSCLES = ['quads', 'hamstrings', 'glutes', 'calves', 'abs', 'obliques'];

export const ROUTINE_TEMPLATES: RoutineTemplate[] = [
  {
    key: 'full_body',
    label: 'Full Body',
    daysPerWeek: 3,
    frequencyPerMuscle: 3,
    rank: 1,
    rationale:
      'Every session trains everything, landing each muscle around 3x/week — the highest frequency of the three. Current evidence favors higher frequency for the same weekly volume, which is why this is the recommended default if 3 sessions/week works for your schedule.',
    days: [
      { name: 'Full Body A', muscles: ALL_MUSCLES },
      { name: 'Full Body B', muscles: ALL_MUSCLES },
      { name: 'Full Body C', muscles: ALL_MUSCLES },
    ],
  },
  {
    key: 'upper_lower',
    label: 'Upper / Lower',
    daysPerWeek: 4,
    frequencyPerMuscle: 2,
    rank: 2,
    rationale:
      'Two upper + two lower sessions land each muscle at 2x/week — the frequency most current research treats as a sweet spot — while giving more room per session for isolation work than Full Body does.',
    days: [
      { name: 'Upper A', muscles: UPPER_MUSCLES },
      { name: 'Lower A', muscles: LOWER_MUSCLES },
      { name: 'Upper B', muscles: UPPER_MUSCLES },
      { name: 'Lower B', muscles: LOWER_MUSCLES },
    ],
  },
  {
    key: 'ppl',
    label: 'Push / Pull / Legs',
    daysPerWeek: 3,
    frequencyPerMuscle: 1.5,
    rank: 3,
    rationale:
      "Push, Pull, and Legs each get trained once before the cycle repeats, so most muscles land around 1–1.5x/week by the time rest days are accounted for — the lowest frequency of the three. It packs in the most volume and exercise variety per muscle in a single sitting, but needs more training days than Full Body or Upper/Lower to reach the same frequency.",
    days: [
      { name: 'Push', muscles: PUSH_MUSCLES },
      { name: 'Pull', muscles: PULL_MUSCLES },
      { name: 'Legs', muscles: LEGS_MUSCLES },
    ],
  },
];

interface LoadPlan {
  exercisesPerMuscle: number;
  extraForBigMuscles: number;
  setsPerExercise: number;
}

const BIG_MUSCLES = new Set(['chest', 'upper_back', 'lats', 'quads', 'hamstrings', 'glutes']);

const LOAD_TABLE: Record<RoutineTemplate['key'], Record<SessionLength, LoadPlan>> = {
  full_body: {
    45: { exercisesPerMuscle: 1, extraForBigMuscles: 0, setsPerExercise: 2 },
    60: { exercisesPerMuscle: 1, extraForBigMuscles: 0, setsPerExercise: 3 },
    90: { exercisesPerMuscle: 1, extraForBigMuscles: 1, setsPerExercise: 3 },
  },
  upper_lower: {
    45: { exercisesPerMuscle: 1, extraForBigMuscles: 0, setsPerExercise: 3 },
    60: { exercisesPerMuscle: 1, extraForBigMuscles: 1, setsPerExercise: 3 },
    90: { exercisesPerMuscle: 1, extraForBigMuscles: 1, setsPerExercise: 4 },
  },
  ppl: {
    45: { exercisesPerMuscle: 1, extraForBigMuscles: 1, setsPerExercise: 3 },
    60: { exercisesPerMuscle: 1, extraForBigMuscles: 1, setsPerExercise: 4 },
    90: { exercisesPerMuscle: 2, extraForBigMuscles: 1, setsPerExercise: 3 },
  },
};

export function loadPlanFor(templateKey: RoutineTemplate['key'], minutes: SessionLength): LoadPlan {
  return LOAD_TABLE[templateKey][minutes];
}

export function isBigMuscle(muscle: string): boolean {
  return BIG_MUSCLES.has(muscle);
}
