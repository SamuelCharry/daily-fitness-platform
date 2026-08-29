import { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Exercise, Routine, Workout, WorkoutExerciseEntry } from '../types';

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

function WorkoutCard({ workout, onChanged }: { workout: Workout; onChanged: () => void }) {
  const [pickerOpen, setPickerOpen] = useState(false);

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

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ font: "500 16px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{workout.name}</span>
        <button className="btn-ghost" onClick={() => setPickerOpen((v) => !v)}>
          {pickerOpen ? 'Close' : '+ Add Exercise'}
        </button>
      </div>

      {pickerOpen && <ExercisePicker onPick={addExercise} />}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {workout.exercises.map((ex, i) => (
          <div
            key={ex.exercise_id}
            style={{
              background: '#101011',
              border: '1px solid var(--border)',
              borderRadius: 10,
              padding: '12px 16px',
              display: 'grid',
              gridTemplateColumns: '24px 1.5fr auto auto',
              gap: 16,
              alignItems: 'center',
            }}
          >
            <span style={{ font: "600 13px/1 'Inter Tight', sans-serif", color: 'var(--text-dim)' }}>
              {String(i + 1).padStart(2, '0')}
            </span>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: "500 14.5px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{ex.name}</span>
              <span style={{ font: "400 11.5px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>
                {ex.muscle.replace('_', ' ')} · {ex.joint_action || '—'} · {ex.equipment || '—'}
              </span>
            </div>
            <input
              type="number"
              value={ex.target_sets ?? ''}
              onChange={(e) => setTargetSets(ex.exercise_id, Number(e.target.value))}
              style={{ width: 60 }}
              title="Target sets"
            />
            <span
              onClick={() => removeExercise(ex.exercise_id)}
              style={{ color: 'var(--text-dim)', cursor: 'pointer', fontSize: 13 }}
            >
              Remove
            </span>
          </div>
        ))}
        {workout.exercises.length === 0 && <span className="spinner-text">No exercises yet.</span>}
      </div>
    </div>
  );
}

export default function RoutineDetail() {
  const { id } = useParams();
  const { data: routines, loading, reload } = useApi(() => api.get<Routine[]>('/api/routines'));
  const [workoutName, setWorkoutName] = useState('');

  const routine = routines?.find((r) => r.id === Number(id));

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

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link to="/routines" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          ← All routines
        </Link>
        <h1 className="page-title">{routine.name}</h1>
      </div>

      {routine.workouts.map((w) => (
        <WorkoutCard key={w.id} workout={w} onChanged={reload} />
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
    </>
  );
}
