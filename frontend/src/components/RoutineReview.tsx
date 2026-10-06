import { useState } from 'react';
import { KIND_LABEL, type PlanWarning } from '../utils/planAnalysis';

export default function RoutineReview({ warnings, onCorrect, onOptimize }: { warnings: PlanWarning[]; onCorrect: (w: PlanWarning) => void; onOptimize: () => void }) {
  const [accepted, setAccepted] = useState<string[]>([]);
  const [done, setDone] = useState(false);
  return <section className="panel fine-tuning" aria-label="Revisión de la rutina">
    <h2>Rutina guardada · revisa tu plan</h2>
    <p>Estos avisos son referencias, no prohibiciones. Puedes corregirlos o aceptar los que encajan con tu decisión. La frecuencia y el volumen por músculo están en el resumen.</p>
    {!warnings.length && <p>Sin avisos con estas referencias.</p>}
    {warnings.map(w => <div className="tuning-day" key={w.key}><span className="label">{KIND_LABEL[w.kind]}</span><h3>{w.title}</h3><p>{w.detail}</p><div className="routine-actions"><button className="btn-ghost" onClick={() => onCorrect(w)}>Revisar este punto</button><label><input type="checkbox" checked={accepted.includes(w.key)} onChange={e => { setDone(false); setAccepted(keys => e.target.checked ? [...keys, w.key] : keys.filter(k=>k!==w.key)); }} /> Acepto este aviso</label></div></div>)}
    <div className="routine-actions"><button className="btn-ghost" disabled={accepted.length !== warnings.length} onClick={() => setDone(true)}>Conservar mi rutina</button><button className="btn-primary" onClick={onOptimize}>Optimizar mi rutina</button></div>
    {done && <p role="status">Rutina lista. Conservamos tus decisiones{accepted.length ? ` y ${accepted.length} avisos aceptados en esta revisión` : ''}. Puedes optimizarla cuando quieras.</p>}
  </section>;
}
