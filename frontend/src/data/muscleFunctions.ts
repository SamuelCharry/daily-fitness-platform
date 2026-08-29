// Anatomical function reference per muscle: which joint action(s) + plane(s) it
// actually does the work in, matched to the `joint_action` / `plane` tags on
// exercises in the library. Used to group the exercise picker by "what does this
// muscle do" instead of a flat alphabetical list, and to mark which exercises are
// a direct hit vs an indirect/secondary one.

export interface MuscleAction {
  action: string; // matches Exercise.joint_action
  plane: string; // matches Exercise.plane
  note: string;
}

export interface MuscleFunction {
  muscle: string; // matches Exercise.muscle key (snake_case)
  label: string;
  groupLabel: string;
  summary: string;
  actions: MuscleAction[];
}

export const MUSCLE_FUNCTIONS: MuscleFunction[] = [
  {
    muscle: 'chest',
    label: 'Chest',
    groupLabel: 'Chest',
    summary:
      'The pec major does two things: pushes the arm away from the body (horizontal push) and pulls it across the front of the body (horizontal adduction). Presses build the base; flyes isolate the adduction.',
    actions: [
      { action: 'Horizontal Push', plane: 'Sagittal', note: 'Pressing movements — bench press, push-up, dip.' },
      { action: 'Horizontal Adduction', plane: 'Transverse', note: 'Fly-pattern movements — cable crossover, pec deck.' },
    ],
  },
  {
    muscle: 'upper_pec',
    label: 'Upper Pec',
    groupLabel: 'Chest',
    summary:
      'Same two jobs as the chest, but angled upward — the clavicular head takes over more when the arm travels up and forward instead of straight out.',
    actions: [
      { action: 'Incline Push', plane: 'Sagittal', note: 'Incline press variations.' },
      { action: 'Incline Adduction', plane: 'Transverse', note: 'Low-to-high fly and crossover angles.' },
    ],
  },
  {
    muscle: 'front_delt',
    label: 'Front Delt',
    groupLabel: 'Shoulder',
    summary: 'Raises the arm forward and overhead — shoulder flexion in the sagittal plane. Gets heavy indirect work from any pressing movement already in your program.',
    actions: [{ action: 'Shoulder Flexion', plane: 'Sagittal', note: 'Overhead presses, front raises.' }],
  },
  {
    muscle: 'side_delt',
    label: 'Side Delt',
    groupLabel: 'Shoulder',
    summary:
      'Raises the arm out to the side — shoulder abduction in the frontal plane. This is the muscle that gives shoulder width, and pressing movements barely touch it — it needs its own direct work.',
    actions: [{ action: 'Shoulder Abduction', plane: 'Frontal', note: 'Lateral raises, upright rows.' }],
  },
  {
    muscle: 'rear_delt',
    label: 'Rear Delt',
    groupLabel: 'Shoulder',
    summary:
      'Pulls the arm backward, away from the midline — horizontal abduction in the transverse plane (the mirror image of a chest fly). Chronically undertrained relative to the front delt because pressing dominates most programs.',
    actions: [{ action: 'Horizontal Abduction', plane: 'Transverse', note: 'Face pulls, reverse flyes.' }],
  },
  {
    muscle: 'triceps',
    label: 'Triceps',
    groupLabel: 'Arms',
    summary: 'Straightens the elbow — elbow extension in the sagittal plane. Every pressing exercise already trains it indirectly; direct work fills in what pressing leaves on the table.',
    actions: [{ action: 'Elbow Extension', plane: 'Sagittal', note: 'Pressdowns, extensions, close-grip pressing.' }],
  },
  {
    muscle: 'biceps',
    label: 'Biceps',
    groupLabel: 'Arms',
    summary: 'Bends the elbow — elbow flexion in the sagittal plane. A supinated (palm-up) or neutral grip biases the biceps specifically.',
    actions: [{ action: 'Elbow Flexion', plane: 'Sagittal', note: 'Curl variations, palm rotated up or neutral.' }],
  },
  {
    muscle: 'brachialis',
    label: 'Brachialis',
    groupLabel: 'Arms',
    summary:
      'Also bends the elbow, but sits underneath the biceps — a neutral (hammer) or pronated (reverse) grip shifts emphasis onto it instead of the biceps.',
    actions: [{ action: 'Elbow Flexion', plane: 'Sagittal', note: 'Hammer curls, reverse-grip curls.' }],
  },
  {
    muscle: 'forearms',
    label: 'Forearms',
    groupLabel: 'Arms',
    summary: 'Flexes and extends the wrist, and grips. Usually gets enough indirect work from rows and curls; direct work mainly matters for grip-limited lifters.',
    actions: [
      { action: 'Wrist Flexion', plane: 'Sagittal', note: 'Wrist curls.' },
      { action: 'Wrist Extension', plane: 'Sagittal', note: 'Reverse wrist curls.' },
      { action: 'Grip', plane: 'Sagittal', note: 'Loaded carries.' },
    ],
  },
  {
    muscle: 'lats',
    label: 'Lats',
    groupLabel: 'Back',
    summary:
      'Pulls the arm down toward the torso from two directions: from overhead (vertical pull, e.g. pulldown) and from in front of the body (shoulder extension, e.g. straight-arm pulldown, pullover). Drives back width.',
    actions: [
      { action: 'Vertical Pull', plane: 'Sagittal', note: 'Pull-ups, lat pulldowns.' },
      { action: 'Shoulder Extension', plane: 'Sagittal', note: 'Straight-arm pulldown, pullover.' },
    ],
  },
  {
    muscle: 'upper_back',
    label: 'Upper Back',
    groupLabel: 'Back',
    summary:
      'Rows the arm backward toward the torso — horizontal pull in the sagittal plane, driving the shoulder blades together. Drives back thickness.',
    actions: [{ action: 'Horizontal Pull', plane: 'Sagittal', note: 'Any row variation.' }],
  },
  {
    muscle: 'traps',
    label: 'Traps',
    groupLabel: 'Back',
    summary: 'Elevates the shoulder blades — scapular elevation in the frontal plane. Shrugs are close to the only direct way to hit this.',
    actions: [{ action: 'Scapular Elevation', plane: 'Frontal', note: 'Shrug variations.' }],
  },
  {
    muscle: 'spinal_erectors',
    label: 'Spinal Erectors',
    groupLabel: 'Back',
    summary:
      'Extends the spine and resists it bending forward under load — spinal extension / hip hinge in the sagittal plane. Gets heavy isometric work from squats and deadlifts already.',
    actions: [
      { action: 'Spinal Extension', plane: 'Sagittal', note: 'Back extensions.' },
      { action: 'Hip Hinge', plane: 'Sagittal', note: 'Good mornings, deadlifts.' },
    ],
  },
  {
    muscle: 'quads',
    label: 'Quads',
    groupLabel: 'Legs',
    summary: 'Straightens the knee — knee extension in the sagittal plane. Any squat, press, or lunge pattern trains it; leg extension isolates it.',
    actions: [{ action: 'Knee Extension', plane: 'Sagittal', note: 'Squats, leg press, lunges, leg extension.' }],
  },
  {
    muscle: 'hamstrings',
    label: 'Hamstrings',
    groupLabel: 'Legs',
    summary:
      'Crosses both the hip and the knee, so it gets worked two ways: extending the hip with a fairly straight leg (hip hinge, e.g. RDL) and bending the knee (knee flexion, e.g. leg curl). Programs that only squat under-train it.',
    actions: [
      { action: 'Hip Hinge', plane: 'Sagittal', note: 'Romanian deadlift, stiff-leg deadlift.' },
      { action: 'Knee Flexion', plane: 'Sagittal', note: 'Leg curl variations.' },
    ],
  },
  {
    muscle: 'glutes',
    label: 'Glutes',
    groupLabel: 'Legs',
    summary:
      'Drives the hip forward (hip extension, the main growth driver) and, for the upper fibers, moves the leg out to the side (hip abduction).',
    actions: [
      { action: 'Hip Extension', plane: 'Sagittal', note: 'Hip thrusts, bridges, deadlifts.' },
      { action: 'Hip Abduction', plane: 'Frontal', note: 'Abduction machine.' },
    ],
  },
  {
    muscle: 'calves',
    label: 'Calves',
    groupLabel: 'Legs',
    summary: 'Points the foot down — ankle plantarflexion in the sagittal plane. Bent-knee (seated) and straight-knee (standing) variations bias the two calf heads differently.',
    actions: [{ action: 'Ankle Plantarflexion', plane: 'Sagittal', note: 'Calf raise variations.' }],
  },
  {
    muscle: 'abs',
    label: 'Abs',
    groupLabel: 'Core',
    summary:
      'Curls the spine forward (spinal flexion, e.g. crunch) or raises the hips/legs toward the ribs (hip flexion, e.g. hanging leg raise) — both sagittal plane.',
    actions: [
      { action: 'Spinal Flexion', plane: 'Sagittal', note: 'Crunches, cable crunch, rollout.' },
      { action: 'Hip Flexion', plane: 'Sagittal', note: 'Hanging leg raise.' },
    ],
  },
  {
    muscle: 'obliques',
    label: 'Obliques',
    groupLabel: 'Core',
    summary: 'Rotates the trunk (transverse plane) and bends it sideways (lateral flexion, frontal plane).',
    actions: [
      { action: 'Trunk Rotation', plane: 'Transverse', note: 'Woodchoppers, Russian twists.' },
      { action: 'Lateral Flexion', plane: 'Frontal', note: 'Side planks, oblique raises.' },
    ],
  },
];

export function muscleFunctionFor(muscle: string): MuscleFunction | undefined {
  return MUSCLE_FUNCTIONS.find((m) => m.muscle === muscle);
}
