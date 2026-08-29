export interface BodyweightPoint {
  date: string;
  weight: number;
}

export interface TodayWorkout {
  id: number;
  name: string;
  exercise_count: number;
  routine_name: string;
}

export interface PerformanceRow {
  label: string;
  trend: string;
}

export interface BodyFatMethods {
  navy: number | null;
  deurenberg: number | null;
  inbody: number | null;
}

export interface DashboardData {
  weight: number | null;
  sleep_minutes: number | null;
  steps: number | null;
  bodyweight_trend: BodyweightPoint[];
  today_workout: TodayWorkout | null;
  body_fat_pct: number | null;
  body_fat_methods: BodyFatMethods;
  ffmi: number | null;
  adherence_pct: number;
  phase: string | null;
  phase_start_date: string | null;
  performance: PerformanceRow[];
}

export interface MuscleRatio {
  label: string;
  ratio: number;
  pct: string;
}

export interface StrengthMapData {
  muscles: MuscleRatio[];
  note?: string;
}

export interface Profile {
  height_cm: number | null;
  sex: string | null;
  birthdate: string | null;
  current_phase: string | null;
  phase_start_date: string | null;
}

export interface BodyStat {
  id: number;
  date: string;
  weight: number | null;
  waist: number | null;
  neck: number | null;
  hip: number | null;
  body_fat_manual: number | null;
  calories: number | null;
  protein_g: number | null;
  carbs_g: number | null;
  fat_g: number | null;
  steps: number | null;
  sleep_minutes: number | null;
  cardio_minutes: number | null;
  on_diet: boolean | null;
  cheat_meal: boolean | null;
  notes: string | null;
}

export interface Exercise {
  id: number;
  name: string;
  equipment: string | null;
  is_compound: boolean;
  youtube_url: string | null;
  joint_action: string | null;
  plane: string | null;
  muscle: string;
  muscle_group: string;
}

export interface ExerciseFilters {
  muscle_groups: string[];
  joint_actions: string[];
  planes: string[];
}

export interface WorkoutExerciseEntry {
  id: number;
  order_index: number;
  target_sets: number | null;
  rep_range_min: number | null;
  rep_range_max: number | null;
  rir_target: number | null;
  rest_seconds: number | null;
  comments: string | null;
  exercise_id: number;
  name: string;
  equipment: string | null;
  muscle: string;
  joint_action: string | null;
  plane: string | null;
}

export interface LastSet {
  set_number: number;
  weight: number | null;
  reps: number | null;
  rir: number | null;
}

export type LastSetsByExercise = Record<number, LastSet[]>;

export interface Workout {
  id: number;
  name: string;
  day_index: number | null;
  exercises: WorkoutExerciseEntry[];
}

export interface Routine {
  id: number;
  name: string;
  is_active: boolean;
  workouts: Workout[];
}

export interface SetLog {
  id: number;
  workout_exercise_id: number;
  set_number: number;
  weight: number | null;
  reps: number | null;
  rir: number | null;
}

export interface WorkoutSession {
  id: number;
  workout_id: number;
  workout_name: string;
  date: string;
  finished_at: string | null;
  sets: SetLog[];
}
