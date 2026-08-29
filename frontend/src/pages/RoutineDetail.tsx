import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Exercise, Routine, Workout, WorkoutExerciseEntry } from '../types';
import { loadPriorities, savePriorities, type PriorityMap } from '../utils/musclePriority';
import { computeMuscleVolumeRows, type MuscleVolumeRow } from '../utils/volumeGuideline';
import { useLanguage } from '../i18n/LanguageContext';
import MuscleExercisePicker from '../components/MuscleExercisePicker';

interface RedundancyFlag {
  withName: string;
  jointAction: string;
  plane: string | null;
}

// Flags exercises in the same workout that share both muscle and joint action - the
// manual's definition of redundancy (same muscle through a very similar movement).
function findRedundant(exercises: WorkoutExerciseEntry[]): Map<number, RedundancyFlag> {
  const flagged = new Map<number, RedundancyFlag>();
  for (let i = 0; i < exercises.length; i++) {
    for (let j = 0; j < exercises.length; j++) {
      if (i === j) continue;
      const a = exercises[i];
      const b = exercises[j];
      if (a.muscle === b.muscle && a.joint_action && a.joint_action === b.joint_action && !flagged.has(a.exercise_id)) {
        flagged.set(a.exercise_id, { withName: b.name, jointAction: a.joint_action, plane: a.plane });
      }
    }
  }
  return flagged;
}

