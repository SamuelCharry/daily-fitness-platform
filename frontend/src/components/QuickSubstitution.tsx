import { useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Exercise, WorkoutExerciseEntry } from '../types';
import { volumeMuscle } from '../utils/volumeGuideline';

export default function QuickSubstitution({ original, current, used, busy, onPick, onClose }: {
  original: WorkoutExerciseEntry; current: WorkoutExerciseEntry; used: number[]; busy: boolean;
  onPick: (id: number) => void; onClose: () => void;
}) {
  const { data, loading, error, reload } = useApi(()=>api.get<Exercise[]>('/api/exercises'));
  const [query, setQuery] = useState('');
  const options = (data || []).filter(e => e.id !== current.exercise_id && !used.includes(e.id) && volumeMuscle(e.muscle) === volumeMuscle(original.muscle) && e.name.toLowerCase().includes(query.toLowerCase()))
    .sort((a,b)=>Number(b.joint_action===original.joint_action)-Number(a.joint_action===original.joint_action) || Number(a.equipment===current.equipment)-Number(b.equipment===current.equipment) || a.name.localeCompare(b.name));
  return <section className="panel fine-tuning" aria-label="Sustitución rápida"><div className="section-heading"><div><h2>¿Máquina ocupada?</h2><p>Elige una alternativa para hoy. Tu rutina habitual sigue igual; las series guardadas conservan su ejercicio.</p></div><button className="btn-ghost" disabled={busy} onClick={onClose}>Cerrar</button></div>
    <label>Buscar alternativa<input type="search" value={query} onChange={e=>setQuery(e.target.value)} /></label>
    {loading && <p role="status">Buscando alternativas…</p>}{error && <p role="alert">{error} <button onClick={reload}>Reintentar</button></p>}
    {current.exercise_id !== original.exercise_id && <button className="btn-ghost" disabled={busy} onClick={()=>onPick(original.exercise_id)}>Volver a {original.name}</button>}
    <p className="helper-text">Primero mostramos opciones con el mismo patrón general y otro equipo. Compartir músculo no garantiza el mismo estímulo; ajusta el peso al cambiar.</p>
    <div className="swap-list">{options.map(e=><button className="swap-option" key={e.id} disabled={busy} onClick={()=>onPick(e.id)}><strong>{e.name}</strong><span>{e.equipment || 'Libre'} · {e.joint_action === original.joint_action ? 'Mismo patrón general' : 'Cambia el patrón: revisa la ejecución'}</span></button>)}</div>
    {!loading && !error && !options.length && <p>No hay alternativas con ese nombre para este músculo.</p>}
  </section>;
}
