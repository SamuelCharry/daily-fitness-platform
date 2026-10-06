// TNF Muscle Building Manual, PDF pp. 18–19. Direct sets per training DAY,
// assuming 0–1 RIR. Starting guidelines, not physiological limits.
export interface VolumeBaseline { min: number; max: number | null }
export function baselineFor(frequency: number): VolumeBaseline | null {
  if (frequency <= 0) return null;
  if (frequency === 1) return { min: 6, max: null };
  if (frequency === 2) return { min: 2, max: 6 };
  return { min: 1, max: 3 };
}
export function baselineLabel(baseline: VolumeBaseline | null): string {
  if (!baseline) return '—';
  return baseline.max == null ? `${baseline.min}+` : `${baseline.min}–${baseline.max}`;
}
