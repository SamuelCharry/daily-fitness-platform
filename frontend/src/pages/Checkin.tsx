import { useMemo, useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { BodyStat, Profile } from '../types';
import { displayDate } from '../utils/journal';
import { DailyCheckin, WeeklyCheckin, defaultDate, missingFields } from '../components/CheckIn';

export default function Checkin() {
  const { data, loading, error, reload, setData } = useApi(async () => {
    const [stats, profile] = await Promise.all([api.get<BodyStat[]>('/api/body-stats?days=36500'), api.get<Profile | null>('/api/profile')]);
    return { stats, profile };
  });
  const [date, setDate] = useState(defaultDate);
  const stats = useMemo(() => [...(data?.stats || [])].sort((a, b) => a.date.localeCompare(b.date)), [data?.stats]);
  const recent = stats.filter(s => missingFields(s).length < 8).reverse().slice(0, 14);

  function onSaved(stat: BodyStat) {
    setData(old => old && { ...old, stats: [...old.stats.filter(s => s.date !== stat.date), stat] });
  }

  return <>
    <div className="page-heading"><div><h1>Check-in diario</h1></div></div>
    {loading && !data && <p role="status" className="muted-note">Cargando…</p>}
    {error && <div className="error-banner" role="alert">No se pudo cargar. {error} <button onClick={reload}>Reintentar</button></div>}
    {data && <>
      <div className="checkin-row">
        <DailyCheckin stats={stats} onSaved={onSaved} date={date} onDate={setDate} />
        <WeeklyCheckin stats={stats} profile={data.profile} />
      </div>
      <section className="panel">
        <div className="section-heading"><div><h2>Últimos días</h2><p className="helper-text">Toca un día para editarlo arriba</p></div></div>
        <div className="table-scroll"><table className="read-table">
          <thead><tr><th>Fecha</th><th>Peso</th><th>Cintura</th><th>Cuello</th><th>Sueño</th><th>Pasos</th><th>Calorías</th><th>Proteína</th><th>Dieta</th></tr></thead>
          <tbody>{recent.map(s => <tr key={s.date} className={`clickable${s.date === date ? ' selected' : ''}`} onClick={() => { setDate(s.date); window.scrollTo({ top: 0, behavior: 'smooth' }); }}>
            <th>{displayDate(s.date)}</th><td>{s.weight ?? '—'}</td><td>{s.waist ?? '—'}</td><td>{s.neck ?? '—'}</td><td>{s.sleep_minutes == null ? '—' : `${(s.sleep_minutes / 60).toFixed(1)} h`}</td><td>{s.steps?.toLocaleString('es-CO') ?? '—'}</td><td>{s.calories?.toLocaleString('es-CO') ?? '—'}</td><td>{s.protein_g ?? '—'}</td><td>{s.on_diet == null ? '—' : s.on_diet ? 'Sí' : 'No'}</td>
          </tr>)}</tbody>
        </table></div>
        {!recent.length && <p className="table-empty">Aún no hay registros.</p>}
      </section>
    </>}
  </>;
}
