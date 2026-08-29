import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { LastSetsByExercise, Routine, WorkoutExerciseEntry, WorkoutSession } from '../types';

interface Draft {
  weight: string;
  reps: string;
  rir: string;
}

function playBeep() {
  try {
    const AudioContextCtor = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
    const ctx = new AudioContextCtor();
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.frequency.value = 880;
    gain.gain.setValueAtTime(0.15, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.4);
    osc.connect(gain);
    gain.connect(ctx.destination);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  } catch {
    // Web Audio unsupported/blocked - the visible countdown still tells the story.
  }
}

function RestTimer({ seconds, onDone }: { seconds: number; onDone: () => void }) {
  const [left, setLeft] = useState(seconds);
  const doneRef = useRef(onDone);
  doneRef.current = onDone;

  useEffect(() => {
    setLeft(seconds);
  }, [seconds]);

  useEffect(() => {
    if (left <= 0) {
      playBeep();
      doneRef.current();
      return;
    }
    const t = setTimeout(() => setLeft((v) => v - 1), 1000);
    return () => clearTimeout(t);
  }, [left]);

  const mm = Math.floor(Math.max(left, 0) / 60);
  const ss = Math.max(left, 0) % 60;

  return (
    <div
      style={{
        position: 'sticky',
        top: 8,
        zIndex: 5,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        background: 'var(--accent)',
        color: 'var(--accent-text)',
        borderRadius: 10,
        padding: '10px 16px',
      }}
    >
      <span style={{ font: "600 13px/1 'Inter Tight', sans-serif" }}>Resting…</span>
      <span style={{ font: "700 20px/1 'Inter Tight', sans-serif" }}>
        {mm}:{String(ss).padStart(2, '0')}
      </span>
      <span onClick={() => doneRef.current()} style={{ font: "500 12px/1 'Inter', sans-serif", cursor: 'pointer', textDecoration: 'underline' }}>
        Skip
      </span>
    </div>
  );
}

