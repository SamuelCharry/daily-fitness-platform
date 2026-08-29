// Natural-lifter FFMI classification bands, commonly cited in the physique-tracking
// space (derived from Kouri et al.'s study of steroid-free bodybuilders). Bands are
// calibrated for men; women's natural FFMI tends to run roughly 3-4 points lower for
// the same relative development, so we shift the bands down for a female profile.

interface Band {
  max: number;
  label: string;
}

const MALE_BANDS: Band[] = [
  { max: 18, label: 'Below average' },
  { max: 19, label: 'Average' },
  { max: 20, label: 'Above average' },
  { max: 21, label: 'Excellent' },
  { max: 22, label: 'Superior' },
  { max: 23, label: 'Rare natural ceiling' },
  { max: Infinity, label: 'Beyond the typical natural range' },
];

const FEMALE_SHIFT = 3.5;

export function classifyFFMI(ffmi: number, sex: 'male' | 'female' | null): string {
  const adjusted = sex === 'female' ? ffmi + FEMALE_SHIFT : ffmi;
  const band = MALE_BANDS.find((b) => adjusted <= b.max) || MALE_BANDS[MALE_BANDS.length - 1];
  return band.label;
}
