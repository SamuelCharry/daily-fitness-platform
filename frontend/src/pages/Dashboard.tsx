import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { BodyStat, Profile, WeekPlan } from '../types';
import { displayDate, downloadCSV, localDate, shiftDate } from '../utils/journal';
import { composition, daysBetween, recentAverage, weeklyRate } from '../utils/body';
import { CalendarHeatmap, TrendChart, type HeatCell } from '../components/Charts';
import { missingFields } from '../components/CheckIn';
import ThisWeek from '../components/ThisWeek';

const PHASES: Record<string, string> = { cut: 'Definición', bulk: 'Volumen', maintain: 'Mantenimiento' };

type HeatMetric = 'registro' | 'dieta' | 'pasos' | 'sueno';
const HEAT_METRICS: [HeatMetric, string][] = [['registro', 'Registro'], ['dieta', 'Dieta'], ['pasos', 'Pasos'], ['sueno', 'Sueño']];

function heatCell(stat: BodyStat, metric: HeatMetric): HeatCell | null {
  if (metric === 'registro') {
    const total = 8, missing = missingFields(stat).length;
    const filled = total - missing;
    return filled ? { date: stat.date, level: Math.min(4, Math.ceil((filled / total) * 4)), text: `${filled} de ${total} datos` } : null;
  }
  if (metric === 'dieta') return stat.on_diet == null ? null : { date: stat.date, level: stat.on_diet ? 4 : 0, text: stat.on_diet ? 'Dieta cumplida' : 'Dieta no cumplida' };
  if (metric === 'pasos') return stat.steps == null ? null : { date: stat.date, level: stat.steps < 4000 ? 0 : stat.steps < 7000 ? 1 : stat.steps < 10000 ? 2 : stat.steps < 13000 ? 3 : 4, text: `${stat.steps.toLocaleString('es-CO')} pasos` };
  const h = stat.sleep_minutes == null ? null : stat.sleep_minutes / 60;
  return h == null ? null : { date: stat.date, level: h < 5.5 ? 0 : h < 6.5 ? 1 : h < 7.25 ? 2 : h < 8 ? 3 : 4, text: `${h.toFixed(1)} h de sueño` };
}

const HEAT_LEGEND: Record<HeatMetric, [string, string]> = { registro: ['Nada', 'Completo'], dieta: ['No', 'Sí'], pasos: ['<4k', '13k+'], sueno: ['<5.5 h', '8 h+'] };