function ExerciseLog({
  we,
  loggedSets,
  lastSets,
  onLogSet,
}: {
  we: WorkoutExerciseEntry;
  loggedSets: { set_number: number; weight: number | null; reps: number | null; rir: number | null }[];
  lastSets: { set_number: number; weight: number | null; reps: number | null; rir: number | null }[];
  onLogSet: (setNumber: number, draft: Draft) => void;
}) {
  const totalSets = Math.max(we.target_sets ?? 1, loggedSets.length);
  const [drafts, setDrafts] = useState<Record<number, Draft>>({});

  function draftFor(setNumber: number): Draft {
    return drafts[setNumber] || { weight: '', reps: '', rir: '' };
  }

  function setDraft(setNumber: number, patch: Partial<Draft>) {
    setDrafts((d) => ({ ...d, [setNumber]: { ...draftFor(setNumber), ...patch } }));
  }

  const repsPlaceholder = we.rep_range_min != null && we.rep_range_max != null ? `${we.rep_range_min}-${we.rep_range_max}` : 'reps';
  const rirPlaceholder = we.rir_target != null ? String(we.rir_target) : 'RIR';

  return (
    <div className="card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: "500 15px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{we.name}</span>
        <span style={{ font: "400 12px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>
          {we.muscle.replace('_', ' ')} · target {we.target_sets ?? '—'} sets
          {we.rep_range_min != null && we.rep_range_max != null && ` · obj. ${we.rep_range_min}-${we.rep_range_max} reps`}
          {we.rir_target != null && ` · RIR ${we.rir_target}`}
        </span>
      </div>

      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '30px 1fr 1fr 60px 60px',
          gap: 8,
          font: "500 10px/1 'Inter', sans-serif",
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '.03em',
          paddingBottom: 4,
        }}
      >
        <span>Set</span>
        <span>Weight</span>
        <span>Reps</span>
        <span>RIR</span>
        <span />
      </div>

      {Array.from({ length: totalSets }, (_, i) => i + 1).map((setNumber) => {
        const logged = loggedSets.find((s) => s.set_number === setNumber);
        const last = lastSets.find((s) => s.set_number === setNumber);
        const draft = draftFor(setNumber);

        return (
          <div key={setNumber} style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 6, borderBottom: '1px solid var(--border)' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '30px 1fr 1fr 60px 60px', gap: 8, alignItems: 'center' }}>
              <span style={{ font: "600 13px/1 'Inter Tight', sans-serif", color: 'var(--text-dim)' }}>{setNumber}</span>
              {logged ? (
                <>
                  <span style={{ font: "500 13px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>{logged.weight ?? '—'} kg</span>
                  <span style={{ font: "500 13px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>{logged.reps ?? '—'}</span>
                  <span style={{ font: "500 13px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>{logged.rir ?? '—'}</span>
                  <span style={{ color: 'var(--accent)', fontSize: 14 }}>✓</span>
                </>
              ) : (
                <>
                  <input
                    type="number"
                    placeholder="kg"
                    value={draft.weight}
                    onChange={(e) => setDraft(setNumber, { weight: e.target.value })}
                    style={{ padding: '6px 8px' }}
                  />
                  <input
                    type="number"
                    placeholder={repsPlaceholder}
                    value={draft.reps}
                    onChange={(e) => setDraft(setNumber, { reps: e.target.value })}
                    style={{ padding: '6px 8px' }}
                  />
                  <input
                    type="number"
                    placeholder={rirPlaceholder}
                    value={draft.rir}
                    onChange={(e) => setDraft(setNumber, { rir: e.target.value })}
                    style={{ padding: '6px 8px' }}
                  />
                  <button
                    className="btn-ghost"
                    onClick={() => onLogSet(setNumber, draft)}
                    style={{ padding: '6px 10px', fontSize: 16, lineHeight: 1 }}
                    title="Mark set done"
                  >
                    ✓
                  </button>
                </>
              )}
            </div>
            {last && (
              <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-faint)', marginLeft: 38 }}>
                last: {last.weight ?? '—'}kg × {last.reps ?? '—'}{last.rir != null ? ` (RIR ${last.rir})` : ''}
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export default function Session() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const { data: routines } = useApi(() => api.get<Routine[]>('/api/routines'));
  const { data: lastSets } = useApi(() => api.get<LastSetsByExercise>(`/api/sessions/last-sets/${workoutId}`), [workoutId]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [starting, setStarting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [restFor, setRestFor] = useState<{ workoutExerciseId: number; seconds: number } | null>(null);

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

  async function logSet(we: WorkoutExerciseEntry, setNumber: number, draft: Draft) {
    if (!session) return;
    const updated = await api.post<WorkoutSession>(`/api/sessions/${session.id}/sets`, {
      workout_exercise_id: we.id,
      set_number: setNumber,
      weight: draft.weight ? Number(draft.weight) : null,
      reps: draft.reps ? Number(draft.reps) : null,
      rir: draft.rir ? Number(draft.rir) : null,
    });
    setSession(updated);
    if (we.rest_seconds) {
      setRestFor({ workoutExerciseId: we.id, seconds: we.rest_seconds });
    }
  }

  async function finish() {
    if (!session) return;
    await api.post(`/api/sessions/${session.id}/finish`);
    navigate('/app', { replace: true });
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

      {restFor && <RestTimer seconds={restFor.seconds} onDone={() => setRestFor(null)} />}

      {!workout && <span className="spinner-text">Loading exercises…</span>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {workout?.exercises.map((we) => (
          <ExerciseLog
            key={we.id}
            we={we}
            loggedSets={session.sets.filter((s) => s.workout_exercise_id === we.id)}
            lastSets={lastSets?.[we.id] || []}
            onLogSet={(setNumber, draft) => logSet(we, setNumber, draft)}
          />
        ))}
      </div>

      <button className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={finish}>
        Finish Workout
      </button>
    </>
  );
}
