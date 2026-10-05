import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useAuth } from '../auth/AuthContext';
import { useApi } from '../hooks/useApi';
import { useTheme, type ThemeMode } from '../theme/ThemeContext';
import type { Profile } from '../types';
import { localDate } from '../utils/journal';

const empty: Profile = { height_cm: null, sex: null, birthdate: null, current_phase: 'maintain', phase_start_date: null, competition_date: null, goal_weight: null, target_calories: null, target_protein: null };

function GoalsForm() {
  const { data, loading, error, reload } = useApi(() => api.get<Profile | null>('/api/profile'));
  const [form, setForm] = useState<Profile>(empty);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');
  useEffect(() => { if (data !== null || !loading) setForm({ ...empty, ...data }); }, [data, loading]);

  async function save(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setMessage('');
    try { await api.put('/api/profile', form); setMessage('Guardado.'); reload(); }
    catch (err) { setMessage(err instanceof Error ? err.message : 'No se pudo guardar.'); }
    finally { setSaving(false); }
  }
  function numberField(key: keyof Profile, label: string, min: number, max: number, step = 'any') {
    return <label className="field"><span>{label}</span><input type="number" min={min} max={max} step={step} value={(form[key] as number | null) ?? ''} onChange={e => setForm({ ...form, [key]: e.target.value === '' ? null : Number(e.target.value) })} /></label>;
  }

  return (
    <form className="panel goals-form" onSubmit={save}>
      <div className="section-heading"><div><h2>Objetivos y datos personales</h2><p className="helper-text">Estatura, sexo y edad se usan para el % de grasa y el FFMI. Los objetivos aparecen en tus gráficas y en el check-in semanal.</p></div></div>
      {error && <p className="error-text">{error}</p>}
      <div className="form-grid">
        <label className="field"><span>Fase actual</span><select value={form.current_phase || 'maintain'} onChange={e => setForm({ ...form, current_phase: e.target.value, phase_start_date: e.target.value === data?.current_phase ? data?.phase_start_date ?? null : localDate() })}><option value="maintain">Mantenimiento</option><option value="bulk">Volumen</option><option value="cut">Definición</option></select></label>
        <label className="field"><span>Inicio de la fase</span><input type="date" value={form.phase_start_date || ''} onChange={e => setForm({ ...form, phase_start_date: e.target.value || null })} /></label>
        <label className="field"><span>Fecha objetivo</span><input type="date" value={form.competition_date || ''} onChange={e => setForm({ ...form, competition_date: e.target.value || null })} /></label>
        {numberField('goal_weight', 'Peso objetivo · kg', 30, 300)}
        {numberField('target_calories', 'Calorías diarias · kcal', 800, 8000, '1')}
        {numberField('target_protein', 'Proteína diaria · g', 0, 500)}
        {numberField('height_cm', 'Estatura · cm', 120, 230)}
        <label className="field"><span>Sexo</span><select value={form.sex || ''} onChange={e => setForm({ ...form, sex: e.target.value || null })}><option value="">Sin especificar</option><option value="male">Masculino</option><option value="female">Femenino</option></select></label>
        <label className="field"><span>Fecha de nacimiento</span><input type="date" max={localDate()} value={form.birthdate || ''} onChange={e => setForm({ ...form, birthdate: e.target.value || null })} /></label>
      </div>
      <div className="form-actions"><button className="btn-primary" disabled={saving || loading}>{saving ? 'Guardando…' : 'Guardar'}</button>{message && <span role="status" className="muted-note">{message}</span>}</div>
    </form>
  );
}

