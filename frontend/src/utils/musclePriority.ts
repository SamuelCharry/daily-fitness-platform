// Per-browser muscle priority ranking (1 = weak/priority, 3 = strong), following the
// Muscle Building Manual's ranking method. Stored locally rather than on the backend
// since it's a personal ordering preference, not shared data.

const KEY = 'df_muscle_priority';

export type PriorityMap = Record<string, 1 | 2 | 3>;

export function loadPriorities(): PriorityMap {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function savePriorities(map: PriorityMap) {
  try {
    localStorage.setItem(KEY, JSON.stringify(map));
  } catch {
    // ignore storage errors (private browsing, quota, etc.)
  }
}

export function setPriority(muscle: string, rank: 1 | 2 | 3) {
  const map = loadPriorities();
  map[muscle] = rank;
  savePriorities(map);
}
