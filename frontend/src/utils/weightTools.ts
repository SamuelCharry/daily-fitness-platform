export type WeightUnit = "kg" | "lb";
export const displayWeight = (kg: number, unit: WeightUnit) =>
  Number((kg * (unit === "lb" ? 2.2046226218 : 1)).toFixed(2));
export const storedWeight = (weight: number, unit: WeightUnit) =>
  weight / (unit === "lb" ? 2.2046226218 : 1);
export function plates(total: number, bar: number, available: number[]) {
  if (
    !Number.isFinite(total) ||
    !Number.isFinite(bar) ||
    total < bar ||
    bar < 0 ||
    total > 10000
  )
    return null;
  const target = Math.floor((total - bar) * 50 + 1e-7);
  const sizes = [
    ...new Set(
      available
        .filter((n) => Number.isFinite(n) && n >= 0.01)
        .map((n) => Math.round(n * 100)),
    ),
  ].sort((a, b) => b - a);
  const counts = new Int32Array(target + 1).fill(1000000),
    used = new Int32Array(target + 1);
  counts[0] = 0;
  for (let n = 1; n <= target; n++)
    for (const size of sizes) {
      if (size <= n && counts[n - size] + 1 < counts[n]) {
        counts[n] = counts[n - size] + 1;
        used[n] = size;
      }
    }
  let loaded = target;
  while (loaded > 0 && !used[loaded]) loaded--;
  const map = new Map<number, number>();
  for (let n = loaded; n > 0; n -= used[n])
    map.set(used[n], (map.get(used[n]) || 0) + 1);
  return {
    result: [...map]
      .sort((a, b) => b[0] - a[0])
      .map(([size, count]) => ({ weight: size / 100, count })),
    actual: Number((bar + loaded / 50).toFixed(2)),
    exact: Math.abs(bar + loaded / 50 - total) < 0.001,
  };
}
