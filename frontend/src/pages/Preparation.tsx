import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { BodyStat, Profile } from '../types';
import { localDate, mean, shiftDate } from '../utils/journal';
import StrengthMap from './StrengthMap';

const empty: Profile = { height_cm: null, sex: null, birthdate: null, current_phase: 'maintain', phase_start_date: null, competition_date: null, goal_weight: null, target_calories: null, target_protein: null, weekly_sessions: null, preparation_notes: null };
export default function Preparation() {
  const { data, loading, error, reload } = useApi(async () => ({ profile: await api.get<Profile | null>('/api/profile'), stats: await api.get<BodyStat[]>('/api/body-stats?days=30') }));
  const [form, setForm] = useState<Profile>(empty);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  const [map, setMap] = useState(false);
  useEffect(() => { if (data) setForm({ ...empty, ...data.profile }); }, [data]);
  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMessage('');
    try { await api.put('/api/profile', form); setMessage('Objetivos guardados.'); reload(); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.'); }
    finally { setSaving(false); }
  }
  function numberField(key: keyof Profile, label: string, min = 0, max = 20000, step = 'any') {
    return <label className="field"><span>{label}</span><input type="number" min={min} max={max} step={step} value={form[key] ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value === '' ? null : Number(e.target.value) })} /></label>;
  }
  const week = data?.stats.filter(s => s.date >= shiftDate(localDate(), -6) && s.date <= localDate()) || [];
  const avgCalories = mean(week.map(s => s.calories)), avgProtein = mean(week.map(s => s.protein_g));
  return <>
    <div className="page-heading"><div><h1>Tu preparación</h1><p>Objetivos claros. Decisiones con perspectiva.</p></div><Link className="btn-ghost" to="/app/daily-log">Registrar check-in</Link></div>
    {loading && <p role="status">Cargando preparación…</p>}{error && <div className="error-banner" role="alert">{error} <button onClick={reload}>Reintentar</button></div>}
    <div className="preparation-grid"><form className="panel preparation-form" onSubmit={save}><h2>Mi siguiente etapa</h2><div className="form-grid">
      <label className="field"><span>Fase actual</span><select value={form.current_phase || 'maintain'} onChange={e => setForm({ ...form, current_phase: e.target.value, phase_start_date: localDate() })}><option value="maintain">Mantenimiento</option><option value="bulk">Volumen</option><option value="cut">Definición</option></select></label>
      <label className="field"><span>Inicio de la fase</span><input type="date" value={form.phase_start_date || ''} onChange={e => setForm({ ...form, phase_start_date: e.target.value || null })} /></label>
      <label className="field"><span>Fecha objetivo / competición</span><input type="date" value={form.competition_date || ''} onChange={e => setForm({ ...form, competition_date: e.target.value || null })} /></label>
      {numberField('goal_weight', 'Peso objetivo · kg', 1, 500)}
      {numberField('target_calories', 'Objetivo diario · kcal', 1, 20000, '1')}
      {numberField('target_protein', 'Proteína diaria · g', 0, 1000)}
      {numberField('weekly_sessions', 'Sesiones por semana', 1, 14, '1')}
      {numberField('height_cm', 'Estatura · cm', 50, 250)}
      <label className="field"><span>Sexo (para estimaciones)</span><select value={form.sex || ''} onChange={e => setForm({ ...form, sex: e.target.value || null })}><option value="">Sin especificar</option><option value="male">Masculino</option><option value="female">Femenino</option></select></label>
      <label className="field"><span>Fecha de nacimiento</span><input type="date" max={localDate()} value={form.birthdate || ''} onChange={e => setForm({ ...form, birthdate: e.target.value || null })} /></label>
    </div><label className="field"><span>Enfoque del bloque, posing y notas</span><textarea rows={4} maxLength={5000} placeholder="Qué quiero mejorar, qué voy a observar, qué revisar en el próximo check-in…" value={form.preparation_notes || ''} onChange={e => setForm({ ...form, preparation_notes: e.target.value || null })} /></label><button className="btn-primary" disabled={saving || loading || !!error}>{saving ? 'Guardando…' : 'Guardar mis objetivos'}</button>{message && <p role="status">{message}</p>}</form>
      <aside className="preparation-review"><h2>Check-in semanal</h2><p>Últimos 7 días. Solo cuentan los valores que registraste.</p><dl><div><dt>Peso promedio</dt><dd>{mean(week.map(s => s.weight))?.toFixed(2) ?? '—'} kg</dd></div><div><dt>Energía promedio</dt><dd>{avgCalories?.toFixed(0) ?? '—'} kcal</dd></div><div><dt>Proteína promedio</dt><dd>{avgProtein?.toFixed(0) ?? '—'} g</dd></div><div><dt>Días con peso</dt><dd>{week.filter(s => s.weight != null).length} / 7</dd></div><div><dt>Sueño promedio</dt><dd>{mean(week.map(s => s.sleep_minutes)) == null ? '—' : (mean(week.map(s => s.sleep_minutes))! / 60).toFixed(1)} h</dd></div></dl><p className="helper-text">Los objetivos los defines tú con tu entrenador. Esta bitácora muestra lo registrado y no ajusta tu dieta automáticamente.</p><Link to="/app/daily-log">Completar mi semana</Link></aside>
    </div>
    <section className="panel"><div className="section-heading"><h2>Volumen de entrenamiento</h2><button className="btn-ghost" onClick={() => setMap(!map)} aria-expanded={map}>{map ? 'Ocultar detalle' : 'Revisar por músculo'}</button></div>{map ? <StrengthMap /> : <p className="helper-text">Revisa las series registradas por grupo muscular para acompañar tu programación.</p>}</section>
  </>;
}
