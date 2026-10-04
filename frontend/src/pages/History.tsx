import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Routine, WorkoutSession } from '../types';
import { displayDate, downloadCSV } from '../utils/journal';
export default function History() {
  const { data, error, loading, reload } = useApi(async () => ({ sessions: await api.get<WorkoutSession[]>('/api/sessions?days=36500'), routines: await api.get<Routine[]>('/api/routines') }));
  const [selected, setSelected] = useState<number | null>(null);
  const lookup = new Map(data?.routines.flatMap(r => r.workouts.flatMap(w => w.exercises.map(e => [e.id, e] as const))) || []);
  function exportCSV() {
    downloadCSV('cool-for-the-summer-entrenamientos.csv', [['Fecha', 'Sesión', 'Estado', 'Ejercicio', 'Serie', 'kg', 'Reps', 'RIR'], ...(data?.sessions || []).flatMap(s => s.sets.map(set => [s.date, s.workout_name, s.finished_at ? 'Finalizada' : 'Pendiente', lookup.get(set.workout_exercise_id)?.name || set.workout_exercise_id, set.set_number, set.weight, set.reps, set.rir]))]);
  }
  const detail = data?.sessions.find(s => s.id === selected);
  return <>
    <div className="page-heading"><div><h1>Cada sesión cuenta.</h1><p>Tu historial de entrenamiento, serie por serie.</p></div><button className="btn-ghost" disabled={!data?.sessions.length} onClick={exportCSV}>Exportar series CSV</button></div>
    {loading && <p role="status">Cargando entrenamientos…</p>}{error && <div className="error-banner" role="alert">{error} <button onClick={reload}>Reintentar</button></div>}
    <section className="panel"><div className="section-heading"><h2>Mis sesiones</h2><span className="helper-text">{data?.sessions.filter(s => s.finished_at).length || 0} completadas</span></div><div className="table-scroll"><table className="read-table"><thead><tr><th>Fecha</th><th>Entrenamiento</th><th>Series</th><th>Estado</th><th>Detalle</th></tr></thead><tbody>{data?.sessions.map(s => <tr key={s.id}><td>{displayDate(s.date)}</td><th>{s.workout_name}</th><td>{s.sets.length}</td><td>{s.finished_at ? 'Completado' : 'Pendiente'}</td><td><button className="quiet-button" onClick={() => setSelected(selected === s.id ? null : s.id)} aria-expanded={selected === s.id}>Ver series</button>{!s.finished_at && <Link to={`/app/session/${s.workout_id}`}>Entrenar</Link>}</td></tr>)}</tbody></table></div>{!loading && !data?.sessions.length && <p className="table-empty">Todavía no hay sesiones. <Link to="/app/routines">Abre tu programa y empieza.</Link></p>}</section>
    {detail && <section className="panel"><div className="section-heading"><h2>{detail.workout_name} · {displayDate(detail.date)}</h2><button className="quiet-button" onClick={() => setSelected(null)}>Cerrar detalle</button></div><div className="table-scroll"><table className="read-table"><thead><tr><th>Ejercicio</th><th>Serie</th><th>kg</th><th>Reps</th><th>RIR</th></tr></thead><tbody>{detail.sets.map(set => <tr key={set.id}><th>{lookup.get(set.workout_exercise_id)?.name || 'Ejercicio'}</th><td>{set.set_number}</td><td>{set.weight ?? '—'}</td><td>{set.reps ?? '—'}</td><td>{set.rir ?? '—'}</td></tr>)}</tbody></table></div>{!detail.sets.length && <p className="helper-text">Esta sesión no tiene series registradas.</p>}</section>}
  </>;
}
