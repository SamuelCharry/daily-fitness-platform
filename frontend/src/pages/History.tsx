import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Routine, WorkoutSession } from '../types';
import { computeRirBreakdown, findStalls, type ExerciseNameLookup } from '../utils/sessionAnalysis';

export default function History() {
  const { data: sessions, loading: sessionsLoading, error } = useApi(() => api.get<WorkoutSession[]>('/api/sessions?days=180'));
  const { data: routines, loading: routinesLoading } = useApi(() => api.get<Routine[]>('/api/routines'));

  const loading = sessionsLoading || routinesLoading;

  const lookup: ExerciseNameLookup = {};
  routines?.forEach((r) =>
    r.workouts.forEach((w) =>
      w.exercises.forEach((e) => {
        lookup[e.id] = { name: e.name, muscle: e.muscle };
      }),
    ),
  );

  const rir = sessions ? computeRirBreakdown(sessions) : null;
  const stalls = sessions ? findStalls(sessions, lookup) : [];

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="eyebrow">Tracking</span>
        <h1 className="page-title">History</h1>
      </div>

      {loading && <span className="spinner-text">Loading…</span>}
      {error && <span className="error-text">{error}</span>}

      {rir && (
        <div className="card">
          <span className="label">Set intensity (last 180 days)</span>
          {rir.total === 0 ? (
            <span className="spinner-text">No sets logged yet — start a workout to build this up.</span>
          ) : (
            <>
              <div style={{ display: 'flex', height: 10, borderRadius: 5, overflow: 'hidden' }}>
                <div style={{ width: `${(rir.workingSets / rir.total) * 100}%`, background: 'var(--accent)' }} title="Working sets (0-2 RIR)" />
                <div style={{ width: `${(rir.looseSets / rir.total) * 100}%`, background: '#4a4a4c' }} title="Loose sets (3+ RIR)" />
                <div style={{ width: `${(rir.unrated / rir.total) * 100}%`, background: '#262627' }} title="No RIR logged" />
              </div>
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                <span style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-muted)' }}>
                  <b style={{ color: 'var(--accent)' }}>{rir.workingPct}%</b> true working sets (0–2 RIR)
                </span>
                <span style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>{rir.looseSets} sets left too far from failure</span>
                <span style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>{rir.unrated} sets with no RIR logged</span>
              </div>
              <p className="muted-note">
                Only sets taken to within 0–2 reps of failure count as real working sets — see the Glossary's "Intensity
                & RIR" entry for why that threshold matters.
              </p>
            </>
          )}
        </div>
      )}

      <div className="card">
        <span className="label">Possible stalls</span>
        {stalls.length === 0 ? (
          <span className="spinner-text">
            No exercise has gone 3 straight sessions without a new top weight or rep — nothing to flag.
          </span>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {stalls.map((s) => (
              <div
                key={s.workoutExerciseId}
                style={{ display: 'flex', flexDirection: 'column', gap: 2, paddingBottom: 10, borderBottom: '1px solid var(--border)' }}
              >
                <span style={{ font: "500 14px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{s.name}</span>
                <span style={{ font: "400 12.5px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>{s.message}</span>
              </div>
            ))}
            <p className="muted-note">
              This isn't a scheduled deload prompt — it only fires when the data shows real stagnation, per the "deload
              reactively, not proactively" principle.
            </p>
          </div>
        )}
      </div>

      <div className="card">
        <span className="label">Recent sessions</span>
        {sessions?.length === 0 && <span className="spinner-text">No sessions logged yet.</span>}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          {sessions?.slice(0, 20).map((s) => (
            <div
              key={s.id}
              style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}
            >
              <span style={{ font: "500 13.5px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>{s.workout_name}</span>
              <span style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                {s.date} · {s.sets.length} sets{s.finished_at ? '' : ' · in progress'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
