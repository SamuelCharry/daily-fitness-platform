import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Exercise, ExerciseFilters } from '../types';

export default function Exercises() {
  const [search, setSearch] = useState('');
  const [muscleGroup, setMuscleGroup] = useState<string | null>(null);
  const [jointAction, setJointAction] = useState<string | null>(null);
  const [plane, setPlane] = useState<string | null>(null);

  const { data: filters } = useApi(() => api.get<ExerciseFilters>('/api/exercises/filters'));

  const query = useMemo(() => {
    const params = new URLSearchParams();
    if (search) params.set('search', search);
    if (muscleGroup) params.set('muscle_group', muscleGroup);
    if (jointAction) params.set('joint_action', jointAction);
    if (plane) params.set('plane', plane);
    return params.toString();
  }, [search, muscleGroup, jointAction, plane]);

  const { data: exercises, loading } = useApi(
    () => api.get<Exercise[]>(`/api/exercises${query ? `?${query}` : ''}`),
    [query],
  );

  function toggle(current: string | null, value: string, setter: (v: string | null) => void) {
    setter(current === value ? null : value);
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="eyebrow">Training</span>
        <h1 className="page-title">Exercise Library</h1>
      </div>

      <input
        type="text"
        placeholder="Search exercises"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
        style={{ maxWidth: 420 }}
      />

      {filters && (
        <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label" style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
              Muscle group
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {filters.muscle_groups.map((g) => (
                <span
                  key={g}
                  className={`chip${muscleGroup === g ? ' active' : ''}`}
                  onClick={() => toggle(muscleGroup, g, setMuscleGroup)}
                >
                  {g}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label" style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
              Joint action
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {filters.joint_actions.map((j) => (
                <span
                  key={j}
                  className={`chip${jointAction === j ? ' active' : ''}`}
                  onClick={() => toggle(jointAction, j, setJointAction)}
                >
                  {j}
                </span>
              ))}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            <span className="label" style={{ fontSize: 10.5, color: 'var(--text-dim)' }}>
              Plane
            </span>
            <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
              {filters.planes.map((p) => (
                <span key={p} className={`chip${plane === p ? ' active' : ''}`} onClick={() => toggle(plane, p, setPlane)}>
                  {p}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 2, borderTop: '1px solid var(--border)' }}>
        {loading && <span className="spinner-text" style={{ padding: '14px 4px' }}>Loading…</span>}
        {exercises?.length === 0 && (
          <span className="spinner-text" style={{ padding: '14px 4px' }}>
            No exercises match those filters.
          </span>
        )}
        {exercises?.map((ex) => (
          <div
            key={ex.id}
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '14px 4px',
              borderBottom: '1px solid var(--border)',
            }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <Link
                  to={`/exercises/${ex.id}/progress`}
                  style={{ font: "500 14.5px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}
                >
                  {ex.name}
                </Link>
                {ex.youtube_url && (
                  <a href={ex.youtube_url} target="_blank" rel="noreferrer" style={{ fontSize: 12 }} title="Watch demo">
                    ▶
                  </a>
                )}
              </span>
              <span style={{ font: "400 11.5px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>
                {ex.muscle.replace('_', ' ')} · {ex.joint_action || '—'} · {ex.plane || '—'}
              </span>
            </div>
            <span style={{ font: "400 11px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>{ex.equipment}</span>
          </div>
        ))}
      </div>
    </>
  );
}
