import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Routine, WeekPlan } from '../types';
import TemplatePicker from '../components/TemplatePicker';
import ThisWeek from '../components/ThisWeek';
export default function Routines() {
  const { data, loading, error, reload } = useApi(() => api.get<Routine[]>('/api/routines'));
  const { data: week, setData: setWeek, error: weekError, reload: reloadWeek } = useApi(() => api.get<WeekPlan>('/api/schedule/week'));
  const [name, setName] = useState('');
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  async function mutate(action: () => Promise<unknown>) {
    setBusy(true); setMessage('');
    try { await action(); setName(''); reload(); reloadWeek(); } catch (err) { setMessage(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.'); } finally { setBusy(false); }
  }
  function remove(routine: Routine) {
    if (window.confirm(`Eliminar «${routine.name}» también borra sus días y sesiones. Haz una copia antes de eliminar. ¿Continuar?`)) mutate(() => api.delete(`/api/routines/${routine.id}`));
  }
  const sorted = [...(data || [])].sort((a, b) => Number(b.is_active) - Number(a.is_active));
  return <>
    <div className="page-heading"><div><h1>Mi entrenamiento</h1><p>Tu programa, tus días y cada serie que cuenta.</p></div><Link className="btn-ghost" to="/app/history">Ver historial</Link></div>
    {week && <ThisWeek plan={week} onChange={setWeek} />}
    {weekError && <p role="alert" className="error-text">No se pudo cargar la semana. <button onClick={reloadWeek}>Reintentar</button></p>}
    {loading && <p role="status">Cargando programas…</p>}{error && <div className="error-banner" role="alert">{error} <button onClick={reload}>Reintentar</button></div>}{message && <p role="alert" className="error-text">{message}</p>}
    {sorted.map(r => <section className="panel routine-panel" key={r.id}><div className="section-heading"><div><h2>{r.name}</h2><p className="helper-text">{r.workouts.length} días de entrenamiento {r.is_active && '· Tu programa activo'}</p></div><div className="routine-actions"><Link className="btn-ghost" to={`/app/routines/${r.id}`}>Editar programa</Link>{!r.is_active && <button className="btn-ghost" disabled={busy} onClick={() => mutate(() => api.patch(`/api/routines/${r.id}/activate`))}>Usar programa</button>}<button className="quiet-button" disabled={busy} onClick={() => remove(r)}>Eliminar</button></div></div><div className="program-days">{r.workouts.map((w, i) => <div key={w.id}><span className="day-index">Día {i + 1}</span><h3>{w.name}</h3><p>{w.exercises.length} ejercicios · {w.exercises.reduce((n, e) => n + (e.target_sets || 0), 0)} series</p><Link className="btn-primary" to={`/app/session/${w.id}`}>Entrenar</Link></div>)}</div>{!r.workouts.length && <p className="helper-text">Este programa todavía no tiene días. <Link to={`/app/routines/${r.id}`}>Añade el primero.</Link></p>}</section>)}
    {!loading && !data?.length && <div className="panel"><h2>Elige tu punto de partida</h2><p className="helper-text">Crea tu programa o abre las plantillas de abajo para empezar.</p></div>}
    <form className="create-routine" onSubmit={e => { e.preventDefault(); if (name.trim()) mutate(() => api.post('/api/routines', { name: name.trim() })); }}><label className="field"><span>Crear un programa propio</span><input value={name} placeholder="Por ejemplo: Upper / Lower" onChange={e => setName(e.target.value)} maxLength={200} required /></label><button className="btn-primary" disabled={busy || !name.trim()}>Crear programa</button></form>
    <details className="template-details"><summary>Empezar desde una plantilla</summary><TemplatePicker onCreated={reload} /></details>
  </>;
}
