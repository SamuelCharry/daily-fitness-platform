import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Exercise, Routine, Workout, WorkoutExerciseEntry } from '../types';
import { volumeMuscle, volumeMuscleName, type MuscleVolumeRow } from '../utils/volumeGuideline';
import { analysePlan, redundantPairs, type PlanWarning } from '../utils/planAnalysis';
import RoutineReview from '../components/RoutineReview';
import RoutineFineTuning from '../components/RoutineFineTuning';
import MuscleExercisePicker from '../components/MuscleExercisePicker';
import WeekBoard, { type BoardItem } from '../components/WeekBoard';
import { DAY_TYPES } from '../data/routineTemplates';
import { baselineLabel } from '../data/muscleVolumeTargets';
import { jointActionName, muscleName, planeName, plural, WEEKDAYS } from '../data/labels';

const DAY_TYPE_LABELS: Record<string, string> = { upper: 'Upper', lower: 'Lower', push: 'Push', pull: 'Pull', legs: 'Legs', full_body: 'Full Body', custom: 'Otro' };

// Alternatives share broad metadata; this does not establish equal stimulus.
function SwapPanel({ slot, inDay, exercises, onPick, onClose }: { slot: WorkoutExerciseEntry; inDay: Set<number>; exercises: Exercise[]; onPick: (ex: Exercise) => void; onClose: () => void }) {
  const [showOthers, setShowOthers] = useState(false);
  const sameMuscle = exercises.filter(e => e.muscle === slot.muscle && e.id !== slot.exercise_id);
  const exact = sameMuscle.filter(e => e.joint_action === slot.joint_action && e.plane === slot.plane);
  const others = sameMuscle.filter(e => !exact.includes(e));
  const option = (e: Exercise) => (
    <button key={e.id} className="swap-option" disabled={inDay.has(e.id)} onClick={() => onPick(e)}>
      <strong>{e.name}</strong>
      <span>{e.equipment || '—'} · {jointActionName(e.joint_action)} · plano {planeName(e.plane)}{inDay.has(e.id) ? ' · ya está en este día' : ''}</span>
    </button>
  );
  return (
    <div className="swap-panel">
      <div className="swap-head">
        <div><strong>Cambiar {slot.name}</strong><span>Se mantienen series, reps, RIR, descanso y posición. Las series que ya registraste quedan en el historial del ejercicio anterior.</span></div>
        <button className="quiet-button" onClick={onClose}>Cerrar</button>
      </div>
      <p className="swap-label">Mismo patrón general · {muscleName(slot.muscle).toLowerCase()}, {jointActionName(slot.joint_action)}, plano {planeName(slot.plane)}</p>
      {exact.length ? <div className="swap-list">{exact.map(option)}</div> : <p className="helper-text">No hay otro ejercicio con el mismo músculo, acción y plano en la biblioteca.</p>}
      {others.length > 0 && <>
        <button className="link-button" onClick={() => setShowOthers(v => !v)}>{showOthers ? 'Ocultar' : 'Ver'} otros ejercicios de {muscleName(slot.muscle).toLowerCase()} ({others.length}) · compara la ejecución</button>
        {showOthers && <div className="swap-list">{others.map(option)}</div>}
      </>}
    </div>
  );
}

