import { useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Routine } from '../types';
import { fineTune, LOWER_MUSCLES, type Priority, type TuningPreview } from '../utils/fineTuning';
import { computeMuscleVolumeRows, volumeMuscleName } from '../utils/volumeGuideline';

export default function RoutineFineTuning({ routine, flush, onApplied, onLock }: {
  routine: Routine; flush: () => Promise<void>; onApplied: (r: Routine) => void; onLock: (lock: boolean) => void;
}) {
  const [minutes, setMinutes] = useState(60);
  const [restMinutes, setRest] = useState(3);
  const [executionMinutes, setExecution] = useState(1);
  const [upper, setUpper] = useState('');
  const [lower, setLower] = useState('');
  const [medium, setMedium] = useState<string[]>([]);
  const [preview, setPreview] = useState<{ result: TuningPreview; expected: Routine } | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const { data: undo, reload: reloadUndo } = useApi(() => api.get<{ can_undo: boolean }>(`/api/routines/${routine.id}/tuning`), [routine]);
  const muscles = computeMuscleVolumeRows(routine, []).filter(r => r.frequency > 0);
  const priorityNames: Record<Priority, string> = { high: 'Prioridad', medium: 'Medio', sufficient: 'Suficiente' };

  function discard() { setPreview(null); onLock(false); }
  async function calculate() {
    setBusy(true); onLock(true); setError(''); setMessage('');
    try {
      await flush();
      const latest = (await api.get<Routine[]>('/api/routines')).find(r => r.id === routine.id);
      if (!latest) throw new Error('No se encontró la rutina.');
      const priorities: Record<string, Priority> = Object.fromEntries(medium.map(m => [m, 'medium']));
      if (upper) priorities[upper] = 'high';
      if (lower) priorities[lower] = 'high';
      const result = fineTune(latest, { minutes, restMinutes, executionMinutes, priorities });
      setPreview({ result, expected: latest });
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo calcular.'); onLock(false); }
    finally { setBusy(false); }
  }
  async function save(reverse = false) {
    setBusy(true); onLock(true); setError(''); setMessage('');
    try {
      await flush();
      const updated = reverse
        ? await api.post<Routine>(`/api/routines/${routine.id}/tuning/undo`)
        : await api.post<Routine>(`/api/routines/${routine.id}/tuning`, { expected: preview!.expected, changes: preview!.result.changes, orders: preview!.result.orders.map(({workout_id, slot_ids}) => ({workout_id, slot_ids})) });
      onApplied(updated); setPreview(null); reloadUndo();
      setMessage(reverse ? 'Restauramos el orden, las series y los descansos anteriores.' : 'Ajuste guardado. Puedes deshacerlo aquí, incluso después de recargar, mientras no edites la rutina.');
    } catch (e) { setError(e instanceof Error ? e.message : 'No se pudo guardar.'); }
    finally { setBusy(false); onLock(false); }
  }
  const pick = (label: string, value: string, set: (s: string) => void, lowerBody: boolean) => <label>{label}<select value={value} onChange={e => set(e.target.value)}><option value="">Sin prioridad alta</option>{muscles.filter(r => LOWER_MUSCLES.has(r.muscle) === lowerBody).map(r => <option key={r.muscle} value={r.muscle}>{volumeMuscleName(r.muscle)} · F{r.frequency}</option>)}</select></label>;

  return <section className="panel fine-tuning" aria-labelledby="tuning-title" aria-busy={busy}>
    <div className="section-heading"><div><span className="label">A tu medida</span><h2 id="tuning-title">Ajuste fino</h2><p className="helper-text">Elige qué músculos priorizar y cuánto tiempo tienes. Primero verás una propuesta.</p></div>{undo?.can_undo && <button className="btn-ghost" disabled={busy} onClick={() => save(true)}>Deshacer último ajuste</button>}</div>
    <fieldset disabled={busy || !!preview} className="tuning-controls">
      <div className="tuning-grid">
        <label>Tiempo por día · min<input type="number" min="1" max="300" value={minutes} onChange={e => setMinutes(Number(e.target.value))} /></label>
        <label>Descanso por serie · min<select value={restMinutes} onChange={e => setRest(Number(e.target.value))}><option value={2.5}>2,5 min</option><option value={3}>3 min</option></select></label>
        <label>Duración de una serie · min<input type="number" min="0.25" max="10" step="0.25" value={executionMinutes} onChange={e => setExecution(Number(e.target.value))} /></label>
        {pick('Prioridad upper · un músculo', upper, setUpper, false)}
        {pick('Prioridad lower · un músculo', lower, setLower, true)}
      </div>
      <p><strong>Prioridad media</strong><span className="helper-text"> Los demás quedan en suficiente. Las regiones del pecho se suman.</span></p>
      <div className="tuning-muscles">{muscles.filter(r => r.muscle !== upper && r.muscle !== lower).map(r => <label key={r.muscle}><input type="checkbox" checked={medium.includes(r.muscle)} onChange={e => setMedium(ms => e.target.checked ? [...ms, r.muscle] : ms.filter(m => m !== r.muscle))} />{volumeMuscleName(r.muscle)} <span className="helper-text">F{r.frequency}</span></label>)}</div>
    </fieldset>
    <details><summary>Cómo se reparten las series y el tiempo</summary><p>Series directas totales por músculo y día: F2 → suficiente 2 (o 3 si tienes tres ejercicios), medio 4, prioridad 6. F3+ → 1, 2 y 3. F1 → 6, 8 y 10: estos últimos son objetivos del ajuste; la referencia es 6+ sin techo fijo.</p><p>Conservamos al menos una serie por ejercicio activo. Primero van los ejercicios de prioridad alta, luego los de prioridad media y finalmente los demás. Dentro de cada nivel conservamos tu orden. No añadimos músculos ni alteramos tu frecuencia. Los días sin asignar quedan fuera si ya usas el calendario.</p><p>Estimación conservadora: series × (descanso + ejecución), incluyendo un descanso por serie. Con 3 + 1 min, 20 series son 80 min y 40 son 160 min. Calentamiento, cambios de máquina y desplazamientos requieren tiempo adicional.</p><p>El rango de referencia es un punto de partida para series a 0–1 RIR. Tu RIR se conserva: ajusta según tu esfuerzo, progreso y recuperación.</p></details>
    {busy && <p role="status"><span className="tuning-spinner" /> Preparando tu ajuste…</p>}
    {!preview && <button className="btn-primary" disabled={busy || !muscles.length || minutes < 1 || minutes > 300 || executionMinutes < 0.25 || executionMinutes > 10} onClick={calculate}>Ver propuesta</button>}
    {preview && <div className="tuning-preview">
      <h3>Tu propuesta · todavía no está guardada</h3>
      {preview.result.days.map((day, i) => <div key={i} className="tuning-day"><h3>{day.label}</h3><p><strong>{day.before} → {day.sets} series · {day.minutes} / {minutes} min</strong></p>{day.problems.map(p => <p key={p} className="error-text">{p}</p>)}{day.desiredMinutes > day.minutes && <p className="helper-text">Todas las prioridades pedirían {day.desiredMinutes} min. Bajamos {day.groups.filter(g=>g.sets<g.desired).map(g=>volumeMuscleName(g.muscle)).join(', ')} para conservar el mínimo y caber en tu tiempo.</p>}<div className="tuning-table-wrap"><table><thead><tr><th>Músculo</th><th>Frecuencia</th><th>Nivel</th><th>Objetivo → propuesta</th></tr></thead><tbody>{day.groups.map(g => <tr key={g.muscle}><td>{volumeMuscleName(g.muscle)}</td><td>F{g.frequency}</td><td>{priorityNames[g.priority]}</td><td>{g.desired} → {g.sets} series</td></tr>)}</tbody></table></div></div>)}
      <h3>Orden propuesto</h3><p className="helper-text">Tus prioridades van primero. También puedes volver a editar y ordenar manualmente.</p>
      {preview.result.orders.map(order => <details key={order.workout_id}><summary>{order.name} · ver orden</summary><ol>{order.names.map((name,i) => <li key={order.slot_ids[i]}>{name}</li>)}</ol></details>)}
      {!preview.result.feasible && <p role="status">No aplicaremos una propuesta que no cabe o supera el baseline por tener demasiados ejercicios. Vuelve a editar los tiempos o la distribución.</p>}
      <div className="routine-actions"><button className="btn-primary" disabled={busy || !preview.result.feasible} onClick={() => save()}>Aplicar propuesta</button><button className="btn-ghost" disabled={busy} onClick={discard}>Volver a editar</button></div>
    </div>}
    {message && <p role="status">{message}</p>}{error && <p role="alert" className="error-text">{error}</p>}
  </section>;
}
