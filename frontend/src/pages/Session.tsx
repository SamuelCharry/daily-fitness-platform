import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { LastSet, LastSetsByExercise, Routine, SetLog, WorkoutExerciseEntry, WorkoutSession } from '../types';

type Draft = { weight: string; reps: string; rir: string };
function fromSet(set?: LastSet): Draft { return { weight: String(set?.weight ?? ''), reps: String(set?.reps ?? ''), rir: String(set?.rir ?? '') }; }

// SQLite drops the timezone, so a bare "2026-10-04T18:30:00" from the API is UTC.
function parseServerTime(value: string | null): number | null {
  if (!value) return null;
  return Date.parse(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : `${value}Z`);
}

function clock(ms: number): string {
  const total = Math.max(0, Math.floor(ms / 1000));
  const h = Math.floor(total / 3600), m = Math.floor((total % 3600) / 60), sec = total % 60;
  return `${h ? `${h}:${String(m).padStart(2, '0')}` : m}:${String(sec).padStart(2, '0')}`;
}

// Two clocks: time since the session started, and rest since the last saved set,
// counting up so you also see when you rested longer than planned. Both are
// timestamps (not counters), so they survive reloads and a locked phone.
function SessionClock({ startedAt, rest, onClearRest }: { startedAt: number; rest: { since: number; target: number | null } | null; onClearRest: () => void }) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => { const timer = setInterval(() => setNow(Date.now()), 500); return () => clearInterval(timer); }, []);
  const resting = rest ? now - rest.since : null;
  const done = rest?.target != null && resting != null && resting >= rest.target * 1000;
  useEffect(() => { if (done) navigator.vibrate?.([200, 100, 200]); }, [done]);
  return <div className="session-clock" role="timer" aria-live="off">
    <div><span>Entrenando</span><strong>{clock(now - startedAt)}</strong></div>
    <div className={`rest${done ? ' done' : ''}`}>
      <span>{rest ? (done ? 'Descanso cumplido' : 'Descanso') : 'Descanso'}{rest?.target ? ` · objetivo ${clock(rest.target * 1000)}` : ''}</span>
      <strong>{resting != null ? clock(resting) : '—'}</strong>
    </div>
    {rest && <button onClick={onClearRest}>{done ? 'Listo' : 'Ocultar'}</button>}
  </div>;
}
function ExerciseTable({ exercise, sets, last, busy, onSave, storageKey }: { exercise: WorkoutExerciseEntry; sets: SetLog[]; last: LastSet[]; busy: boolean; storageKey: string; onSave: (n: number, draft: Draft) => Promise<boolean> }) {
  const [drafts, setDrafts] = useState<Record<number, Draft>>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  });
  useEffect(() => { sessionStorage.setItem(storageKey, JSON.stringify(drafts)); }, [drafts, storageKey]);
  const [editing, setEditing] = useState<number | null>(null);
  const [extra, setExtra] = useState(0);
  const total = Math.max((exercise.target_sets || 1) + extra, ...sets.map(s => s.set_number), ...Object.keys(drafts).map(Number), 0);
  const completed = sets.length;
  const draftFor = (n: number) => drafts[n] || fromSet(sets.find(s => s.set_number === n));
  function edit(n: number, key: keyof Draft, value: string) { setDrafts(old => ({ ...old, [n]: { ...draftFor(n), [key]: value } })); }
  async function save(n: number) { if (await onSave(n, draftFor(n))) { setEditing(null); setDrafts(old => { const next = { ...old }; delete next[n]; return next; }); } }
  return <section className="exercise-panel"><div className="exercise-heading"><div><h2>{exercise.name}</h2><p>{exercise.muscle.replaceAll('_', ' ')} · {exercise.equipment || 'Libre'}</p></div><span className="phase-tag">{completed} / {total} series</span></div>
    <div className="exercise-targets"><span>Objetivo <strong>{exercise.rep_range_min ?? '—'}–{exercise.rep_range_max ?? '—'} reps</strong></span><span>Intensidad <strong>{exercise.rir_target ?? '—'} RIR</strong></span><span>Descanso <strong>{exercise.rest_seconds ? `${exercise.rest_seconds} s` : 'Libre'}</strong></span></div>
    {exercise.comments && <p className="exercise-notes">{exercise.comments}</p>}
    <div className="table-scroll"><table className="sets-table"><thead><tr><th>Serie</th><th>Anterior</th><th>kg</th><th>Reps</th><th>RIR</th><th><span className="sr-only">Guardar serie</span></th></tr></thead><tbody>{Array.from({ length: total }, (_, i) => i + 1).map(n => {
      const logged = sets.find(s => s.set_number === n), previous = last.find(s => s.set_number === n), draft = draftFor(n), editable = !logged || editing === n;
      return <tr key={n} className={logged ? 'set-completed' : ''}><th scope="row">{n}</th><td>{previous ? <button className="previous-set" title="Usar los valores anteriores" disabled={busy || !editable} onClick={() => setDrafts(old => ({ ...old, [n]: fromSet(previous) }))}>{previous.weight ?? '—'} × {previous.reps ?? '—'}<small>{previous.rir != null ? `${previous.rir} RIR` : 'Sin RIR'}</small></button> : <span className="helper-text">—</span>}</td>{(['weight', 'reps', 'rir'] as const).map(key => <td key={key}>{editable ? <input aria-label={`${key === 'weight' ? 'Peso' : key === 'reps' ? 'Repeticiones' : 'RIR'} de la serie ${n}`} type="number" min={key === 'reps' ? 1 : 0} max={key === 'rir' ? 10 : key === 'weight' ? 2000 : 1000} step={key === 'weight' ? '0.5' : '1'} inputMode={key === 'weight' ? 'decimal' : 'numeric'} placeholder={key === 'rir' ? String(exercise.rir_target ?? '—') : '—'} value={draft[key]} disabled={busy} onChange={e => edit(n, key, e.target.value)} /> : <span>{logged[key] ?? '—'}</span>}</td>)}<td>{editable ? <button className="set-save" aria-label={`Guardar serie ${n}`} disabled={busy || !draft.reps} onClick={() => save(n)}><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true"><path d="m5 12 4 4L19 6" /></svg></button> : <button className="edit-set" disabled={busy} onClick={() => setEditing(n)}>Editar</button>}</td></tr>;
    })}</tbody></table></div>
    <div className="exercise-footer"><button className="quiet-button" disabled={busy} onClick={() => setExtra(total + 1 - (exercise.target_sets || 1))}>Añadir serie</button><span className="helper-text">RIR = repeticiones que quedaban. Toca «Anterior» para reutilizar los datos.</span></div>
    <Link className="exercise-progress-link" to={`/app/exercises/${exercise.exercise_id}/progress`}>Ver progreso del ejercicio</Link>
  </section>;
}
export default function Session() {
  const { workoutId } = useParams();
  const navigate = useNavigate();
  const { data, error, loading, reload } = useApi(async () => {
    const [routines, last, session] = await Promise.all([api.get<Routine[]>('/api/routines'), api.get<LastSetsByExercise>(`/api/sessions/last-sets/${workoutId}`), api.post<WorkoutSession>('/api/sessions', { workout_id: Number(workoutId) })]);
    return { workout: routines.flatMap(r => r.workouts).find(w => w.id === Number(workoutId)), last, session };
  }, [workoutId]);
  const [session, setSession] = useState<WorkoutSession | null>(null);
  const [index, setIndex] = useState(0);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [rest, setRest] = useState<{ since: number; target: number | null } | null>(null);
  const [openedAt] = useState(() => Date.now());
  useEffect(() => { if (data) setSession(data.session); }, [data]);
  const restKey = session ? `cfts-rest-${session.id}` : null;
  useEffect(() => {
    if (!restKey) return;
    try { const saved = localStorage.getItem(restKey); if (saved) setRest(JSON.parse(saved)); } catch { /* ignore */ }
  }, [restKey]);
  function startRest(value: { since: number; target: number | null } | null) {
    setRest(value);
    try { if (restKey) { if (value) localStorage.setItem(restKey, JSON.stringify(value)); else localStorage.removeItem(restKey); } } catch { /* ignore */ }
  }
  const workout = data?.workout;
  async function log(exercise: WorkoutExerciseEntry, n: number, draft: Draft) {
    if (!session || busy) return false;
    const reps = Number(draft.reps), weight = draft.weight === '' ? null : Number(draft.weight), rir = draft.rir === '' ? null : Number(draft.rir);
    if (!Number.isInteger(reps) || reps < 1 || reps > 1000 || (weight != null && (!Number.isFinite(weight) || weight < 0 || weight > 2000)) || (rir != null && (!Number.isInteger(rir) || rir < 0 || rir > 10))) { setMessage('Revisa la serie: repeticiones enteras, peso positivo o cero y RIR entre 0 y 10.'); return false; }
    setBusy(true); setMessage('');
    try {
      const updated = await api.post<WorkoutSession>(`/api/sessions/${session.id}/sets`, { workout_exercise_id: exercise.id, set_number: n, weight, reps, rir });
      setSession(updated);
      startRest({ since: Date.now(), target: exercise.rest_seconds });
      return true;
    } catch (err) { setMessage(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.'); return false; }
    finally { setBusy(false); }
  }
  async function finish() {
    if (!session || busy) return;
    if (!session.sets.length) { setMessage('Registra al menos una serie antes de finalizar.'); return; }
    const planned = workout?.exercises.reduce((sum, e) => sum + (e.target_sets || 1), 0) || 0;
    if (session.sets.length < planned && !window.confirm('Quedan series del plan sin registrar. ¿Finalizar con las series guardadas?')) return;
    setBusy(true);
    try { await api.post(`/api/sessions/${session.id}/finish`); startRest(null); navigate('/app/history', { replace: true }); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'No se pudo finalizar. Intenta de nuevo.'); }
    finally { setBusy(false); }
  }
  if (loading) return <p role="status">Preparando tu entrenamiento…</p>;
  if (error) return <div className="error-banner" role="alert">No se pudo abrir el entrenamiento. {error} <button onClick={reload}>Reintentar</button><Link to="/app">Volver</Link></div>;
  if (!session || !workout) return <p>No se encontró el entrenamiento. <Link to="/app/routines">Ver mis rutinas</Link></p>;
  const exercise = workout.exercises[index];
  return <>
    <div className="session-top"><Link to="/app">Volver al resumen</Link><span>{session.sets.length} series guardadas</span></div>
    <div className="page-heading"><div><h1>{session.workout_name}</h1><p>{workout.exercises.length} ejercicios · Tus series se guardan al confirmarlas.</p></div><button className="btn-primary" disabled={busy} onClick={finish}>{busy ? 'Guardando…' : 'Finalizar'}</button></div>
    <SessionClock startedAt={parseServerTime(session.started_at) ?? openedAt} rest={rest} onClearRest={() => startRest(null)} />
    <nav className="exercise-tabs" aria-label="Ejercicios de la sesión">{workout.exercises.map((e, i) => <button key={e.id} aria-pressed={index === i} className={index === i ? 'active' : ''} onClick={() => setIndex(i)}><span>{i + 1}</span>{e.name}</button>)}</nav>
    {message && <div className="error-banner" role="alert">{message}</div>}
    {exercise ? <ExerciseTable key={exercise.id} storageKey={`cfts-session-${session.id}-${exercise.id}`} exercise={exercise} sets={session.sets.filter(s => s.workout_exercise_id === exercise.id)} last={data?.last[exercise.id] || []} busy={busy} onSave={(n, draft) => log(exercise, n, draft)} /> : <p>Este día no tiene ejercicios. <Link to="/app/routines">Añadir ejercicios a la rutina</Link></p>}
    <div className="session-navigation"><button className="btn-ghost" disabled={index === 0} onClick={() => setIndex(index - 1)}>Anterior</button><span>{exercise ? index + 1 : 0} / {workout.exercises.length} ejercicios</span><button className="btn-ghost" disabled={index >= workout.exercises.length - 1} onClick={() => setIndex(index + 1)}>Siguiente ejercicio</button></div>
    <p className="helper-text">Puedes salir y volver: la sesión pendiente de hoy se retoma con sus series guardadas.</p>
  </>;
}