function WorkoutCard({ workout, exercisesLibrary, volumeByMuscle, highlightMuscle, registerFlush, onEdited, onChanged, onDeleted }: {
  workout: Workout;
  exercisesLibrary: Exercise[];
  volumeByMuscle: Map<string, MuscleVolumeRow>;
  highlightMuscle: string | null;
  registerFlush: (id: number, flush: (() => Promise<void>) | null) => void;
  onEdited: () => void;
  onChanged: () => void;
  onDeleted: () => void;
}) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const [swapping, setSwapping] = useState<number | null>(null);
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState(workout.name);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [duplicating, setDuplicating] = useState(false);
  const [duplicateId, setDuplicateId] = useState<number | null>(null);
  // Local copy is the source of truth for rendering: PUTs are debounced, so editing two
  // cells from `workout.exercises` would race. It resyncs only on a genuine day switch.
  const [exercises, setExercises] = useState<WorkoutExerciseEntry[]>(workout.exercises);
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useRef<WorkoutExerciseEntry[] | null>(null);
  const saveQueue = useRef<Promise<boolean>>(Promise.resolve(true));
  const redundant = redundantPairs(exercises);

  useEffect(() => {
    setExercises(workout.exercises);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workout.id]);

  function persist(list: WorkoutExerciseEntry[], name: string = workout.name) {
    onEdited();
    if (pending.current === list) pending.current = null;
    const next = saveQueue.current.then(() => save(list, name));
    saveQueue.current = next;
    return next;
  }

  async function save(list: WorkoutExerciseEntry[], name: string) {
    setError('');
    try {
      await api.put(`/api/workouts/${workout.id}`, {
        name,
        day_index: workout.day_index ?? 0,
        exercises: list.map((e, i) => ({ exercise_id: e.exercise_id, order_index: i, target_sets: e.target_sets, rep_range_min: e.rep_range_min, rep_range_max: e.rep_range_max, rir_target: e.rir_target, rest_seconds: e.rest_seconds, comments: e.comments })),
      });
      onChanged();
      return true;
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
      return false;
    }
  }

  async function flush() {
    if (saveTimeout.current) { clearTimeout(saveTimeout.current); saveTimeout.current = null; }
    if (pending.current) { if (!await persist(pending.current)) throw new Error('No se pudieron guardar tus cambios.'); }
    if (!await saveQueue.current) throw new Error('Revisa los cambios pendientes del día antes de ajustar.');
  }

  useEffect(() => {
    registerFlush(workout.id, flush);
    return () => { registerFlush(workout.id, null); };
  });

  function persistNow(list: WorkoutExerciseEntry[], name?: string) {
    if (saveTimeout.current) { clearTimeout(saveTimeout.current); saveTimeout.current = null; }
    pending.current = null;
    persist(list, name);
  }

  function persistDebounced(list: WorkoutExerciseEntry[]) {
    onEdited();
    if (saveTimeout.current) clearTimeout(saveTimeout.current);
    pending.current = list;
    saveTimeout.current = setTimeout(() => persist(list), 500);
  }

  function renameWorkout() {
    setEditingName(false);
    if (!nameDraft.trim() || nameDraft.trim() === workout.name) return;
    persistNow(exercises, nameDraft.trim());
  }

  function addExercise(ex: Exercise) {
    if (exercises.some(e => e.exercise_id === ex.id)) { setError(`${ex.name} ya está en este día.`); return; }
    const next: WorkoutExerciseEntry[] = [...exercises, { id: -1, order_index: exercises.length, target_sets: 3, rep_range_min: 8, rep_range_max: 12, rir_target: 2, rest_seconds: 120, comments: null, exercise_id: ex.id, name: ex.name, equipment: ex.equipment, muscle: ex.muscle, joint_action: ex.joint_action, plane: ex.plane }];
    setExercises(next);
    persistNow(next);
    setPickerOpen(false);
  }

  async function swap(slot: WorkoutExerciseEntry, ex: Exercise) {
    setError('');
    try {
      await flush();
      // A just-added exercise has no server id until the routine reloads.
      const id = slot.id > 0 ? slot.id : (await api.get<Routine[]>('/api/routines')).flatMap(r => r.workouts).find(w => w.id === workout.id)?.exercises.find(e => e.exercise_id === slot.exercise_id)?.id;
      if (!id) throw new Error('Guarda el día e inténtalo de nuevo.');
      const updated = await api.post<Workout>(`/api/workout-exercises/${id}/swap`, { exercise_id: ex.id });
      setExercises(updated.exercises);
      setSwapping(null);
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo cambiar el ejercicio.');
    }
  }

  function removeExercise(exerciseId: number) {
    const next = exercises.filter(e => e.exercise_id !== exerciseId);
    setExercises(next);
    persistNow(next);
  }

  function updateField(exerciseId: number, field: keyof WorkoutExerciseEntry, value: number | null) {
    const next = exercises.map(e => (e.exercise_id === exerciseId ? { ...e, [field]: value } : e));
    setExercises(next);
    persistDebounced(next);
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex === null || dragIndex === targetIndex) { setDragIndex(null); return; }
    const next = [...exercises];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(targetIndex, 0, moved);
    setDragIndex(null);
    setExercises(next);
    persistNow(next);
  }

  async function deleteWorkout() {
    if (!window.confirm(`¿Eliminar «${workout.name}»? Se borran sus ejercicios y las sesiones registradas de este día.`)) return;
    await api.delete(`/api/workouts/${workout.id}`);
    onDeleted();
  }

  async function duplicateWorkout() {
    if (duplicating) return;
    setDuplicating(true); setDuplicateId(null); setError('');
    try {
      if (saveTimeout.current) { clearTimeout(saveTimeout.current); saveTimeout.current = null; }
      // Finish queued edits before the server copies the current day's settings.
      if (!await persist(exercises, editingName ? nameDraft.trim() || workout.name : workout.name)) return;
      const copy = await api.post<Workout>(`/api/workouts/${workout.id}/duplicate`);
      setDuplicateId(copy.id); onChanged();
    } catch (err) { setError(err instanceof Error ? err.message : 'No se pudo duplicar el día.'); }
    finally { setDuplicating(false); }
  }

  function numberCell(value: number | null, field: keyof WorkoutExerciseEntry, exerciseId: number, label: string) {
    return <input type="number" inputMode="numeric" aria-label={label} value={value ?? ''} onChange={e => updateField(exerciseId, field, e.target.value === '' ? null : Number(e.target.value))} />;
  }

  const inDay = new Set(exercises.map(e => e.exercise_id));
  const totalSets = exercises.reduce((n, e) => n + (e.target_sets || 0), 0);

  return (
    <section className="panel day-card" id={`day-${workout.id}`}>
      <div className="day-card-head">
        <div>
          <span className="day-when">{workout.weekday != null ? WEEKDAYS[workout.weekday] : 'Sin día fijo'}</span>
          {editingName
            ? <span className="rename"><input value={nameDraft} autoFocus onChange={e => setNameDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameWorkout()} onBlur={renameWorkout} aria-label="Nombre del día" /></span>
            : <h2><button className="title-button" onClick={() => { setNameDraft(workout.name); setEditingName(true); }} title="Renombrar">{workout.name}</button></h2>}
          <p className="helper-text">{plural(exercises.length, "ejercicio", "ejercicios")} · {plural(totalSets, "serie", "series")}</p>
        </div>
        <div className="routine-actions">
          <Link className="btn-ghost" to={`/app/session/${workout.id}`}>Entrenar</Link>
          <button className="btn-ghost" disabled={duplicating} onClick={duplicateWorkout}>{duplicating ? 'Duplicando…' : 'Duplicar día'}</button>
          <button className="quiet-button" onClick={deleteWorkout}>Eliminar</button>
        </div>
      </div>

      {duplicateId && <p role="status" className="helper-text">Día duplicado con sus ejercicios, series, repeticiones, RIR y descansos. <a href={`#day-${duplicateId}`}>Ver copia</a>. Asígnala a otro día en la semana fija. Las dos versiones se editan por separado.</p>}

      {exercises.length > 0 && <div className="ex-row ex-head" aria-hidden="true"><span /><span /><span>Ejercicio</span><span>Series</span><span>Reps</span><span>RIR</span><span>Desc. min</span><span /></div>}
      {exercises.map((ex, i) => {
        const guideline = volumeByMuscle.get(volumeMuscle(ex.muscle));
        const pair = redundant.get(ex.exercise_id);
        return (
          <div key={ex.exercise_id}>
            <div
              className={`ex-row${highlightMuscle === volumeMuscle(ex.muscle) ? ' highlighted' : ''}${dragIndex === i ? ' dragging' : ''}`}
              draggable
              onDragStart={() => setDragIndex(i)}
              onDragOver={e => e.preventDefault()}
              onDrop={() => handleDrop(i)}
            >
              <span className="drag-handle" title="Arrastra para reordenar">⠿</span>
              <span className="ex-index">{i + 1}</span>
              <div className="ex-name">
                <Link to={`/app/exercises/${ex.exercise_id}/progress`}>{ex.name}</Link>
                <span>{muscleName(ex.muscle)} · {jointActionName(ex.joint_action)}{guideline?.baseline ? ` · TNF ${baselineLabel(guideline.baseline)} series directas/día (${guideline.frequency} días/sem)` : ''}</span>
                {pair && <span className="ex-flag">Ejercicio repetido: {pair.other}. <button className="link-button" onClick={() => setSwapping(ex.exercise_id)}>Cambiar uno</button></span>}
              </div>
              <label className="ex-num"><small>Series</small>{numberCell(ex.target_sets, 'target_sets', ex.exercise_id, 'Series')}</label>
              <label className="ex-num reps"><small>Reps</small>{numberCell(ex.rep_range_min, 'rep_range_min', ex.exercise_id, 'Reps mínimo')}<i>–</i>{numberCell(ex.rep_range_max, 'rep_range_max', ex.exercise_id, 'Reps máximo')}</label>
              <label className="ex-num"><small>RIR</small>{numberCell(ex.rir_target, 'rir_target', ex.exercise_id, 'RIR objetivo')}</label>
              <label className="ex-num"><small>Desc. min</small><input type="number" inputMode="decimal" min="0" step="0.5" aria-label="Descanso en minutos" value={ex.rest_seconds == null ? '' : ex.rest_seconds / 60} onChange={e => updateField(ex.exercise_id, 'rest_seconds', e.target.value === '' ? null : Math.round(Number(e.target.value) * 60))} /></label>
              <span className="ex-actions">
                <button className="chip-button" onClick={() => setSwapping(swapping === ex.exercise_id ? null : ex.exercise_id)} aria-expanded={swapping === ex.exercise_id}>Cambiar</button>
                <button className="icon-button" onClick={() => removeExercise(ex.exercise_id)} aria-label={`Quitar ${ex.name}`} title="Quitar">×</button>
              </span>
            </div>
            {swapping === ex.exercise_id && <SwapPanel slot={ex} inDay={inDay} exercises={exercisesLibrary} onPick={choice => swap(ex, choice)} onClose={() => setSwapping(null)} />}
          </div>
        );
      })}
      {!exercises.length && <p className="helper-text">Este día no tiene ejercicios.</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
      <button className="add-row" onClick={() => setPickerOpen(v => !v)}>{pickerOpen ? '− Cerrar' : '+ Agregar ejercicio'}</button>
      {pickerOpen && <MuscleExercisePicker onPick={addExercise} />}
    </section>
  );
}

