// Formulas lifted from the TNF Fat Loss Guide's calorie/macro tables, rewritten as functions.
// Book tables are in lbs/feet-inches; we convert since the app stores kg/cm.

const KG_TO_LB = 2.20462;
const CM_TO_IN = 1 / 2.54;

type Sex = 'male' | 'female';

// [bodyweight upper bound in lbs, multiplier low, multiplier high]
const CALORIE_BANDS: Record<Sex, [number, number, number][]> = {
  male: [
    [200, 10, 14],
    [250, 9, 12],
    [300, 8, 10],
    [400, 7, 8],
    [Infinity, 5, 7],
  ],
  female: [
    [150, 11, 16],
    [200, 10, 13],
    [250, 9, 12],
    [300, 8, 10],
    [400, 7, 8],
    [Infinity, 5, 7],
  ],
};

export function calorieRangeForWeight(sex: Sex, weightKg: number): { low: number; high: number } {
  const lbs = weightKg * KG_TO_LB;
  const bands = CALORIE_BANDS[sex];
  const band = bands.find((b) => lbs <= b[0]) || bands[bands.length - 1];
  return { low: Math.round(lbs * band[1]), high: Math.round(lbs * band[2]) };
}

// Height-anchor points (inches -> grams), interpolated linearly between them.
const PROTEIN_ANCHORS: Record<Sex, [number, number][]> = {
  male: [
    [63, 135],
    [66, 150],
    [69, 165],
    [72, 185],
    [75, 205],
    [78, 230],
  ],
  female: [
    [57, 90],
    [60, 100],
    [63, 115],
    [66, 130],
    [69, 145],
    [72, 165],
  ],
};

const FAT_ANCHORS: Record<Sex, [number, number][]> = {
  male: [
    [63, 45],
    [66, 52],
    [69, 60],
    [72, 70],
    [75, 81],
    [78, 93],
  ],
  female: [
    [57, 45],
    [60, 50],
    [63, 57],
    [66, 65],
    [69, 74],
    [72, 85],
  ],
};

function interpolate(anchors: [number, number][], x: number): number {
  if (x <= anchors[0][0]) return anchors[0][1];
  const last = anchors[anchors.length - 1];
  if (x >= last[0]) return last[1];
  for (let i = 0; i < anchors.length - 1; i++) {
    const [x0, y0] = anchors[i];
    const [x1, y1] = anchors[i + 1];
    if (x >= x0 && x <= x1) {
      return y0 + ((y1 - y0) * (x - x0)) / (x1 - x0);
    }
  }
  return last[1];
}

export function proteinMinimumG(sex: Sex, heightCm: number): number {
  return Math.round(interpolate(PROTEIN_ANCHORS[sex], heightCm * CM_TO_IN));
}

export function fatMinimumG(sex: Sex, heightCm: number): number {
  return Math.round(interpolate(FAT_ANCHORS[sex], heightCm * CM_TO_IN));
}

export interface MacroTargets {
  calories: number;
  proteinG: number;
  fatG: number;
  carbsG: number;
}

export type CalorieAggressiveness = 'gentler' | 'moderate' | 'faster';

export function computeMacros(
  sex: Sex,
  weightKg: number,
  heightCm: number,
  aggressiveness: CalorieAggressiveness = 'moderate',
): MacroTargets {
  const { low, high } = calorieRangeForWeight(sex, weightKg);
  const calories = aggressiveness === 'faster' ? low : aggressiveness === 'gentler' ? high : Math.round((low + high) / 2);
  const proteinG = proteinMinimumG(sex, heightCm);
  const fatG = fatMinimumG(sex, heightCm);
  const carbsG = Math.max(0, Math.round((calories - proteinG * 4 - fatG * 9) / 4));
  return { calories, proteinG, fatG, carbsG };
}
