import { useMemo, useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Exercise } from '../types';
import { MUSCLE_FUNCTIONS, muscleFunctionFor } from '../data/muscleFunctions';

const GROUP_ORDER = ['Chest', 'Shoulder', 'Back', 'Arms', 'Legs', 'Core'];

export default function MuscleExercisePicker({ onPick }: { onPick: (ex: Exercise) => void }) {
  const { data: exercises, loading } = useApi(() => api.get<Exercise[]>('/api/exercises'));
  const [group, setGroup] = useState(GROUP_ORDER[0]);
  const [muscle, setMuscle] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const musclesInGroup = MUSCLE_FUNCTIONS.filter((m) => m.groupLabel === group);
  const activeMuscle = muscle ?? musclesInGroup[0]?.muscle ?? null;
  const fn = activeMuscle ? muscleFunctionFor(activeMuscle) : undefined;
  const isSearching = search.trim().length > 0;

  // Typing searches the whole library directly - browsing by muscle is there for
  // when you don't already know the name, not a tab you're forced through first.
  const searchResults = useMemo(() => {
    if (!exercises || !isSearching) return [];
    const q = search.trim().toLowerCase();
    return exercises.filter((ex) => ex.name.toLowerCase().includes(q)).slice(0, 30);
  }, [exercises, search, isSearching]);

  const exercisesForMuscle = useMemo(() => {
    if (!exercises || !activeMuscle) return [];
    return exercises.filter((ex) => ex.muscle === activeMuscle);
  }, [exercises, activeMuscle]);

  const results = isSearching ? searchResults : exercisesForMuscle;

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        gap: 12,
        background: 'var(--bg)',
        border: '1px solid var(--border)',
        borderRadius: 10,
        padding: 14,
      }}
    >
      <input
        type="text"
        placeholder="Search any exercise by name…"
        value={search}
        autoFocus
        onChange={(e) => setSearch(e.target.value)}
      />

      {!isSearching && (
        <>
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {GROUP_ORDER.map((g) => (
              <button
                key={g}
                onClick={() => {
                  setGroup(g);
                  setMuscle(null);
                }}
                style={{
                  border: 'none',
                  background: group === g ? 'var(--accent)' : 'var(--hover-bg)',
                  color: group === g ? 'var(--accent-text)' : 'var(--nav-inactive)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  font: "600 11.5px/1 'Inter Tight', sans-serif",
                }}
              >
                {g}
              </button>
            ))}
          </div>

          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
            {musclesInGroup.map((m) => (
              <span
                key={m.muscle}
                className={`chip${activeMuscle === m.muscle ? ' active' : ''}`}
                onClick={() => setMuscle(m.muscle)}
              >
                {m.label}
              </span>
            ))}
          </div>

          {fn && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: 'var(--bg-alt)', borderRadius: 8 }}>
              <span style={{ font: "600 12px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>
                How {fn.label.toLowerCase()} works
              </span>
              <span style={{ font: "400 12.5px/1.5 'Inter', sans-serif", color: 'var(--text-muted)' }}>{fn.summary}</span>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 2 }}>
                {fn.actions.map((a) => (
                  <span
                    key={a.action}
                    title={a.note}
                    style={{
                      font: "500 10.5px/1 'Inter', sans-serif",
                      color: 'var(--text-dim)',
                      border: '1px solid var(--border2)',
                      borderRadius: 12,
                      padding: '4px 9px',
                    }}
                  >
                    {a.action} · {a.plane}
                  </span>
                ))}
              </div>
            </div>
          )}
        </>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, maxHeight: 260, overflowY: 'auto' }}>
        {loading && <span className="spinner-text">Loading exercises…</span>}
        {!loading && results.length === 0 && (
          <span className="spinner-text">{isSearching ? 'No exercises match that search.' : 'No exercises tagged for this muscle yet.'}</span>
        )}
        {results.map((ex) => (
          <div
            key={ex.id}
            onClick={() => onPick(ex)}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 10,
              padding: '9px 10px',
              borderRadius: 6,
              cursor: 'pointer',
            }}
            onMouseEnter={(e) => (e.currentTarget.style.background = 'var(--hover-bg)')}
            onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <span style={{ font: "500 13px/1.2 'Inter Tight', sans-serif", color: 'var(--text)' }}>{ex.name}</span>
              <span style={{ font: "400 11px/1.3 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                {ex.muscle.replace('_', ' ')} · {ex.equipment || '—'} · {ex.joint_action || '—'}
                {ex.is_compound ? ' · compound' : ''}
              </span>
            </div>
            <span style={{ font: "600 11px/1 'Inter Tight', sans-serif", color: 'var(--accent)' }}>+ Add</span>
          </div>
        ))}
      </div>
    </div>
  );
}