function WorkoutCard({
  workout,
  priorities,
  volumeByMuscle,
  onChanged,
  onDeleted,
}: {
  workout: Workout;
  priorities: PriorityMap;
  volumeByMuscle: Map<string, MuscleVolumeRow>;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const redundant = findRedundant(workout.exercises);

  async function persist(exercises: WorkoutExerciseEntry[]) {
    await api.put(`/api/workouts/${workout.id}`, {
      name: workout.name,
      day_index: workout.day_index ?? 0,
      exercises: exercises.map((e, i) => ({
        exercise_id: e.exercise_id,
        order_index: i,
        target_sets: e.target_sets,
        comments: e.comments,
      })),
    });
    onChanged();
  }

  function addExercise(ex: Exercise) {
    const next: WorkoutExerciseEntry[] = [
      ...workout.exercises,
      {
        id: -1,
        order_index: workout.exercises.length,
        target_sets: 3,
        comments: null,
        exercise_id: ex.id,
        name: ex.name,
        equipment: ex.equipment,
        muscle: ex.muscle,
        joint_action: ex.joint_action,
        plane: ex.plane,
      },
    ];
    persist(next);
    setPickerOpen(false);
  }

  function removeExercise(exerciseId: number) {
    persist(workout.exercises.filter((e) => e.exercise_id !== exerciseId));
  }

  function setTargetSets(exerciseId: number, sets: number) {
    persist(workout.exercises.map((e) => (e.exercise_id === exerciseId ? { ...e, target_sets: sets } : e)));
  }

  function reorderByPriority() {
    const rank = (m: string) => priorities[m] ?? 2;
    const sorted = [...workout.exercises].sort((a, b) => rank(a.muscle) - rank(b.muscle));
    persist(sorted);
  }

  async function deleteWorkout() {
    if (!window.confirm(`Delete "${workout.name}"? This removes its exercises and logged sessions too.`)) return;
    await api.delete(`/api/workouts/${workout.id}`);
    onDeleted();
  }

  const hasPriorityData = workout.exercises.some((e) => priorities[e.muscle] != null);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ font: "500 16px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{workout.name}</span>
        <div style={{ display: 'flex', gap: 8 }}>
          {hasPriorityData && (
            <button className="btn-ghost" onClick={reorderByPriority} title="Move priority-1 muscles earlier in the session">
              Sort by priority
            </button>
          )}
          <button className="btn-ghost" onClick={() => setPickerOpen((v) => !v)}>
            {pickerOpen ? 'Close' : '+ Add Exercise'}
          </button>
          <button
            onClick={deleteWorkout}
            title="Delete this workout day"
            style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, padding: '6px 8px' }}
          >
            Delete
          </button>
        </div>
      </div>

      {pickerOpen && <MuscleExercisePicker onPick={addExercise} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {workout.exercises.map((ex, i) => {
          const guideline = volumeByMuscle.get(ex.muscle);
          return (
            <div
              key={ex.exercise_id}
              style={{
                background: 'var(--bg-raised)',
                border: '1px solid var(--border)',
                borderRadius: 10,
                padding: '12px 16px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              <div style={{ display: 'grid', gridTemplateColumns: '24px 1.5fr auto auto', gap: 16, alignItems: 'center' }}>
                <span style={{ font: "600 13px/1 'Inter Tight', sans-serif", color: 'var(--text-dim)' }}>
                  {String(i + 1).padStart(2, '0')}
                </span>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  <Link
                    to={`/app/exercises/${ex.exercise_id}/progress`}
                    style={{ font: "500 14.5px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}
                  >
                    {ex.name}
                  </Link>
                  <span style={{ font: "400 11.5px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>
                    {ex.muscle.replace('_', ' ')} · {ex.joint_action || '—'} · {ex.equipment || '—'}
                    {priorities[ex.muscle] != null && ` · priority ${priorities[ex.muscle]}`}
                  </span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 2 }}>
                  <input
                    type="number"
                    value={ex.target_sets ?? ''}
                    onChange={(e) => setTargetSets(ex.exercise_id, Number(e.target.value))}
                    style={{ width: 60 }}
                    title="Target sets"
                  />
                  {guideline && (
                    <span style={{ font: "400 10px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                      TNF: {guideline.minRecommended}
                      {guideline.maxRecommended != null ? `–${guideline.maxRecommended}` : '+'}/wk
                    </span>
                  )}
                </div>
                <span
                  onClick={() => removeExercise(ex.exercise_id)}
                  style={{ color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}
                >
                  Remove
                </span>
              </div>
              {redundant.has(ex.exercise_id) && (
                <span style={{ font: "400 11.5px/1.4 'Inter', sans-serif", color: 'var(--accent)' }}>
                  ⚠ Redundant with "{redundant.get(ex.exercise_id)!.withName}" — both hit {redundant.get(ex.exercise_id)!.jointAction}
                  {redundant.get(ex.exercise_id)!.plane ? ` (${redundant.get(ex.exercise_id)!.plane} plane)` : ''}. They compete for the
                  same recovery instead of adding new stimulus — swap one for a different joint action on this muscle, or drop it and add
                  its sets to the other.
                </span>
              )}
            </div>
          );
        })}
        {workout.exercises.length === 0 && <span className="spinner-text">No exercises yet.</span>}
      </div>
    </div>
  );
}

function MusclePriorityCard({ muscles, priorities, onSet }: { muscles: string[]; priorities: PriorityMap; onSet: (m: string, r: 1 | 2 | 3) => void }) {
  if (muscles.length === 0) return null;
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="label">Muscle priorities</span>
        <span style={{ font: "400 11px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
          1 = weak point (train first) · 3 = strong point (train last)
        </span>
      </div>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {muscles.map((m) => (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 140, font: "400 13px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>
              {m.replace('_', ' ')}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {([1, 2, 3] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => onSet(m, r)}
                  style={{
                    border: '1px solid var(--border2)',
                    background: priorities[m] === r ? 'var(--accent)' : 'transparent',
                    color: priorities[m] === r ? 'var(--accent-text)' : 'var(--nav-inactive)',
                    width: 30,
                    height: 30,
                    borderRadius: 6,
                    font: "600 12px/1 'Inter Tight', sans-serif",
                  }}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

const STATUS_LABEL: Record<MuscleVolumeRow['status'], string> = {
  missing: 'Not trained',
  low: 'Low',
  ok: 'On track',
  high: 'High',
};

function explainStatus(r: MuscleVolumeRow): string {
  const range = `${r.minRecommended}${r.maxRecommended != null ? `–${r.maxRecommended}` : '+'} sets/week`;
  if (r.status === 'missing') {
    return `Nothing is training this muscle at all. Even once a week, aim for at least ${r.minRecommended} sets in that session.`;
  }
  if (r.status === 'low') {
    return `At ${r.frequency}x/week frequency, the evidence-backed range is ${range} — ${r.weeklySets} is below that, so this muscle is under-stimulated for how often it's trained.`;
  }
  if (r.status === 'high') {
    return `At ${r.frequency}x/week frequency, ${range} is the range most people can recover from — ${r.weeklySets} sets is past that, adding fatigue without much extra growth signal.`;
  }
  return `At ${r.frequency}x/week frequency, ${r.weeklySets} sets falls inside the ${range} range — no change needed.`;
}

function VolumeFrequencyCard({ rows }: { rows: MuscleVolumeRow[] }) {
  if (rows.length === 0) return null;

  const missingCount = rows.filter((r) => r.status === 'missing').length;

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="label">Volume & frequency check</span>
        <span style={{ font: "400 11px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
          TNF guideline sets/week by frequency
        </span>
      </div>
      {missingCount > 0 && (
        <span style={{ font: "400 12.5px/1.4 'Inter', sans-serif", color: 'var(--accent)' }}>
          ⚠ {missingCount} muscle group{missingCount === 1 ? ' is' : 's are'} not trained anywhere in this routine.
        </span>
      )}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: '1.3fr 0.8fr 0.8fr 1.2fr 0.9fr',
          gap: 8,
          font: "500 10.5px/1 'Inter', sans-serif",
          color: 'var(--text-dim)',
          textTransform: 'uppercase',
          letterSpacing: '.04em',
          paddingBottom: 8,
          borderBottom: '1px solid var(--border)',
        }}
      >
        <span>Muscle</span>
        <span>Frequency</span>
        <span>Weekly sets</span>
        <span>Guideline</span>
        <span>Status</span>
      </div>
      {rows.map((r) => (
        <div key={r.muscle} style={{ display: 'grid', gridTemplateColumns: '1.3fr 0.8fr 0.8fr 1.2fr 0.9fr', gap: 8, alignItems: 'center' }}>
          <span style={{ font: "400 13px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>{r.muscle.replace('_', ' ')}</span>
          <span style={{ font: "400 13px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>{r.frequency}x</span>
          <span style={{ font: "400 13px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>{r.weeklySets}</span>
          <span style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
            {r.minRecommended}
            {r.maxRecommended != null ? `–${r.maxRecommended}` : '+'}
          </span>
          <span
            title={explainStatus(r)}
            style={{
              font: "600 11px/1 'Inter Tight', sans-serif",
              color: r.status === 'ok' ? 'var(--text-dim)' : 'var(--accent)',
              textTransform: 'uppercase',
              textDecoration: 'underline dotted',
              textUnderlineOffset: 3,
              cursor: 'help',
            }}
          >
            {STATUS_LABEL[r.status]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function RoutineDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const { data: routines, loading, reload } = useApi(() => api.get<Routine[]>('/api/routines'));
  const { data: allExercises } = useApi(() => api.get<Exercise[]>('/api/exercises'));
  const [workoutName, setWorkoutName] = useState('');
  const [priorities, setPriorities] = useState<PriorityMap>({});

  useEffect(() => {
    setPriorities(loadPriorities());
  }, []);

  const routine = routines?.find((r) => r.id === Number(id));

  function handleSetPriority(muscle: string, rank: 1 | 2 | 3) {
    const next = { ...priorities, [muscle]: rank };
    setPriorities(next);
    savePriorities(next);
  }

  async function addWorkout() {
    if (!routine || !workoutName.trim()) return;
    await api.post(`/api/routines/${routine.id}/workouts`, {
      name: workoutName.trim(),
      day_index: routine.workouts.length,
      exercises: [],
    });
    setWorkoutName('');
    reload();
  }

  if (loading) return <span className="spinner-text">Loading…</span>;
  if (!routine) return <span className="error-text">Routine not found.</span>;

  const muscles = [...new Set(routine.workouts.flatMap((w) => w.exercises.map((e) => e.muscle)))].sort();
  const allMuscles = [...new Set((allExercises || []).map((e) => e.muscle))];
  const volumeRows = computeMuscleVolumeRows(routine, allMuscles);
  const volumeByMuscle = new Map(volumeRows.map((r) => [r.muscle, r]));

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link to="/app/routines" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          ← {t('pages.routines')}
        </Link>
        <h1 className="page-title">{routine.name}</h1>
      </div>

      <MusclePriorityCard muscles={muscles} priorities={priorities} onSet={handleSetPriority} />

      {routine.workouts.map((w) => (
        <WorkoutCard
          key={w.id}
          workout={w}
          priorities={priorities}
          volumeByMuscle={volumeByMuscle}
          onChanged={reload}
          onDeleted={reload}
        />
      ))}

      <div className="card" style={{ maxWidth: 500 }}>
        <span className="label">New workout day</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="e.g. Upper A"
            value={workoutName}
            onChange={(e) => setWorkoutName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && addWorkout()}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={addWorkout} disabled={!workoutName.trim()}>
            Add
          </button>
        </div>
      </div>

      <VolumeFrequencyCard rows={volumeRows} />
    </>
  );
}
