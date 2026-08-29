import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Exercise, Routine, Workout, WorkoutExerciseEntry } from '../types';
import { loadPriorities, savePriorities, type PriorityMap } from '../utils/musclePriority';
import { computeMuscleVolumeRows, type MuscleVolumeRow } from '../utils/volumeGuideline';

function ExercisePicker({ onPick }: { onPick: (ex: Exercise) => void }) {
  const [search, setSearch] = useState('');
  const { data: results } = useApi(
    () => (search.trim().length > 1 ? api.get<Exercise[]>(`/api/exercises?search=${encodeURIComponent(search)}`) : Promise.resolve([])),
    [search],
  );

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, position: 'relative' }}>
      <input
        type="text"
        placeholder="Search exercise to add…"
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />
      {results && results.length > 0 && (
        <div
          style={{
            background: 'var(--input-bg)',
            border: '1px solid var(--border2)',
            borderRadius: 8,
            maxHeight: 220,
            overflowY: 'auto',
          }}
        >
          {results.map((ex) => (
            <div
              key={ex.id}
              onClick={() => {
                onPick(ex);
                setSearch('');
              }}
              style={{ padding: '8px 12px', cursor: 'pointer', fontSize: 13, color: 'var(--text)' }}
              onMouseEnter={(e) => (e.currentTarget.style.background = '#262627')}
              onMouseLeave={(e) => (e.currentTarget.style.background = 'transparent')}
            >
              {ex.name} <span style={{ color: 'var(--text-dim)' }}>· {ex.muscle.replace('_', ' ')}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Flags exercises in the same workout that share both muscle and joint action - the
// manual's definition of redundancy (same muscle through a very similar movement).
function findRedundant(exercises: WorkoutExerciseEntry[]): Map<number, string> {
  const flagged = new Map<number, string>();
  for (let i = 0; i < exercises.length; i++) {
    for (let j = 0; j < exercises.length; j++) {
      if (i === j) continue;
      const a = exercises[i];
      const b = exercises[j];
      if (a.muscle === b.muscle && a.joint_action && a.joint_action === b.joint_action && !flagged.has(a.exercise_id)) {
        flagged.set(a.exercise_id, b.name);
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
}: {
  workout: Workout;
  priorities: PriorityMap;
  volumeByMuscle: Map<string, MuscleVolumeRow>;
  onChanged: () => void;
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
        </div>
      </div>

      {pickerOpen && <ExercisePicker onPick={addExercise} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {workout.exercises.map((ex, i) => {
          const guideline = volumeByMuscle.get(ex.muscle);
          return (
            <div
              key={ex.exercise_id}
              style={{
                background: '#101011',
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
                    to={`/exercises/${ex.exercise_id}/progress`}
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
                  ⚠ Redundant with "{redundant.get(ex.exercise_id)}" — same muscle, same joint action. Consider varying
                  the movement pattern.
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
                    color: priorities[m] === r ? 'var(--accent-text)' : '#a8a8aa',
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
            style={{
              font: "600 11px/1 'Inter Tight', sans-serif",
              color: r.status === 'ok' ? 'var(--text-dim)' : 'var(--accent)',
              textTransform: 'uppercase',
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
        <Link to="/routines" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          ← All routines
        </Link>
        <h1 className="page-title">{routine.name}</h1>
      </div>

      <MusclePriorityCard muscles={muscles} priorities={priorities} onSet={handleSetPriority} />

      {routine.workouts.map((w) => (
        <WorkoutCard key={w.id} workout={w} priorities={priorities} volumeByMuscle={volumeByMuscle} onChanged={reload} />
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
