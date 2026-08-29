import type { CSSProperties } from 'react';
import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useIsMobile } from '../hooks/useIsMobile';
import type { Exercise, Routine, Workout, WorkoutExerciseEntry } from '../types';
import { loadPriorities, savePriorities, type PriorityMap } from '../utils/musclePriority';
import { computeMuscleVolumeRows, type MuscleVolumeRow } from '../utils/volumeGuideline';
import { useLanguage } from '../i18n/LanguageContext';
import MuscleExercisePicker from '../components/MuscleExercisePicker';
import { DAY_TYPES, UPPER_MUSCLES, LOWER_MUSCLES } from '../data/routineTemplates';
import { targetFor } from '../data/muscleVolumeTargets';

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

const TABLE_COLUMNS = '18px 22px 1.8fr 56px 96px 52px 60px 22px';

function RedundancyIcon({ flag }: { flag: RedundancyFlag }) {
  return (
    <span
      title={`Redundant with "${flag.withName}" — both hit ${flag.jointAction}${flag.plane ? ` (${flag.plane})` : ''}. They compete for the same recovery instead of adding new stimulus — swap one for a different joint action, or drop it and add its sets to the other.`}
      style={{ color: 'var(--accent)', cursor: 'help', fontSize: 12 }}
    >
      ⚠
    </span>
  );
}

