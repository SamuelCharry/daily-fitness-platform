import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Routine, WorkoutExerciseEntry, WorkoutSession } from '../types';

export default function Session() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const { data: routines } = useApi(() => api.get<Routine[]>('/api/routines'));
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<number, { weight: string; reps: string; rir: string }>>({});

  const workout = useMemo(() => {
    for (const r of routines || []) {
      const w = r.workouts.find((w) => w.id === Number(workoutId));
      if (w) return w;
    }
    return null;
  }, [routines, workoutId]);

  useEffect(() => {
    api
      .post<WorkoutSession>('/api/sessions', { workout_id: Number(workoutId) })
      .then(setSession)
      .catch((err) => setError(err.message))
      .finally(() => setStarting(false));
  }, [workoutId]);

  function draftFor(exerciseId: number) {
    return drafts[exerciseId] || { weight: '', reps: '', rir: '' };
  }

  async function logSet(we: WorkoutExerciseEntry) {
    if (!session) return;
    const d = draftFor(we.id);
    const setNumber = session.sets.filter((s) => s.workout_exercise_id === we.id).length + 1;
    const updated = await api.post<WorkoutSession>(`/api/sessions/${session.id}/sets`, {
      workout_exercise_id: we.id,
      set_number: setNumber,
      weight: d.weight ? Number(d.weight) : null,
      reps: d.reps ? Number(d.reps) : null,
      rir: d.rir ? Number(d.rir) : null,
    });
    setSession(updated);
    setDrafts({ ...drafts, [we.id]: { weight: '', reps: '', rir: '' } });
  }

  async function finish() {
    if (!session) return;
    await api.post(`/api/sessions/${session.id}/finish`);
    navigate('/', { replace: true });
  }

  if (starting) return <span className="spinner-text">Starting workout…</span>;
  if (error) return <span className="error-text">{error}</span>;
  if (!session) return null;

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="eyebrow">Training</span>
        <h1 className="page-title">{session.workout_name}</h1>
      </div>

      {!workout && <span className="spinner-text">Loading exercises…</span>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {workout?.exercises.map((we) => {
          const loggedSets = session.sets.filter((s) => s.workout_exercise_id === we.id);
          const draft = draftFor(we.id);
          return (
            <div key={we.id} className="card">
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                <span style={{ font: "500 15px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{we.name}</span>
                <span style={{ font: "400 12px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>
                  Target {we.target_sets ?? '—'} sets · {we.muscle.replace('_', ' ')}
                </span>
              </div>

              {loggedSets.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {loggedSets.map((s) => (
                    <span key={s.id} style={{ fontSize: 13, color: 'var(--text-body)' }}>
                      Set {s.set_number}: {s.weight ?? '—'} kg × {s.reps ?? '—'} reps (RIR {s.rir ?? '—'})
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
                <label className="field" style={{ width: 90 }}>
                  <span className="label" style={{ fontSize: 10 }}>Weight</span>
                  <input
                    type="number"
                    value={draft.weight}
                    onChange={(e) => setDrafts({ ...drafts, [we.id]: { ...draft, weight: e.target.value } })}
                  />
                </label>
                <label className="field" style={{ width: 90 }}>
                  <span className="label" style={{ fontSize: 10 }}>Reps</span>
                  <input
                    type="number"
                    value={draft.reps}
                    onChange={(e) => setDrafts({ ...drafts, [we.id]: { ...draft, reps: e.target.value } })}
                  />
                </label>
                <label className="field" style={{ width: 70 }}>
                  <span className="label" style={{ fontSize: 10 }}>RIR</span>
                  <input
                    type="number"
                    value={draft.rir}
                    onChange={(e) => setDrafts({ ...drafts, [we.id]: { ...draft, rir: e.target.value } })}
                  />
                </label>
                <button className="btn-ghost" onClick={() => logSet(we)}>
                  Log set
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <button className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={finish}>
        Finish Workout
      </button>
    </>
  );
}