export default function Dashboard() {
  const { data, loading, error, reload, setData } = useApi(async () => {
    const [stats, profile, week] = await Promise.all([
      api.get<BodyStat[]>('/api/body-stats?days=36500'), api.get<Profile | null>('/api/profile'), api.get<WeekPlan>('/api/schedule/week'),
    ]);
    return { stats, profile, week };
  });
  const [chosenRange, setRange] = useState<number | null>(null);
  const [heat, setHeat] = useState<HeatMetric>('registro');
  const today = localDate();
  const stats = useMemo(() => [...(data?.stats || [])].sort((a, b) => a.date.localeCompare(b.date)), [data?.stats]);
  const profile = data?.profile || null;


  const logged = stats.filter(s => missingFields(s).length < 8);
  const lastLog = logged.at(-1)?.date ?? null;
  const daysSince = lastLog ? daysBetween(lastLog, today) : null;
  const weight = recentAverage(stats, 'weight');
  const comp = composition(stats, profile);
  const rate = weeklyRate(stats, lastLog || today);
  const daysLeft = profile?.competition_date ? daysBetween(today, profile.competition_date) : null;
  const toGo = profile?.goal_weight && weight ? weight.value - profile.goal_weight : null;
  const needed = toGo != null && daysLeft != null && daysLeft > 0 ? -(toGo / (daysLeft / 7)) : null;
  // Until a period is picked, open on the shortest one that still shows your last data.
  const range = chosenRange ?? ([14, 30, 90, 180].find(r => daysSince == null || daysSince < r - 1) || 365);
  const stale = daysSince != null && daysSince > 14;
  const start = shiftDate(today, -range + 1);
  const series = (key: keyof BodyStat, scale = 1) => stats.filter(s => s[key] != null).map(s => ({ date: s.date, value: (s[key] as number) / scale }));
  const cells = useMemo(() => new Map(stats.map(s => heatCell(s, heat)).filter((c): c is HeatCell => c != null).map(c => [c.date, c])), [stats, heat]);
  const todayMissing = missingFields(stats.find(s => s.date === today));

  function exportCSV() {
    downloadCSV('cool-for-the-summer-checkins.csv', [['Fecha', 'Peso kg', 'Cintura cm', 'Cuello cm', 'Sueño h', 'Pasos', 'Calorías', 'Proteína g', 'Dieta'], ...stats.map(s => [s.date, s.weight, s.waist, s.neck, s.sleep_minutes == null ? '' : (s.sleep_minutes / 60).toFixed(2), s.steps, s.calories, s.protein_g, s.on_diet == null ? '' : s.on_diet ? 'Sí' : 'No'])]);
  }

  return <>
    <div className="page-heading">
      <div><h1>Mi resumen</h1><div className="date-line">{new Date().toLocaleDateString('es-CO', { weekday: 'long', day: 'numeric', month: 'long' })}{profile?.current_phase && <span className="phase-tag">{PHASES[profile.current_phase]}</span>}</div></div>
      <button className="btn-ghost" onClick={exportCSV} disabled={!stats.length}>Exportar CSV</button>
    </div>
    {loading && !data && <p role="status" className="muted-note">Cargando…</p>}
    {error && <div className="error-banner" role="alert">No se pudo cargar tu resumen. {error} <button onClick={reload}>Reintentar</button></div>}

    {data && <>
      {daysSince != null && daysSince >= 2 && <div className="stale-banner" role="status"><strong>{daysSince} días sin registrar.</strong> Tu último check-in fue el {displayDate(lastLog!)}. Las cifras de abajo usan esos datos.</div>}
      {daysSince == null && <div className="stale-banner" role="status"><strong>Todavía no hay check-ins.</strong> Empieza por tu peso de hoy.</div>}

      <Link className="today-cta" to="/app/checkin">
        <span><strong>Check-in de hoy</strong>{todayMissing.length ? `Te falta: ${todayMissing.join(', ')}` : 'Completo'}</span>
        <em>{8 - todayMissing.length} de 8</em>
      </Link>

      <section className="kpi-strip" aria-label="Indicadores principales">
        <div>
          <span>Peso · promedio 7 días</span>
          <strong>{weight ? weight.value.toFixed(1) : '—'}<small> kg</small></strong>
          <p>{rate == null ? 'El ritmo aparece con 4 pesajes en 1 semana' : `${rate > 0 ? '+' : ''}${rate.toFixed(2)} kg/sem · ${weight ? `${((rate / weight.value) * 100).toFixed(1)} %` : ''}${stale ? ` (hasta el ${displayDate(lastLog!)})` : ''}`}</p>
        </div>
        <div>
          <span>Grasa corporal · aprox.</span>
          <strong>{comp.bodyFat != null ? comp.bodyFat.toFixed(1) : '—'}<small> %</small></strong>
          <p>{comp.bodyFat != null ? `Método Navy · cintura y cuello${comp.inputsDate && daysBetween(comp.inputsDate, today) > 7 ? ` del ${displayDate(comp.inputsDate)}` : ''}` : `Falta: ${comp.missing.join(', ')}`}</p>
        </div>
        <div>
          <span>FFMI normalizado</span>
          <strong>{comp.ffmi != null ? comp.ffmi.toFixed(1) : '—'}</strong>
          <p>{comp.band || 'Necesita % de grasa y estatura'}</p>
        </div>
        <div>
          <span>Meta{profile?.goal_weight ? ` · ${profile.goal_weight} kg` : ''}</span>
          <strong>{toGo != null ? `${toGo > 0 ? '−' : '+'}${Math.abs(toGo).toFixed(1)}` : '—'}<small> {toGo != null ? 'kg' : ''}</small></strong>
          <p>{daysLeft == null ? <Link to="/app/settings">Define fecha y peso objetivo</Link> : daysLeft < 0 ? 'La fecha objetivo ya pasó' : `${daysLeft} días · ${needed != null ? `necesitas ${needed > 0 ? '+' : ''}${needed.toFixed(2)} kg/sem` : ''}`}</p>
        </div>
      </section>
      {needed != null && rate != null && !stale && Math.abs(needed) > 0.05 && <p className="helper-text pace-note">{Math.sign(rate) === Math.sign(needed) && Math.abs(rate) >= Math.abs(needed) * 0.9 ? 'Vas al ritmo que necesitas para llegar a la meta.' : `A tu ritmo actual (${rate.toFixed(2)} kg/sem) no llegas a ${profile?.goal_weight} kg para el ${displayDate(profile!.competition_date!)}. Necesitas ${needed.toFixed(2)} kg/sem${weight && Math.abs(needed / weight.value) > 0.01 ? ', más del 1 % de tu peso por semana: arriesgas masa muscular' : ''}.`}</p>}

      <ThisWeek plan={data.week} onChange={week => setData(old => old && { ...old, week })} />

      <section className="panel">
        <div className="section-heading">
          <h2>Tendencias</h2>
          <div className="segmented" aria-label="Periodo">{[14, 30, 90, 180, 365].map(r => <button key={r} aria-pressed={range === r} className={range === r ? 'active' : ''} onClick={() => setRange(r)}>{r === 365 ? '1 año' : `${r} días`}</button>)}</div>
        </div>
        <div className="chart-grid-2">
          <div className="chart-card"><h3>Peso</h3><p className="chart-sub">Puntos: diario · línea: promedio de 7 días</p><TrendChart points={series('weight')} start={start} end={today} unit="kg" average target={profile?.goal_weight} targetLabel="Meta" /></div>
          <div className="chart-card"><h3>Cintura</h3><p className="chart-sub">cm</p><TrendChart points={series('waist')} start={start} end={today} unit="cm" /></div>
          <div className="chart-card"><h3>Sueño</h3><p className="chart-sub">Horas por noche</p><TrendChart kind="bar" points={series('sleep_minutes', 60)} start={start} end={today} unit="h" target={7} targetLabel="7 h" /></div>
          <div className="chart-card"><h3>Pasos</h3><p className="chart-sub">Por día</p><TrendChart kind="bar" points={series('steps')} start={start} end={today} unit="pasos" decimals={0} /></div>
          <div className="chart-card"><h3>Calorías</h3><p className="chart-sub">kcal por día</p><TrendChart kind="bar" points={series('calories')} start={start} end={today} unit="kcal" decimals={0} target={profile?.target_calories} /></div>
          <div className="chart-card"><h3>Proteína</h3><p className="chart-sub">g por día</p><TrendChart kind="bar" points={series('protein_g')} start={start} end={today} unit="g" decimals={0} target={profile?.target_protein} /></div>
        </div>
      </section>

      <section className="panel">
        <div className="section-heading">
          <div><h2>Constancia</h2><p className="helper-text">Últimos 6 meses, una casilla por día</p></div>
          <div className="segmented" aria-label="Qué mostrar">{HEAT_METRICS.map(([key, label]) => <button key={key} aria-pressed={heat === key} className={heat === key ? 'active' : ''} onClick={() => setHeat(key)}>{label}</button>)}</div>
        </div>
        <CalendarHeatmap cells={cells} end={today} legend={HEAT_LEGEND[heat]} />
      </section>

    </>}
  </>;
}