function WorkoutCard({
  workout,
  priorities,
  volumeByMuscle,
  highlightMuscle,
  onChanged,
  onDeleted,
}: {
  workout: Workout;
  priorities: PriorityMap;
  volumeByMuscle: Map<string, MuscleVolumeRow>;
  highlightMuscle: string | null;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(workout.name);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  // Local copy is the source of truth for rendering: PUT round-trips are debounced,
  // so if edits to two cells in the same row fired straight off `workout.exercises`
  // they'd race and the slower one would overwrite the faster one's change. Only
  // resyncs on a genuine day switch, not on every parent reload, so an in-flight
  // edit here never gets clobbered by a reload triggered elsewhere on the page.
  const [exercises, setExercises] = useState<WorkoutExerciseEntry[]>(workout.exercises);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const isMobile = useIsMobile();
  const redundant = findRedundant(exercises);

  useEffect(() => {
    setExercises(workout.exercises);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id]);

  async function persist(list: WorkoutExerciseEntry[], name: string = workout.name) {
    await api.put(`/api/workouts/${workout.id}`, {
      name,
      day_index: workout.day_index ?? 0,
      exercises: list.map((e, i) => ({
        exercise_id: e.exercise_id,
        order_index: i,
        target_sets: e.target_sets,
        rep_range_min: e.rep_range_min,
        rep_range_max: e.rep_range_max,
        rir_target: e.rir_target,
        rest_seconds: e.rest_seconds,
        comments: e.comments,
      })),
    });
    onChanged();
  }

  function persistNow(list: WorkoutExerciseEntry[], name?: string) {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current);
      saveTimeout.current = null;
    }
    persist(list, name);
  }

  function persistDebounced(list: WorkoutExerciseEntry[]) {
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    saveTimeout.current = setTimeout(() => persist(list), 500);
  }

  function renameWorkout() {
    setEditingName(false);
    if (!nameDraft.trim() || nameDraft.trim() === workout.name) return;
    persistNow(exercises, nameDraft.trim());
  }

  function addExercise(ex: Exercise) {
    const next: WorkoutExerciseEntry[] = [
      ...exercises,
      {
        id: -1,
        order_index: exercises.length,
        target_sets: 3,
        rep_range_min: 8,
        rep_range_max: 12,
        rir_target: 2,
        rest_seconds: 90,
        comments: null,
        exercise_id: ex.id,
        name: ex.name,
        equipment: ex.equipment,
        muscle: ex.muscle,
        joint_action: ex.joint_action,
        plane: ex.plane,
      },
    ];
    setExercises(next);
    persistNow(next);
    setPickerOpen(false);
  }

  function removeExercise(exerciseId: number) {
    const next = exercises.filter((e) => e.exercise_id !== exerciseId);
    setExercises(next);
    persistNow(next);
  }

  function updateField(exerciseId: number, field: keyof WorkoutExerciseEntry, value: number | null) {
    const next = exercises.map((e) => (e.exercise_id === exerciseId ? { ...e, [field]: value } : e));
    setExercises(next);
    persistDebounced(next);
  }

  function reorderByPriority() {
    const rank = (m: string) => priorities[m] ?? 2;
    const sorted = [...exercises].sort((a, b) => rank(a.muscle) - rank(b.muscle));
    setExercises(sorted);
    persistNow(sorted);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) {
      setDragIndex(null);
      return;
    }
    const next = [...exercises];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setExercises(next);
    persistNow(next);
  }

  async function deleteWorkout() {
    if (!window.confirm(`Delete "${workout.name}"? This removes its exercises and logged sessions too.`)) return;
    await api.delete(`/api/workouts/${workout.id}`);
    onDeleted();
  }

  const hasPriorityData = exercises.some((e) => priorities[e.muscle] != null);

  function numberCell(value: number | null, onSave: (v: number | null) => void, width: number, title: string) {
    return (
      <input
        type="number"
        value={value ?? ''}
        title={title}
        onChange={(e) => onSave(e.target.value === '' ? null : Number(e.target.value))}
        style={{ width, padding: '6px 8px', textAlign: 'center' }}
      />
    );
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        {editingName ? (
          <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
            <input
              type="text"
              value={nameDraft}
              autoFocus
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && renameWorkout()}
              style={{ font: "500 14px/1 'Inter Tight', sans-serif", width: 180 }}
            />
            <button className="btn-ghost" onClick={renameWorkout}>
              Save
            </button>
          </div>
        ) : (
          <span
            onClick={() => {
              setNameDraft(workout.name);
              setEditingName(true);
            }}
            title="Click to rename"
            style={{ font: "500 16px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)', cursor: 'text' }}
          >
            {workout.name} <span style={{ font: "400 11px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>✎</span>
          </span>
        )}
        <div style={{ display: 'flex', gap: 8 }}>
          {hasPriorityData && (
            <button className="btn-ghost" onClick={reorderByPriority} title="Move priority-1 muscles earlier in the session">
              Sort by priority
            </button>
          )}
          <button
            onClick={deleteWorkout}
            title="Delete this workout day"
            style={{ border: 'none', background: 'transparent', color: 'var(--text-dim)', fontSize: 13, padding: '6px 8px' }}
          >
            Delete
          </button>
        </div>
      </div>

      {!isMobile && exercises.length > 0 && (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: TABLE_COLUMNS,
            gap: 8,
            font: "500 10px/1 'Inter', sans-serif",
            color: 'var(--text-dim)',
            textTransform: 'uppercase',
            letterSpacing: '.03em',
            paddingBottom: 6,
            borderBottom: '1px solid var(--border)',
          }}
        >
          <span />
          <span />
          <span>Exercise</span>
          <span style={{ textAlign: 'center' }}>Sets</span>
          <span style={{ textAlign: 'center' }}>Reps</span>
          <span style={{ textAlign: 'center' }}>RIR</span>
          <span style={{ textAlign: 'center' }}>Rest</span>
          <span />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: isMobile ? 8 : 2 }}>
        {exercises.map((ex, i) => {
          const guideline = volumeByMuscle.get(ex.muscle);
          const flag = redundant.get(ex.exercise_id);
          const highlighted = highlightMuscle != null && ex.muscle === highlightMuscle;
          const rowStyle: CSSProperties = {
            background: highlighted ? 'var(--hover-bg)' : 'transparent',
            transition: 'background 0.6s ease',
            borderRadius: 6,
          };

          if (isMobile) {
            return (
              <div
                key={ex.exercise_id}
                data-muscle={ex.muscle}
                style={{
                  ...rowStyle,
                  background: highlighted ? 'var(--hover-bg)' : 'var(--bg-raised)',
                  border: '1px solid var(--border)',
                  padding: '10px 12px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 6,
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
                  <Link
                    to={`/app/exercises/${ex.exercise_id}/progress`}
                    style={{ font: "500 14px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}
                  >
                    {ex.name}
                  </Link>
                  {flag && <RedundancyIcon flag={flag} />}
                  <span
                    onClick={() => removeExercise(ex.exercise_id)}
                    style={{ color: 'var(--text-dim)', cursor: 'pointer', fontSize: 12, marginLeft: 'auto' }}
                  >
                    Remove
                  </span>
                </div>
                <span style={{ font: "400 11px/1.3 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                  {ex.muscle.replace('_', ' ')} · {ex.joint_action || '—'}
                  {guideline?.target != null && ` · target ${guideline.target}${guideline.isFloor ? '+' : ''}/wk`}
                </span>
                <div style={{ display: 'flex', gap: 14, alignItems: 'center', flexWrap: 'wrap' }}>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 2, font: "400 10px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                    Sets
                    {numberCell(ex.target_sets, (v) => updateField(ex.exercise_id, 'target_sets', v), 48, 'Target sets')}
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 2, font: "400 10px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                    Reps min
                    {numberCell(ex.rep_range_min, (v) => updateField(ex.exercise_id, 'rep_range_min', v), 48, 'Rep range min')}
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 2, font: "400 10px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                    Reps max
                    {numberCell(ex.rep_range_max, (v) => updateField(ex.exercise_id, 'rep_range_max', v), 48, 'Rep range max')}
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 2, font: "400 10px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                    RIR
                    {numberCell(ex.rir_target, (v) => updateField(ex.exercise_id, 'rir_target', v), 40, 'Target RIR')}
                  </label>
                  <label style={{ display: 'flex', flexDirection: 'column', gap: 2, font: "400 10px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                    Rest (s)
                    {numberCell(ex.rest_seconds, (v) => updateField(ex.exercise_id, 'rest_seconds', v), 52, 'Rest, in seconds')}
                  </label>
                </div>
              </div>
            );
          }

          return (
            <div
              key={ex.exercise_id}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={() => handleDrop(i)}
              data-muscle={ex.muscle}
              style={{
                ...rowStyle,
                display: 'grid',
                gridTemplateColumns: TABLE_COLUMNS,
                gap: 8,
                alignItems: 'center',
                padding: '6px 0',
              }}
            >
              <span title="Drag to reorder" style={{ cursor: 'grab', color: 'var(--text-faint)', fontSize: 13 }}>
                ⠿
              </span>
              <span style={{ font: "600 12px/1 'Inter Tight', sans-serif", color: 'var(--text-dim)' }}>{i + 1}</span>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 2, minWidth: 0 }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <Link
                    to={`/app/exercises/${ex.exercise_id}/progress`}
                    style={{ font: "500 13.5px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                  >
                    {ex.name}
                  </Link>
                  {flag && <RedundancyIcon flag={flag} />}
                </span>
                <span style={{ font: "400 11px/1.3 'Inter', sans-serif", color: 'var(--text-dim)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                  {ex.muscle.replace('_', ' ')} · {ex.joint_action || '—'}
                  {priorities[ex.muscle] != null && ` · priority ${priorities[ex.muscle]}`}
                  {guideline?.target != null && ` · target ${guideline.target}${guideline.isFloor ? '+' : ''}/wk`}
                </span>
              </div>
              {numberCell(ex.target_sets, (v) => updateField(ex.exercise_id, 'target_sets', v), 44, 'Target sets')}
              <div style={{ display: 'flex', alignItems: 'center', gap: 3, justifyContent: 'center' }}>
                {numberCell(ex.rep_range_min, (v) => updateField(ex.exercise_id, 'rep_range_min', v), 38, 'Rep range min')}
                <span style={{ color: 'var(--text-faint)', fontSize: 11 }}>–</span>
                {numberCell(ex.rep_range_max, (v) => updateField(ex.exercise_id, 'rep_range_max', v), 38, 'Rep range max')}
              </div>
              {numberCell(ex.rir_target, (v) => updateField(ex.exercise_id, 'rir_target', v), 40, 'Target RIR')}
              {numberCell(ex.rest_seconds, (v) => updateField(ex.exercise_id, 'rest_seconds', v), 48, 'Rest, in seconds')}
              <span
                onClick={() => removeExercise(ex.exercise_id)}
                title="Remove"
                style={{ color: 'var(--text-dim)', cursor: 'pointer', fontSize: 14, textAlign: 'center' }}
              >
                ×
              </span>
            </div>
          );
        })}
        {exercises.length === 0 && <span className="spinner-text">No exercises yet.</span>}

        <div
          onClick={() => setPickerOpen((v) => !v)}
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            padding: '10px 4px',
            marginTop: 4,
            borderTop: exercises.length > 0 ? '1px solid var(--border)' : 'none',
            cursor: 'pointer',
            color: 'var(--accent)',
            font: "600 12.5px/1 'Inter Tight', sans-serif",
          }}
        >
          {pickerOpen ? '− Close' : '+ Add exercise'}
        </div>
      </div>

      {pickerOpen && <MuscleExercisePicker onPick={addExercise} />}
    </div>
  );
}

// Forces a real ranking instead of letting every muscle end up "3" (which isn't a
// priority at all) - each section caps how many muscles can be marked weak-point (1)
// or strong-point (3), scaled to roughly a quarter of that section's muscle count.
function priorityCap(sectionSize: number): number {
  return Math.max(1, Math.ceil(sectionSize / 4));
}

function MusclePrioritySection({
  title,
  muscles,
  priorities,
  onSet,
  onClear,
}: {
  title: string;
  muscles: string[];
  priorities: PriorityMap;
  onSet: (m: string, r: 1 | 2 | 3) => void;
  onClear: (m: string) => void;
}) {
  if (muscles.length === 0) return null;
  const cap = priorityCap(muscles.length);
  const count = (r: 1 | 2 | 3) => muscles.filter((m) => priorities[m] === r).length;
  const count1 = count(1);
  const count3 = count(3);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <span style={{ font: "600 11px/1 'Inter Tight', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
        {title} · weak points {count1}/{cap} · strong points {count3}/{cap}
      </span>
      {muscles.map((m) => {
        const current = priorities[m];
        return (
          <div key={m} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <span style={{ width: 140, font: "400 13px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>
              {m.replace('_', ' ')}
            </span>
            <div style={{ display: 'flex', gap: 4 }}>
              {([1, 2, 3] as const).map((r) => {
                const active = current === r;
                const capped = (r === 1 || r === 3) && !active && count(r) >= cap;
                return (
                  <button
                    key={r}
                    disabled={capped}
                    onClick={() => (active ? onClear(m) : onSet(m, r))}
                    title={capped ? `Only ${cap} muscle${cap === 1 ? '' : 's'} can be marked ${r === 1 ? 'weak' : 'strong'} in this section` : undefined}
                    style={{
                      border: '1px solid var(--border2)',
                      background: active ? 'var(--accent)' : 'transparent',
                      color: active ? 'var(--accent-text)' : 'var(--nav-inactive)',
                      opacity: capped ? 0.35 : 1,
                      width: 30,
                      height: 30,
                      borderRadius: 6,
                      font: "600 12px/1 'Inter Tight', sans-serif",
                      cursor: capped ? 'not-allowed' : 'pointer',
                    }}
                  >
                    {r}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function MusclePriorityCard({
  upperMuscles,
  lowerMuscles,
  priorities,
  onSet,
  onClear,
}: {
  upperMuscles: string[];
  lowerMuscles: string[];
  priorities: PriorityMap;
  onSet: (m: string, r: 1 | 2 | 3) => void;
  onClear: (m: string) => void;
}) {
  if (upperMuscles.length === 0 && lowerMuscles.length === 0) return null;
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="label">Muscle priorities</span>
        <span style={{ font: "400 11px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
          1 = weak point (train first) · 3 = strong point (train last) — capped per section so it stays a real ranking
        </span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24 }}>
        <MusclePrioritySection title="Upper body" muscles={upperMuscles} priorities={priorities} onSet={onSet} onClear={onClear} />
        <MusclePrioritySection title="Lower body" muscles={lowerMuscles} priorities={priorities} onSet={onSet} onClear={onClear} />
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
  if (r.target == null) {
    return `No target set for this muscle yet — ${r.weeklySets} sets/week logged.`;
  }
  const targetText = `${r.target}${r.isFloor ? '+' : ''} sets/week`;
  if (r.status === 'missing') {
    return `Nothing is training this muscle at all. Your program targets ${targetText} for it.`;
  }
  if (r.status === 'low') {
    return `Your program targets ${targetText} for this muscle — ${r.weeklySets} is meaningfully below that, so it's under-stimulated relative to your own plan.`;
  }
  if (r.status === 'high') {
    return `Your program targets ${targetText} for this muscle — ${r.weeklySets} sets is well past that, adding fatigue without much extra growth signal.`;
  }
  return `Your program targets ${targetText} for this muscle — ${r.weeklySets} sets is close enough to that. No change needed.`;
}

const STATUS_COLOR: Record<MuscleVolumeRow['status'], string> = {
  missing: 'var(--accent)',
  low: 'var(--danger)',
  ok: 'var(--text-dim)',
  high: 'var(--accent)',
};

function VolumeFrequencyCard({
  rows,
  selectedMuscle,
  onSelectMuscle,
}: {
  rows: MuscleVolumeRow[];
  selectedMuscle: string | null;
  onSelectMuscle: (muscle: string | null) => void;
}) {
  if (rows.length === 0) return null;

  const missingCount = rows.filter((r) => r.status === 'missing').length;

  return (
    <div className="card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="label">Volume & frequency check</span>
        <span style={{ font: "400 11.5px/1.4 'Inter', sans-serif", color: 'var(--text-dim)' }}>
          How many hard sets a muscle can grow from — and recover from — depends on how often it's trained per week; that
          trade-off between volume and frequency is long-standing, widely-cited resistance-training guidance, not tied to
          any one book. The targets below come from your Upper/Lower program specifically — a Full Body or PPL routine
          trains each muscle at a different frequency, so "High" there means "more than your Upper/Lower baseline", not
          an absolute ceiling.
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
        <span>Your target</span>
        <span>Status</span>
      </div>
      {rows.map((r) => (
        <div
          key={r.muscle}
          onClick={() => onSelectMuscle(selectedMuscle === r.muscle ? null : r.muscle)}
          title="Click to highlight this muscle's exercises below"
          style={{
            display: 'grid',
            gridTemplateColumns: '1.3fr 0.8fr 0.8fr 1.2fr 0.9fr',
            gap: 8,
            alignItems: 'center',
            padding: '4px 6px',
            marginInline: -6,
            borderRadius: 6,
            cursor: 'pointer',
            background: selectedMuscle === r.muscle ? 'var(--hover-bg)' : 'transparent',
          }}
        >
          <span style={{ font: "400 13px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>{r.muscle.replace('_', ' ')}</span>
          <span style={{ font: "400 13px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>{r.frequency}x</span>
          <span style={{ font: "400 13px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>{r.weeklySets}</span>
          <span style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
            {r.target != null ? `${r.target}${r.isFloor ? '+' : ''}` : '—'}
          </span>
          <span
            title={explainStatus(r)}
            style={{
              font: "600 11px/1 'Inter Tight', sans-serif",
              color: STATUS_COLOR[r.status],
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

function NewWorkoutDayCard({ onAdd }: { onAdd: (name: string) => void }) {
  const [dayTypeKey, setDayTypeKey] = useState(DAY_TYPES[0].key);
  const [customName, setCustomName] = useState('');
  const dayType = DAY_TYPES.find((d) => d.key === dayTypeKey)!;
  const isCustom = dayType.key === 'custom';
  const name = isCustom ? customName : dayType.label;

  const rows = dayType.muscles
    .map((m) => ({ muscle: m, target: targetFor(m) }))
    .filter((r) => r.target != null);
  const totalTarget = rows.reduce((sum, r) => sum + (r.target?.weeklySets ?? 0), 0);

  return (
    <div className="card" style={{ maxWidth: 640 }}>
      <span className="label">New workout day</span>

      <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
        {DAY_TYPES.map((d) => (
          <button
            key={d.key}
            onClick={() => setDayTypeKey(d.key)}
            style={{
              border: 'none',
              background: dayTypeKey === d.key ? 'var(--accent)' : 'var(--hover-bg)',
              color: dayTypeKey === d.key ? 'var(--accent-text)' : 'var(--nav-inactive)',
              padding: '7px 14px',
              borderRadius: 6,
              font: "600 12px/1 'Inter Tight', sans-serif",
            }}
          >
            {d.label}
          </button>
        ))}
      </div>

      {!isCustom && rows.length > 0 && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: '10px 12px', background: 'var(--bg)', borderRadius: 8 }}>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span style={{ font: "600 12px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>
              {dayType.label} — muscles trained
            </span>
            <span style={{ font: "600 11px/1 'Inter Tight', sans-serif", color: 'var(--accent)' }}>
              {Math.round(totalTarget * 10) / 10} sets/wk combined target
            </span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', gap: 4 }}>
            {rows.map((r) => (
              <span key={r.muscle} style={{ font: "400 11.5px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>
                {r.muscle.replace('_', ' ')} · {r.target!.weeklySets}
                {r.target!.isFloor ? '+' : ''}
              </span>
            ))}
          </div>
          <span className="muted-note">
            These are your program's weekly-set targets for each muscle — split across however many times a week you
            actually run a {dayType.label.toLowerCase()} day.
          </span>
        </div>
      )}

      <div style={{ display: 'flex', gap: 10 }}>
        {isCustom && (
          <input
            type="text"
            placeholder="e.g. Arms Focus"
            value={customName}
            onChange={(e) => setCustomName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && name.trim() && onAdd(name.trim())}
            style={{ flex: 1 }}
          />
        )}
        <button className="btn-primary" onClick={() => onAdd(name.trim())} disabled={!name.trim()} style={{ marginLeft: isCustom ? 0 : 'auto' }}>
          Add {!isCustom && dayType.label}
        </button>
      </div>
    </div>
  );
}

export default function RoutineDetail() {
  const { t } = useLanguage();
  const { id } = useParams();
  const { data: routines, loading, reload } = useApi(() => api.get<Routine[]>('/api/routines'));
  const { data: allExercises } = useApi(() => api.get<Exercise[]>('/api/exercises'));
  const [priorities, setPriorities] = useState<PriorityMap>({});
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [highlightMuscle, setHighlightMuscle] = useState<string | null>(null);

  useEffect(() => {
    setPriorities(loadPriorities());
  }, []);

  const routine = routines?.find((r) => r.id === Number(id));

  function handleSetPriority(muscle: string, rank: 1 | 2 | 3) {
    const next = { ...priorities, [muscle]: rank };
    setPriorities(next);
    savePriorities(next);
  }

  function handleClearPriority(muscle: string) {
    const next = { ...priorities };
    delete next[muscle];
    setPriorities(next);
    savePriorities(next);
  }

  async function addWorkout(name: string) {
    if (!routine || !name.trim()) return;
    await api.post(`/api/routines/${routine.id}/workouts`, {
      name: name.trim(),
      day_index: routine.workouts.length,
      exercises: [],
    });
    reload();
  }

  async function renameRoutine() {
    if (!routine || !nameDraft.trim() || nameDraft.trim() === routine.name) {
      setEditingName(false);
      return;
    }
    await api.put(`/api/routines/${routine.id}`, { name: nameDraft.trim() });
    setEditingName(false);
    reload();
  }

  if (loading) return <span className="spinner-text">Loading…</span>;
  if (!routine) return <span className="error-text">Routine not found.</span>;

  const muscles = [...new Set(routine.workouts.flatMap((w) => w.exercises.map((e) => e.muscle)))].sort();
  const upperMuscles = muscles.filter((m) => UPPER_MUSCLES.includes(m));
  const lowerMuscles = muscles.filter((m) => LOWER_MUSCLES.includes(m));
  const allMuscles = [...new Set((allExercises || []).map((e) => e.muscle))];
  const volumeRows = computeMuscleVolumeRows(routine, allMuscles);
  const volumeByMuscle = new Map(volumeRows.map((r) => [r.muscle, r]));

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <Link to="/app/routines" style={{ fontSize: 12, color: 'var(--text-dim)' }}>
          ← {t('pages.routines')}
        </Link>
        {editingName ? (
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input
              type="text"
              value={nameDraft}
              autoFocus
              onChange={(e) => setNameDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && renameRoutine()}
              style={{ font: "500 22px/1.2 'Inter Tight', sans-serif", maxWidth: 360 }}
            />
            <button className="btn-primary" onClick={renameRoutine}>
              Save
            </button>
            <button className="btn-ghost" onClick={() => setEditingName(false)}>
              Cancel
            </button>
          </div>
        ) : (
          <h1
            className="page-title"
            onClick={() => {
              setNameDraft(routine.name);
              setEditingName(true);
            }}
            title="Click to rename"
            style={{ cursor: 'text' }}
          >
            {routine.name} <span style={{ font: "400 13px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>✎</span>
          </h1>
        )}
      </div>

      <VolumeFrequencyCard rows={volumeRows} selectedMuscle={highlightMuscle} onSelectMuscle={setHighlightMuscle} />

      <MusclePriorityCard
        upperMuscles={upperMuscles}
        lowerMuscles={lowerMuscles}
        priorities={priorities}
        onSet={handleSetPriority}
        onClear={handleClearPriority}
      />

      {routine.workouts.map((w) => (
        <WorkoutCard
          key={w.id}
          workout={w}
          priorities={priorities}
          volumeByMuscle={volumeByMuscle}
          highlightMuscle={highlightMuscle}
          onChanged={reload}
          onDeleted={reload}
        />
      ))}

      <NewWorkoutDayCard onAdd={addWorkout} />
    </>
  );
}