function PhoneSync() {
  const { data, reload } = useApi(() => api.get<{ active: boolean }>('/api/sync/token'));
  const [key, setKey] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState('');
  const url = `${window.location.origin}/api/sync/health`;
  const local = /^(localhost|127\.|\[::1\])/.test(window.location.hostname);

  async function generate() {
    if (data?.active && !window.confirm('Ya tienes una clave. La nueva reemplaza a la anterior y tendrás que actualizarla en el Atajo. ¿Continuar?')) return;
    setBusy(true);
    try { setKey((await api.post<{ token: string }>('/api/sync/token')).token); reload(); } finally { setBusy(false); }
  }
  async function revoke() {
    if (!window.confirm('El Atajo dejará de poder enviar datos. ¿Desactivar?')) return;
    await api.delete('/api/sync/token'); setKey(null); reload();
  }
  async function copy(text: string, what: string) {
    try { await navigator.clipboard.writeText(text); setCopied(what); setTimeout(() => setCopied(''), 1500); } catch { /* ignore */ }
  }

  return (
    <section className="panel sync-panel">
      <div className="section-heading">
        <div><h2>Sincronizar con iPhone</h2><p className="helper-text">Un Atajo de iOS lee pasos y sueño de Salud y los envía solo cada día. Lo que llegue reemplaza el valor de ese día.</p></div>
        <span className={`status-pill ${data?.active ? 's-ok' : ''}`}>{data?.active ? 'Activa' : 'Sin configurar'}</span>
      </div>
      {local && <p className="checkin-nudge">Estás en la versión local (127.0.0.1): el iPhone no puede llegar aquí. Configura esto desde la app publicada en Railway.</p>}
      <div className="sync-fields">
        <div><span>Dirección</span><code>{url}</code><button className="chip-button" onClick={() => copy(url, 'url')}>{copied === 'url' ? 'Copiada' : 'Copiar'}</button></div>
        {key && <div><span>Clave (solo se muestra ahora)</span><code>{key}</code><button className="chip-button" onClick={() => copy(key, 'key')}>{copied === 'key' ? 'Copiada' : 'Copiar'}</button></div>}
      </div>
      <div className="theme-options">
        <button className="btn-primary" disabled={busy} onClick={generate}>{data?.active ? 'Generar clave nueva' : 'Generar clave'}</button>
        {data?.active && <button className="btn-ghost" onClick={revoke}>Desactivar</button>}
      </div>
      <details className="sync-steps">
        <summary>Cómo crear el Atajo</summary>
        <ol>
          <li>En <strong>Atajos</strong>, crea un atajo nuevo llamado «Enviar pasos».</li>
          <li><strong>Buscar muestras de Salud</strong>: tipo <em>Pasos</em>, fecha de inicio <em>es hoy</em>.</li>
          <li><strong>Calcular estadísticas</strong>: <em>Suma</em> de las muestras.</li>
          <li><strong>Obtener contenido de URL</strong>: pega la dirección, método <em>POST</em>, encabezado <code>X-Sync-Key</code> con tu clave, cuerpo <em>JSON</em> con el campo <code>steps</code> = la suma.</li>
          <li>Crea otro atajo «Enviar sueño»: <strong>Buscar muestras de Salud</strong> de tipo <em>Análisis del sueño</em>, fecha de inicio <em>en las últimas 18 horas</em> y valor <em>Dormido</em>; luego <strong>Obtener detalles</strong> → <em>Duración</em>, <strong>Calcular estadísticas</strong> → <em>Suma</em>, y envíalo igual pero con el campo <code>sleep_hours</code>.</li>
          <li>En <strong>Automatización</strong>, crea dos de tipo <em>Hora del día</em>, diarias y con <em>Ejecutar inmediatamente</em>: «Enviar sueño» a las 10:00 y «Enviar pasos» a las 23:30.</li>
          <li>La primera vez, añade <strong>Mostrar resultado</strong> al final: la app responde qué guardó (por ejemplo <code>{'{"steps": 8432}'}</code>). Si el sueño sale en una unidad rara, envíalo como <code>sleep_minutes</code>.</li>
        </ol>
        <p className="helper-text">Opcional: el campo <code>date</code> acepta <code>ayer</code> o una fecha <code>AAAA-MM-DD</code>, por si quieres enviar los pasos de ayer por la mañana. También acepta <code>weight</code> si tu báscula escribe en Salud.</p>
      </details>
    </section>
  );
}

export default function Settings() {
  const { user, logout, personalMode } = useAuth();
  const { mode, setMode } = useTheme();
  return <>
    <div className="page-heading"><div><h1>Preferencias</h1></div></div>
    <GoalsForm />
    <PhoneSync />
    <section className="panel"><h2>Apariencia</h2><div className="theme-options">{([['light', 'Claro'], ['dark', 'Oscuro'], ['system', 'Según el dispositivo']] as [ThemeMode, string][]).map(([key, label]) => <button className={mode === key ? 'btn-primary' : 'btn-ghost'} key={key} onClick={() => setMode(key)} aria-pressed={mode === key}>{label}</button>)}</div></section>
    <section className="panel"><div className="section-heading"><h2>Cuenta</h2>{!personalMode && <button className="btn-ghost" onClick={logout}>Cerrar sesión</button>}</div><p className="helper-text">{user?.email} · {personalMode ? 'Acceso local' : 'Acceso protegido'}</p></section>
    <section className="panel"><h2>Datos</h2><p className="helper-text">Los check-ins se exportan desde Mi resumen; las series, desde Historial.</p><div className="theme-options"><Link className="btn-ghost" to="/app">Exportar check-ins</Link><Link className="btn-ghost" to="/app/history">Exportar entrenamientos</Link><Link className="btn-ghost" to="/app/glossary">Glosario</Link></div></section>
  </>;
}