function NewDayForm({ onAdd, onCancel }: { onAdd: (name: string) => void; onCancel: () => void }) {
  const [key, setKey] = useState(DAY_TYPES[0].key);
  const [custom, setCustom] = useState('');
  const dayType = DAY_TYPES.find(d => d.key === key)!;
  const isCustom = key === 'custom';
  const name = isCustom ? custom.trim() : dayType.label;
  const muscles = dayType.muscles;
  return (
    <div className="new-day">
      <div className="chip-row">{DAY_TYPES.map(d => <button key={d.key} className={`chip${key === d.key ? ' active' : ''}`} aria-pressed={key === d.key} onClick={() => setKey(d.key)}>{DAY_TYPE_LABELS[d.key] || d.label}</button>)}</div>
      {!isCustom && <p className="helper-text">Trabaja: {muscles.map(muscleName).join(', ')}.</p>}
      <div className="new-day-actions">
        {isCustom && <input value={custom} placeholder="Nombre, p. ej. Brazos" onChange={e => setCustom(e.target.value)} onKeyDown={e => e.key === 'Enter' && name && onAdd(name)} autoFocus />}
        <button className="btn-primary" disabled={!name} onClick={() => onAdd(name)}>Agregar {isCustom ? 'día' : dayType.label}</button>
        <button className="btn-ghost" onClick={onCancel}>Cancelar</button>
      </div>
      <p className="helper-text">El día nuevo aparece en «Sin día». Arrástralo a la semana.</p>
    </div>
  );
}

