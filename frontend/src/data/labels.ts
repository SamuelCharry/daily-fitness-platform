// Spanish display names for the library's English keys. Exercise names stay as
// they are in the library; only muscles, joint actions and planes are translated.

const MUSCLES: Record<string, string> = {
  chest: 'Pecho',
  upper_pec: 'Pecho superior',
  front_delt: 'Deltoides frontal',
  side_delt: 'Deltoides lateral',
  rear_delt: 'Deltoides posterior',
  triceps: 'Tríceps',
  biceps: 'Bíceps',
  brachialis: 'Braquial',
  forearms: 'Antebrazos',
  lats: 'Dorsales',
  upper_back: 'Espalda alta',
  traps: 'Trapecios',
  spinal_erectors: 'Erectores',
  quads: 'Cuádriceps',
  hamstrings: 'Isquios',
  glutes: 'Glúteos',
  calves: 'Gemelos',
  abs: 'Abdomen',
  obliques: 'Oblicuos',
};

const JOINT_ACTIONS: Record<string, string> = {
  'Elbow Extension': 'extensión de codo',
  'Elbow Flexion': 'flexión de codo',
  'Horizontal Pull': 'tirón horizontal',
  'Vertical Pull': 'tirón vertical',
  'Horizontal Push': 'empuje horizontal',
  'Incline Push': 'empuje inclinado',
  'Horizontal Adduction': 'aducción horizontal',
  'Incline Adduction': 'aducción inclinada',
  'Horizontal Abduction': 'abducción horizontal',
  'Scapular Elevation': 'elevación escapular',
  'Shoulder Extension': 'extensión de hombro',
  'Shoulder Flexion': 'flexión de hombro',
  'Shoulder Abduction': 'abducción de hombro',
  'Spinal Extension': 'extensión de columna',
  'Spinal Flexion': 'flexión de columna',
  'Hip Hinge': 'bisagra de cadera',
  'Hip Extension': 'extensión de cadera',
  'Hip Flexion': 'flexión de cadera',
  'Hip Abduction': 'abducción de cadera',
  'Knee Extension': 'extensión de rodilla',
  'Knee Flexion': 'flexión de rodilla',
  'Ankle Plantarflexion': 'flexión plantar',
  'Wrist Flexion': 'flexión de muñeca',
  'Wrist Extension': 'extensión de muñeca',
  Grip: 'agarre',
  'Trunk Rotation': 'rotación de tronco',
  'Lateral Flexion': 'flexión lateral',
};

const PLANES: Record<string, string> = { Sagittal: 'sagital', Frontal: 'frontal', Transverse: 'transversal' };

export const WEEKDAYS = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
export const WEEKDAYS_SHORT = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

export function muscleName(key: string): string {
  return MUSCLES[key] || key.replaceAll('_', ' ');
}

export function jointActionName(action: string | null): string {
  if (!action) return '—';
  return JOINT_ACTIONS[action] || action.toLowerCase();
}

export function planeName(plane: string | null): string {
  if (!plane) return '—';
  return PLANES[plane] || plane.toLowerCase();
}

export function plural(n: number, one: string, many: string): string {
  return `${n} ${n === 1 ? one : many}`;
}
