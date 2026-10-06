import { Link } from 'react-router-dom';
import { useState } from 'react';
import { api } from '../api';
import type { WeekPlan } from '../types';
import { displayDate, localDate, shiftDate } from '../utils/journal';
import { daysBetween } from '../utils/body';
import { plural } from '../data/labels';
import WeekBoard, { type BoardItem } from './WeekBoard';

// This week's version of the plan. Dragging a card moves that workout for this week
// only; the usual weekday (set in Entrenamientos) stays the same for next week.
export default function ThisWeek({ plan, onChange }: { plan: WeekPlan; onChange: (plan: WeekPlan) => void }) {
  const [error, setError] = useState('');
  const today = localDate();
  const start = plan.week_start;

  async function move(workoutId: number, day: number | null) {
    if (day == null) return;
    setError('');
    try {
      onChange(await api.put<WeekPlan>('/api/schedule/move', { workout_id: workoutId, week_start: start, date: shiftDate(start, day) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : 'No se pudo mover.');
    }
  }

  async function reset(workoutId: number) {
    try { onChange(await api.put<WeekPlan>('/api/schedule/move', { workout_id: workoutId, week_start: start, date: null })); } catch { setError('No se pudo restablecer.'); }
  }

  if (!plan.routine) {
    return <section className="panel"><h2>Esta semana</h2><p className="helper-text">No tienes un programa activo. <Link to="/app/routines">Elige o crea uno</Link> y asigna sus días a la semana.</p></section>;
  }

  const items: BoardItem[] = plan.items.map(item => {
    const missed = !item.done && !item.in_progress && item.date < today;
    const tone = item.done ? 'done' : missed ? 'missed' : item.moved ? 'moved' : 'default';
    const status = item.done ? `Hecho${item.done_date && item.done_date !== item.date ? ` el ${displayDate(item.done_date)}` : ''}` : item.in_progress ? 'En curso' : missed ? 'No se hizo · muévelo' : item.date === today ? 'Te toca hoy' : plural(item.exercise_count, "ejercicio", "ejercicios");
    return {
      id: item.workout_id,
      day: daysBetween(start, item.date),
      label: item.name,
      tone,
      locked: item.done,
      content: <>
        <strong>{item.name}</strong>
        <span>{status}</span>
        {item.moved && item.usual_date && <button className="link-button" onClick={() => reset(item.workout_id)}>Volver al {displayDate(item.usual_date)}</button>}
        {!item.done && item.date >= today && <Link className="board-go" to={`/app/session/${item.workout_id}`}>{item.in_progress ? 'Continuar' : 'Entrenar'}</Link>}
        {missed && <Link className="board-go" to={`/app/session/${item.workout_id}`}>Entrenar hoy</Link>}
      </>,
    };
  });

  const done = plan.items.filter(i => i.done).length;
  const pendingPast = plan.items.filter(i => !i.done && !i.in_progress && i.date < today);
  const days = Array.from({ length: 7 }, (_, d) => { const date = shiftDate(start, d); return { title: displayDate(date), today: date === today, past: date < today }; });

  return (
    <section className="panel">
      <div className="section-heading">
        <div><h2>Esta semana · {plan.routine.name}</h2><p className="helper-text">{plan.items.length ? `${done} de ${plan.items.length} entrenos hechos. ¿No puedes un día? Arrástralo a otro; solo cambia esta semana.` : 'Asigna los días de tu programa a la semana para verlos aquí.'}</p></div>
        <Link to={`/app/routines/${plan.routine.id}`}>Editar semana fija</Link>
      </div>
      {pendingPast.length > 0 && <p className="checkin-nudge">{pendingPast.map(i => i.name).join(', ')} {pendingPast.length === 1 ? 'quedó' : 'quedaron'} sin hacer. Arrástralo a un día que viene o entrénalo hoy.</p>}
      {!plan.items.length && <p className="helper-text">Tu programa no tiene días asignados a la semana. <Link to={`/app/routines/${plan.routine.id}`}>Asígnalos aquí</Link>.</p>}
      <WeekBoard items={items} days={days} onMove={move} emptyText={plan.unscheduled.length && !plan.items.length ? 'Sin asignar' : 'Descanso'} />
      {plan.unscheduled.length > 0 && <p className="helper-text">Sin día fijo: {plan.unscheduled.map(u => u.name).join(', ')}.</p>}
      {error && <p className="error-text" role="alert">{error}</p>}
    </section>
  );
}
