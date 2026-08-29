import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Exercise, Routine, WorkoutSession } from '../types';
import AreaTrendChart from '../components/AreaTrendChart';
import { changeOverDays, trendDirection, type MetricPoint } from '../utils/trends';
import { useLanguage } from '../i18n/LanguageContext';

type MetricKey = 'topWeight' | 'oneRm' | 'volume';

const METRICS: { key: MetricKey; label: string; unit: string }[] = [
  { key: 'topWeight', label: 'Top Weight', unit: 'kg' },
  { key: 'oneRm', label: 'Est. 1RM', unit: 'kg' },
  { key: 'volume', label: 'Session Volume', unit: 'kg' },
];

export default function ExerciseProgress() {
  const { t } = useLanguage();
  const { id } = useParams();
  const exerciseId = Number(id);
  const [metricKey, setMetricKey] = useState<MetricKey>('topWeight');

  const { data: exercises, loading: exLoading } = useApi(() => api.get<Exercise[]>('/api/exercises'));
  const { data: routines, loading: routinesLoading } = useApi(() => api.get<Routine[]>('/api/routines'));
  const { data: sessions, loading: sessionsLoading } = useApi(() => api.get<WorkoutSession[]>('/api/sessions?days=3650'));

  const loading = exLoading || routinesLoading || sessionsLoading;
  const exercise = exercises?.find((e) => e.id === exerciseId);

  const workoutExerciseIds = new Set<number>();
  routines?.forEach((r) =>
    r.workouts.forEach((w) =>
      w.exercises.forEach((e) => {
        if (e.exercise_id === exerciseId) workoutExerciseIds.add(e.id);
      }),
    ),
  );

  interface SessionSummary {
    date: string;
    topWeight: number;
    topReps: number;
    oneRm: number;
    volume: number;
    sets: { weight: number | null; reps: number | null; rir: number | null }[];
  }

  const summaries: SessionSummary[] = [];
  const finished = (sessions || []).filter((s) => s.finished_at != null).sort((a, b) => a.date.localeCompare(b.date));

  for (const session of finished) {
    const relevantSets = session.sets.filter((s) => workoutExerciseIds.has(s.workout_exercise_id));
    if (relevantSets.length === 0) continue;

    let topWeight = 0;
    let topReps = 0;
    let oneRm = 0;
    let volume = 0;
    for (const s of relevantSets) {
      const w = s.weight || 0;
      const r = s.reps || 0;
      volume += w * r;
      if (w > topWeight) topWeight = w;
      if (r > topReps) topReps = r;
      const estimate = w * (1 + r / 30);
      if (estimate > oneRm) oneRm = estimate;
    }

    summaries.push({
      date: session.date,
      topWeight,
      topReps,
      oneRm: Math.round(oneRm * 10) / 10,
      volume,
      sets: relevantSets.map((s) => ({ weight: s.weight, reps: s.reps, rir: s.rir })),
    });
  }

  const points: MetricPoint[] = summaries.map((s) => ({ date: s.date, value: s[metricKey] }));
  const delta3 = changeOverDays(points, 3);
  const delta7 = changeOverDays(points, 7);
  const trend = trendDirection(points, 60);
  const metric = METRICS.find((m) => m.key === metricKey)!;

  const TREND_LABEL: Record<string, string> = { up: '↑ Improving', down: '↓ Declining', stable: '→ Stable' };

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link to="/app/exercises" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          ← {t('pages.exerciseLibrary')}
        </Link>
        <span className="eyebrow">{t('pages.progress')}</span>
        <h1 className="page-title">{exercise?.name || (loading ? 'Loading…' : 'Exercise')}</h1>
        {exercise && (
          <span style={{ font: "400 13px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>
            {exercise.muscle.replace('_', ' ')} · {exercise.joint_action || '—'} · {exercise.equipment || '—'}
          </span>
        )}
      </div>

      {loading && <span className="spinner-text">Loading…</span>}

      {!loading && summaries.length === 0 && (
        <div className="card">
          <span className="spinner-text">
            No finished sessions with this exercise yet — log a few workouts that include it to see your progress here.
          </span>
        </div>
      )}

      {summaries.length > 0 && (
        <div className="card">
          <div style={{ display: 'flex', gap: 4 }}>
            {METRICS.map((m) => (
              <button
                key={m.key}
                onClick={() => setMetricKey(m.key)}
                style={{
                  border: 'none',
                  background: metricKey === m.key ? 'var(--accent)' : 'transparent',
                  color: metricKey === m.key ? 'var(--accent-text)' : 'var(--nav-inactive)',
                  padding: '6px 14px',
                  borderRadius: 6,
                  font: "600 12px/1 'Inter Tight', sans-serif",
                }}
              >
                {m.label}
              </button>
            ))}
          </div>

          <AreaTrendChart points={points} />

          <div style={{ display: 'flex', flexDirection: 'column', gap: 10, paddingTop: 12, borderTop: '1px solid var(--border)' }}>
            <span style={{ font: "600 10px/1 'Inter', sans-serif", letterSpacing: '.06em', color: 'var(--text-dim)', textTransform: 'uppercase' }}>
              Insights & Data
            </span>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Since 3 days ago
                </span>
                <span style={{ font: "500 18px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>
                  {delta3.delta != null ? `${delta3.delta > 0 ? '+' : ''}${delta3.delta.toFixed(1)} ${metric.unit}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Since 7 days ago
                </span>
                <span style={{ font: "500 18px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>
                  {delta7.delta != null ? `${delta7.delta > 0 ? '+' : ''}${delta7.delta.toFixed(1)} ${metric.unit}` : '—'}
                </span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Overall trend
                </span>
                <span style={{ font: "500 18px/1 'Inter Tight', sans-serif", color: 'var(--accent)' }}>
                  {trend ? TREND_LABEL[trend] : 'Not enough data'}
                </span>
              </div>
            </div>
          </div>
        </div>
      )}

      {summaries.length > 0 && (
        <div className="card">
          <span className="label">Session history</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {[...summaries].reverse().map((s) => (
              <div
                key={s.date}
                style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid var(--border)' }}
              >
                <span style={{ font: "500 13px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>{s.date}</span>
                <span style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-muted)' }}>
                  {s.sets.map((set) => `${set.weight ?? '—'}×${set.reps ?? '—'}${set.rir != null ? ` (${set.rir} RIR)` : ''}`).join('  ·  ')}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </>
  );
}