const STATUS_LABEL: Record<MuscleVolumeRow['status'], string> = { missing: 'Sin series directas', low: 'Debajo del baseline', ok: 'Dentro del baseline', high: 'Encima del baseline', mixed: 'Distribución desigual' };

function MuscleSummary({ rows, selected, onSelect }: { rows: MuscleVolumeRow[]; selected: string | null; onSelect: (m: string | null) => void }) {
  return (
    <details className="panel muscle-summary">
      <summary><h2>Resumen por músculo</h2><span className="helper-text">Series directas por día y frecuencia · baseline TNF</span></summary>
      <p className="helper-text">TNF Muscle Building Manual, páginas 18–19: 3+ días/sem → 1–3 series/día; 2 días → 2–6; 1 día → 6+, sin máximo indicado. Supone series a 0–1 RIR. Es una referencia inicial, no una regla universal.</p>
      <p className="helper-text">Contamos el músculo principal de cada ejercicio, sin sumar trabajo indirecto. Pecho agrupa sus regiones y espalda alta agrupa trapecios/romboides. Dos entrenos en la misma fecha cuentan como un día. Los músculos sin trabajo directo no generan avisos de volumen.</p>
      <div className="table-scroll"><table className="read-table">
        <thead><tr><th>Músculo</th><th>Días/sem</th><th>Series/sem</th><th>Series por día</th><th>Baseline TNF / día</th><th>Estado</th></tr></thead>
        <tbody>{rows.map(r => (
          <tr key={r.muscle} className={`clickable${selected === r.muscle ? ' selected' : ''}`} onClick={() => onSelect(selected === r.muscle ? null : r.muscle)}>
            <th>{volumeMuscleName(r.muscle)}</th><td>{r.frequency}</td><td>{r.weeklySets}</td><td>{r.days.map(d => `${d.weekday == null ? d.names.join(' + ') : WEEKDAYS[d.weekday]}: ${d.sets}`).join(' · ') || '—'}</td><td>{baselineLabel(r.baseline)}</td><td><span className={`status-pill s-${r.status}`}>{STATUS_LABEL[r.status]}</span></td>
          </tr>
        ))}</tbody>
      </table></div>
    </details>
  );
}

