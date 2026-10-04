import { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { BodyStat, Profile, Routine, WorkoutSession } from '../types';
import { displayDate, localDate, mean, shiftDate } from '../utils/journal';

export function WeightChart({ stats }: { stats: BodyStat[] }) {
  const points = stats.filter(s => s.weight != null).sort((a, b) => a.date.localeCompare(b.date));
  const chartRef = useRef<SVGSVGElement>(null);
  const [width, setWidth] = useState(660);
  useEffect(() => {
    if (!chartRef.current) return;
    const observer = new ResizeObserver(entries => setWidth(Math.max(200, entries[0].contentRect.width)));
    observer.observe(chartRef.current);
    return () => observer.disconnect();
  }, [points.length]);
  if (points.length < 2) return <div className="chart-empty"><p>{points.length ? 'Un registro, un punto de partida.' : 'Sin pesos en este periodo.'}</p><span>{points.length ? 'Añade otro día de peso para ver la tendencia.' : 'Amplía el periodo o registra tu peso en la bitácora.'}</span><Link to="/app/daily-log">Abrir bitácora</Link></div>;
  const weights = points.map(p => p.weight!);
  const low = Math.floor(Math.min(...weights) - 0.5), high = Math.ceil(Math.max(...weights) + 0.5);
  const first = new Date(points[0].date + 'T12:00:00').getTime();
  const span = new Date(points[points.length - 1].date + 'T12:00:00').getTime() - first || 1;
  const x = (date: string) => 48 + ((new Date(date + 'T12:00:00').getTime() - first) / span) * (width - 64);
  const y = (weight: number) => 180 - ((weight - low) / (high - low)) * 145;
  const path = points.map((p, i) => `${i ? 'L' : 'M'} ${x(p.date)} ${y(p.weight!)}`).join(' ');
  const averages = points.map(p => ({ date: p.date, weight: mean(points.filter(q => q.date >= shiftDate(p.date, -6) && q.date <= p.date).map(q => q.weight))! }));
  const avgPath = averages.map((p, i) => `${i ? 'L' : 'M'} ${x(p.date)} ${y(p.weight)}`).join(' ');
  return <svg ref={chartRef} className="weight-chart" viewBox={`0 0 ${width} 225`} role="img" aria-label={`Evolución de ${weights[0]} a ${weights[weights.length - 1]} kg. Promedio móvil de siete días.`}>
    {[0, 1, 2, 3].map(i => { const w = low + (high - low) * i / 3; return <g key={i}><line x1="48" x2={width - 16} y1={y(w)} y2={y(w)} stroke="var(--border)" /><text x="38" y={y(w) + 4} textAnchor="end">{w.toFixed(1)}</text></g>; })}
    <path d={path} fill="none" stroke="var(--chart-muted)" strokeWidth="1.5" />
    <path d={avgPath} fill="none" stroke="var(--accent)" strokeWidth="2.5" />
    {points.map(p => <circle key={p.date} cx={x(p.date)} cy={y(p.weight!)} r="3" fill="var(--bg-alt)" stroke="var(--chart-muted)"><title>{displayDate(p.date)}: {p.weight} kg</title></circle>)}
    <text x="48" y="214">{displayDate(points[0].date)}</text><text x={width - 16} y="214" textAnchor="end">{displayDate(points[points.length - 1].date)}</text>
  </svg>;
}

export default function Dashboard() {
  const { data, loading, error, reload } = useApi(async () => {
    const [stats, routines, sessions, profile] = await Promise.all([
      api.get<BodyStat[]>('/api/body-stats?days=36500'), api.get<Routine[]>('/api/routines'), api.get<WorkoutSession[]>('/api/sessions?days=90'), api.get<Profile | null>('/api/profile'),
    ]);
    return { stats, routines, sessions, profile };
  });
  const [range, setRange] = useState(90);
  const today = localDate();
  const latest = data?.stats.filter(s => s.weight != null && s.date <= today).at(-1);
  const weekStart = shiftDate(today, -6), previousStart = shiftDate(today, -13);
  const weekly = mean(data?.stats.filter(s => s.date >= weekStart && s.date <= today).map(s => s.weight) || []);
  const previous = mean(data?.stats.filter(s => s.date >= previousStart && s.date < weekStart).map(s => s.weight) || []);
  const change = weekly != null && previous != null ? weekly - previous : null;
  const completed = data?.sessions.filter(s => s.finished_at && s.date >= weekStart && s.date <= today) || [];
  const active = data?.routines.find(r => r.is_active);
  const recent = data?.stats.filter(s => s.date <= today).slice(-5).reverse() || [];
  const daysLeft = data?.profile?.competition_date ? Math.ceil((new Date(data.profile.competition_date + 'T12:00:00').getTime() - new Date(today + 'T12:00:00').getTime()) / 86400000) : null;
  return <>
    <div className="page-heading"><div><h1>El trabajo se nota.</h1><p>Tu entrenamiento y tu preparación, en un solo lugar.</p></div><Link className="btn-primary" to="/app/daily-log">Registrar mi día</Link></div>
    <div className="date-line">{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })}<span className="phase-tag">{({ cut: 'Definición', bulk: 'Volumen', maintain: 'Mantenimiento' } as Record<string, string>)[data?.profile?.current_phase || ''] || 'Configura tu fase'}</span></div>
    {loading && <p role="status">Cargando tu progreso…</p>}{error && <div className="error-banner" role="alert">No se pudo cargar tu resumen. {error} <button onClick={reload}>Reintentar</button></div>}
    <section className="summary-strip" aria-label="Resumen de los últimos siete días">
      <div><span>Último peso</span><strong>{latest?.weight?.toFixed(1) ?? '—'} <small>kg</small></strong><p>{latest ? displayDate(latest.date) : 'Aún sin registros'}</p></div>
      <div><span>Promedio · 7 días</span><strong>{weekly?.toFixed(1) ?? '—'} <small>kg</small></strong><p>{change == null ? 'La tendencia aparece con dos semanas' : `${change > 0 ? '+' : ''}${change.toFixed(2)} kg frente a los 7 días anteriores`}</p></div>
      <div><span>Entrenamientos · 7 días</span><strong>{data ? completed.length : '—'} <small>{data?.profile?.weekly_sessions ? `/ ${data.profile.weekly_sessions}` : 'sesiones'}</small></strong><p>Sesiones completadas</p></div>
      <div><span>Tu próxima meta</span><strong>{daysLeft == null ? 'A tu ritmo' : daysLeft >= 0 ? daysLeft : 'Finalizada'} <small>{daysLeft != null && daysLeft >= 0 ? 'días' : ''}</small></strong><p>{daysLeft == null ? 'Añade una fecha en preparación' : 'Fecha objetivo de preparación'}</p></div>
    </section>
    <div className="dashboard-grid"><section className="panel weight-panel"><div className="section-heading"><h2>Peso en perspectiva</h2><div className="segmented" aria-label="Periodo de peso">{[14, 30, 90].map(r => <button key={r} aria-pressed={range === r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>{r} días</button>)}</div></div><WeightChart stats={(data?.stats || []).filter(s => s.date >= shiftDate(today, -range + 1) && s.date <= today)} /><div className="chart-legend"><span><i />Promedio de 7 días</span><span><i className="muted-dot" />Peso diario</span></div><p className="helper-text">Un día fluctúa. El promedio muestra la dirección.</p></section>
    <section className="training-panel"><div className="section-heading"><h2>A entrenar</h2><span className="phase-tag">{active ? 'Rutina activa' : 'Tu programa'}</span></div><h3>{active?.name || 'Empieza con tu rutina'}</h3><p>{active ? 'Elige el día que vas a entrenar. Tus últimas series estarán a mano.' : 'Crea una rutina o parte de una plantilla. Después registra cada serie con peso, repeticiones y RIR.'}</p><div className="workout-list">{active?.workouts.map(w => <Link key={w.id} to={`/app/session/${w.id}`}><div><strong>{w.name}</strong><span>{w.exercises.length} ejercicios</span></div><svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="M5 12h14m-6-6 6 6-6 6" /></svg></Link>)}</div><Link className="btn-ghost" to="/app/routines">{active ? 'Editar mi programa' : 'Crear mi programa'}</Link></section></div>
    <section className="panel recent-panel"><div className="section-heading"><div><h2>Tu bitácora, de un vistazo</h2><p className="helper-text">Los últimos días que registraste.</p></div><Link to="/app/daily-log">Ver y editar bitácora</Link></div><div className="table-scroll"><table className="read-table"><thead><tr><th>Fecha</th><th>Peso</th><th>Calorías</th><th>Proteína</th><th>Pasos</th><th>Sueño</th></tr></thead><tbody>{recent.map(s => <tr key={s.id}><th>{displayDate(s.date)}</th><td>{s.weight == null ? '—' : `${s.weight} kg`}</td><td>{s.calories?.toLocaleString('es-CO') ?? '—'}</td><td>{s.protein_g == null ? '—' : `${s.protein_g} g`}</td><td>{s.steps?.toLocaleString('es-CO') ?? '—'}</td><td>{s.sleep_minutes == null ? '—' : `${(s.sleep_minutes / 60).toFixed(1)} h`}</td></tr>)}</tbody></table></div>{!recent.length && <div className="table-empty">Todavía no hay días registrados. <Link to="/app/daily-log">Añade el primero.</Link></div>}</section>
    <div className="daily-note"><strong>La constancia deja un registro.</strong><span>Entrena. Anota. Revisa. Repite.</span><Link to="/app/preparation">Revisar mi preparación</Link></div>
  </>;
}