export default function RoutineDetail() {
  const { id } = useParams();
  return <RoutineEditor key={id} />;
}

function RoutineEditor() {
  const { id } = useParams();
  const { data: routines, loading, reload, setData } = useApi(() => api.get<Routine[]>('/api/routines'));
  const { data: allExercises } = useApi(() => api.get<Exercise[]>('/api/exercises'));
  const [editingName, setEditingName] = useState(false);
  const [nameDraft, setNameDraft] = useState('');
  const [highlightMuscle, setHighlightMuscle] = useState<string | null>(null);
  const [adding, setAdding] = useState(false);
  const [error, setError] = useState('');

  const [reviewedKey, setReviewedKey] = useState('');
  const [optimizing, setOptimizing] = useState(false);
  const [finishing, setFinishing] = useState(false);
  function edited() { setReviewedKey(''); setOptimizing(false); setTuningLocked(false); }
  const [tuningLocked, setTuningLocked] = useState(false);
  const [revision, setRevision] = useState(0);
  const flushers = useRef(new Map<number, () => Promise<void>>());
  async function flushDays() { await Promise.all([...flushers.current.values()].map(flush => flush())); }
  function registerFlush(workoutId: number, flush: (() => Promise<void>) | null) { if (flush) flushers.current.set(workoutId, flush); else flushers.current.delete(workoutId); }
  function tuned(updated: Routine) { setReviewedKey(JSON.stringify(updated)); setData(rs => rs && rs.map(r => r.id === updated.id ? updated : r)); setRevision(v => v + 1); }

  const routine = routines?.find(r => r.id === Number(id));

  async function finishRoutine() {
    if (!routine) return;
    setFinishing(true); setError('');
    try {
      await flushDays();
      const latest = await api.get<Routine[]>('/api/routines');
      const saved = latest.find(r=>r.id===routine.id);
      if (!saved) throw new Error('No se encontró la rutina.');
      setData(latest); setReviewedKey(JSON.stringify(saved)); setOptimizing(false);
      setTimeout(()=>document.getElementById('routine-review')?.scrollIntoView({behavior:'smooth',block:'start'}),0);
    } catch(e) { setError(e instanceof Error ? e.message : 'No se pudo terminar.'); }
    finally { setFinishing(false); }
  }

  async function addWorkout(name: string) {
    if (!routine || !name.trim()) return;
    await api.post(`/api/routines/${routine.id}/workouts`, { name: name.trim(), day_index: routine.workouts.length, exercises: [] });
    edited(); setAdding(false);
    reload();
  }

  async function assign(workoutId: number, weekday: number | null) {
    if (!routine) return;
    setError('');
    edited();
    // Optimistic: move the card now, roll back if the server refuses.
    const previous = routines;
    setData(rs => rs && rs.map(r => r.id !== routine.id ? r : { ...r, workouts: r.workouts.map(w => w.id === workoutId ? { ...w, weekday } : w) }));
    try {
      const updated = await api.put<Routine>(`/api/routines/${routine.id}/schedule`, { assignments: [{ workout_id: workoutId, weekday }] });
      setData(rs => rs && rs.map(r => r.id === updated.id ? updated : r));
    } catch (err) {
      setData(previous);
      setError(err instanceof Error ? err.message : 'No se pudo mover el día.');
    }
  }

  async function renameRoutine() {
    setEditingName(false);
    if (!routine || !nameDraft.trim() || nameDraft.trim() === routine.name) return;
    await api.put(`/api/routines/${routine.id}`, { name: nameDraft.trim() });
    reload();
  }

  function focus(w: PlanWarning) {
    if (w.muscle) setHighlightMuscle(w.muscle);
    const target = w.workoutId ? document.getElementById(`day-${w.workoutId}`) : w.muscle ? document.querySelector('.ex-row.highlighted') : null;
    setTimeout(() => (target || (w.muscle ? document.querySelector('.ex-row.highlighted') : null))?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 50);
  }

  if (loading && !routines) return <span className="muted-note">Cargando…</span>;
  if (!routine) return <span className="error-text">No se encontró el programa.</span>;

  const reviewed = reviewedKey === JSON.stringify(routine);
  const allMuscles = [...new Set((allExercises || []).map(e => e.muscle))];
  const analysis = analysePlan(routine, allMuscles);
  const volumeByMuscle = new Map(analysis.rows.map(r => [r.muscle, r]));
  const items: BoardItem[] = routine.workouts.map(w => ({
    id: w.id,
    day: w.weekday,
    label: w.name,
    content: <><strong>{w.name}</strong><span>{plural(w.exercises.length, "ejercicio", "ejercicios")} · {plural(w.exercises.reduce((n, e) => n + (e.target_sets || 0), 0), "serie", "series")}</span></>,
  }));
  const ordered = [...routine.workouts].sort((a, b) => (a.weekday ?? 9) - (b.weekday ?? 9) || (a.day_index ?? 0) - (b.day_index ?? 0));

  return <>
    <div className="page-heading">
      <div>
        <Link to="/app/routines" className="back-link">← Entrenamientos</Link>
        {editingName
          ? <input className="title-input" value={nameDraft} autoFocus onChange={e => setNameDraft(e.target.value)} onKeyDown={e => e.key === 'Enter' && renameRoutine()} onBlur={renameRoutine} aria-label="Nombre del programa" />
          : <h1><button className="title-button" onClick={() => { setNameDraft(routine.name); setEditingName(true); }} title="Renombrar">{routine.name}</button></h1>}
        {!routine.is_active && <p className="helper-text">Este programa no está activo: su semana no aparece en Mi resumen.</p>}
      </div>
      <button className="btn-primary" disabled={finishing || tuningLocked} onClick={finishRoutine}>{finishing ? 'Guardando…' : 'Terminar rutina'}</button>
    </div>

    <section className="panel">
      <div className="section-heading">
        <div><h2>Semana fija</h2><p className="helper-text">Arrastra cada día a su día de la semana. Para mover un entreno solo una semana, hazlo desde Mi resumen.</p></div>
        <button className="btn-primary" onClick={() => setAdding(v => !v)} aria-expanded={adding}>{adding ? 'Cerrar' : '+ Agregar día'}</button>
      </div>
      {adding && <NewDayForm onAdd={addWorkout} onCancel={() => setAdding(false)} />}
      <WeekBoard items={items} trayLabel="Sin día" onMove={assign} />
      {error && <p className="error-text" role="alert">{error}</p>}
    </section>

    <fieldset disabled={tuningLocked} className="routine-edit-fields">
    {ordered.map(w => (
      <WorkoutCard onEdited={edited} registerFlush={registerFlush} key={`${w.id}-${revision}`} workout={w} exercisesLibrary={allExercises || []} volumeByMuscle={volumeByMuscle} highlightMuscle={highlightMuscle} onChanged={reload} onDeleted={reload} />
    ))}
    </fieldset>
    <section className="panel"><div className="section-heading"><div><h2>Termina de elegir tus ejercicios</h2><p className="helper-text">Los cambios se guardan mientras editas. Al terminar revisaremos frecuencia, volumen y posibles repeticiones.</p></div><button className="btn-primary" disabled={finishing || tuningLocked} onClick={finishRoutine}>{finishing ? 'Guardando…' : 'Guardar y revisar rutina'}</button></div>{error && <p role="alert" className="error-text">{error}</p>}</section>
    {reviewed && <div id="routine-review">
      <RoutineReview key={reviewedKey} warnings={analysis.warnings} onCorrect={w => { setOptimizing(false); setTuningLocked(false); focus(w); }} onOptimize={()=>{ setOptimizing(true); setTimeout(()=>document.getElementById('tuning-title')?.scrollIntoView({behavior:'smooth',block:'start'}),0); }} />
      <MuscleSummary rows={analysis.rows} selected={highlightMuscle} onSelect={setHighlightMuscle} />
      {optimizing && <RoutineFineTuning key={routine.id} routine={routine} flush={flushDays} onApplied={tuned} onLock={setTuningLocked} />}
    </div>}
  </>;
}
