import { useEffect, useState } from 'react';
import { api } from '../api';
import type { BodyStat, Profile } from '../types';
import { formatSleep, parseSleep } from '../utils/body';
import { displayDate, localDate, mean, shiftDate } from '../utils/journal';

type FieldKey = 'weight' | 'waist' | 'neck' | 'sleep_minutes' | 'steps' | 'calories' | 'protein_g';

interface Field {
  key: FieldKey;
  label: string;
  unit: string;
  min: number;
  max: number;
  integer?: boolean;
  placeholder: string;
  when: 'mañana' | 'noche';
}

// Morning fields first (scale, tape, last night's sleep), end-of-day totals after.
const FIELDS: Field[] = [
  { key: 'weight', label: 'Peso', unit: 'kg', min: 20, max: 400, placeholder: '—', when: 'mañana' },
  { key: 'waist', label: 'Cintura', unit: 'cm', min: 40, max: 250, placeholder: '—', when: 'mañana' },
  { key: 'neck', label: 'Cuello', unit: 'cm', min: 20, max: 80, placeholder: '—', when: 'mañana' },
  { key: 'sleep_minutes', label: 'Sueño', unit: 'h o h:mm', min: 0, max: 1440, placeholder: '—', when: 'mañana' },
  { key: 'steps', label: 'Pasos', unit: '', min: 0, max: 200000, integer: true, placeholder: '—', when: 'noche' },
  { key: 'calories', label: 'Calorías', unit: 'kcal', min: 0, max: 20000, integer: true, placeholder: '—', when: 'noche' },
  { key: 'protein_g', label: 'Proteína', unit: 'g', min: 0, max: 1000, placeholder: '—', when: 'noche' },
];

function toText(stat: BodyStat | undefined, key: FieldKey): string {
  const value = stat?.[key];
  if (value == null) return '';
  return key === 'sleep_minutes' ? formatSleep(value as number) : String(value);
}

function parse(field: Field, text: string): number | null | 'invalid' {
  if (field.key === 'sleep_minutes') {
    const minutes = parseSleep(text);
    return minutes != null && Number.isNaN(minutes) ? 'invalid' : minutes;
  }
  const raw = text.trim().replace(',', '.');
  if (!raw) return null;
  const n = Number(raw);
  if (!Number.isFinite(n) || n < field.min || n > field.max || (field.integer && !Number.isInteger(n))) return 'invalid';
  return n;
}

export function missingFields(stat: BodyStat | undefined): string[] {
  const missing = FIELDS.filter(f => stat?.[f.key] == null).map(f => f.label.toLowerCase());
  if (stat?.on_diet == null) missing.push('dieta');
  return missing;
}

// Before 5 a. m. you're still closing yesterday (steps, calories, diet), so it opens yesterday.
function defaultDate(): string {
  return new Date().getHours() < 5 ? shiftDate(localDate(), -1) : localDate();
}

export function DailyCheckin({ stats, onSaved, date, onDate }: { stats: BodyStat[]; onSaved: (stat: BodyStat) => void; date: string; onDate: (date: string) => void }) {
  const today = localDate(), yesterday = shiftDate(today, -1);
  const stat = stats.find(s => s.date === date);
  const [texts, setTexts] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<Record<string, 'saving' | 'saved' | 'error'>>({});
  const [error, setError] = useState('');

  useEffect(() => {
    setTexts(Object.fromEntries(FIELDS.map(f => [f.key, toText(stat, f.key)])));
    setStatus({});
    setError('');
    // Only reset when the day changes: a save landing must not wipe a field being typed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [date]);

  async function save(key: string, value: unknown) {
    setStatus(s => ({ ...s, [key]: 'saving' }));
    try {
      const saved = await api.post<BodyStat>('/api/body-stats', { date, [key]: value });
      onSaved(saved);
      setStatus(s => ({ ...s, [key]: 'saved' }));
      setError('');
    } catch (err) {
      setStatus(s => ({ ...s, [key]: 'error' }));
      setError(err instanceof Error ? err.message : 'No se pudo guardar.');
    }
  }

  function commit(field: Field, text: string) {
    if (text === toText(stat, field.key)) return;
    const value = parse(field, text);
    if (value === 'invalid') {
      setStatus(s => ({ ...s, [field.key]: 'error' }));
      setError(field.key === 'sleep_minutes' ? 'Sueño: escribe horas como 7.5 o 7:30.' : `${field.label}: debe estar entre ${field.min} y ${field.max}${field.integer ? ', sin decimales' : ''}.`);
      return;
    }
    save(field.key, value);
  }

  const yesterdayMissing = date === today ? missingFields(stats.find(s => s.date === yesterday)) : [];
  const filled = FIELDS.filter(f => stat?.[f.key] != null).length + (stat?.on_diet != null ? 1 : 0);

  return (
    <section className="panel checkin">
      <div className="section-heading">
        <div><h2>Datos del día</h2><p className="helper-text">{filled} de {FIELDS.length + 1} datos · se guarda solo al salir de cada campo</p></div>
        <div className="segmented" role="group" aria-label="Día del check-in">
          <button className={date === today ? 'active' : ''} aria-pressed={date === today} onClick={() => onDate(today)}>Hoy</button>
          <button className={date === yesterday ? 'active' : ''} aria-pressed={date === yesterday} onClick={() => onDate(yesterday)}>Ayer</button>
          <input type="date" aria-label="Otro día" value={date} max={today} onChange={e => e.target.value && onDate(e.target.value)} />
        </div>
      </div>
      {date !== today && <p className="checkin-day">Editando el {displayDate(date)}{date === yesterday ? ' (ayer)' : ''}. <button className="link-button" onClick={() => onDate(today)}>Volver a hoy</button></p>}
      {yesterdayMissing.length > 0 && yesterdayMissing.length < FIELDS.length + 1 && (
        <p className="checkin-nudge">A ayer le falta: {yesterdayMissing.join(', ')}. <button className="link-button" onClick={() => onDate(yesterday)}>Completar ayer</button></p>
      )}
      <div className="checkin-grid">
        {FIELDS.map(f => (
          <label key={f.key} className={`checkin-field state-${status[f.key] || 'idle'}`}>
            <span>{f.label}{f.unit && <small> · {f.unit}</small>}</span>
            <input
              inputMode={f.integer ? 'numeric' : 'decimal'}
              value={texts[f.key] ?? ''}
              placeholder={f.placeholder}
              onChange={e => { setTexts(t => ({ ...t, [f.key]: e.target.value })); setStatus(s => { const next = { ...s }; delete next[f.key]; return next; }); }}
              onBlur={e => commit(f, e.currentTarget.value)}
              onKeyDown={e => e.key === 'Enter' && (e.target as HTMLInputElement).blur()}
            />
            <i aria-live="polite">{status[f.key] === 'saving' ? 'Guardando…' : status[f.key] === 'saved' ? 'Guardado' : status[f.key] === 'error' ? 'Revisar' : f.when === 'noche' ? 'al final del día' : ''}</i>
          </label>
        ))}
        <div className={`checkin-field state-${status.on_diet || 'idle'}`}>
          <span>Dieta cumplida</span>
          <div className="diet-toggle" role="group" aria-label="¿Cumpliste la dieta?">
            {([[true, 'Sí'], [false, 'No']] as const).map(([value, label]) => (
              <button key={label} className={stat?.on_diet === value ? 'active' : ''} aria-pressed={stat?.on_diet === value} onClick={() => save('on_diet', stat?.on_diet === value ? null : value)}>{label}</button>
            ))}
          </div>
          <i>{status.on_diet === 'saving' ? 'Guardando…' : 'al final del día'}</i>
        </div>
      </div>
      {error && <p className="error-text" role="alert">{error}</p>}
    </section>
  );
}

function avg(list: BodyStat[], key: keyof BodyStat) {
  return mean(list.map(s => s[key] as number | null));
}

function Delta({ value, unit, decimals = 1, goodWhen }: { value: number | null; unit: string; decimals?: number; goodWhen?: 'up' | 'down' }) {
  if (value == null) return null;
  const rounded = Number(value.toFixed(decimals));
  const tone = rounded === 0 || !goodWhen ? '' : (rounded > 0) === (goodWhen === 'up') ? 'good' : 'bad';
  return <small className={`delta ${tone}`}>{rounded > 0 ? '+' : ''}{rounded.toFixed(decimals)} {unit}</small>;
}

export function WeeklyCheckin({ stats, profile }: { stats: BodyStat[]; profile: Profile | null }) {
  const today = localDate();
  const week = stats.filter(s => s.date > shiftDate(today, -7) && s.date <= today);
  const prev = stats.filter(s => s.date > shiftDate(today, -14) && s.date <= shiftDate(today, -7));
  const diff = (key: keyof BodyStat) => { const a = avg(week, key), b = avg(prev, key); return a != null && b != null ? a - b : null; };
  const cutting = profile?.current_phase === 'cut', bulking = profile?.current_phase === 'bulk';
  const weightGood = cutting ? 'down' : bulking ? 'up' : undefined;
  const dietAnswered = week.filter(s => s.on_diet != null);
  const kcal = avg(week, 'calories'), protein = avg(week, 'protein_g'), sleep = avg(week, 'sleep_minutes');
  const weight = avg(week, 'weight'), waist = avg(week, 'waist'), steps = avg(week, 'steps');
  const sleepDiff = diff('sleep_minutes');
  const rows: { label: string; value: string; extra: React.ReactNode }[] = [
    { label: 'Peso promedio', value: weight == null ? '—' : `${weight.toFixed(1)} kg`, extra: <Delta value={diff('weight')} unit="kg" decimals={2} goodWhen={weightGood} /> },
    { label: 'Cintura promedio', value: waist == null ? '—' : `${waist.toFixed(1)} cm`, extra: <Delta value={diff('waist')} unit="cm" goodWhen={cutting ? 'down' : undefined} /> },
    { label: 'Calorías', value: kcal == null ? '—' : `${Math.round(kcal).toLocaleString('es-CO')} kcal`, extra: profile?.target_calories ? <small className="delta">objetivo {profile.target_calories.toLocaleString('es-CO')}</small> : null },
    { label: 'Proteína', value: protein == null ? '—' : `${Math.round(protein)} g`, extra: profile?.target_protein ? <small className={`delta ${protein == null ? '' : protein >= profile.target_protein * 0.95 ? 'good' : 'bad'}`}>objetivo {profile.target_protein} g</small> : null },
    { label: 'Pasos', value: steps == null ? '—' : Math.round(steps).toLocaleString('es-CO'), extra: <Delta value={diff('steps')} unit="" decimals={0} goodWhen="up" /> },
    { label: 'Sueño', value: sleep == null ? '—' : `${(sleep / 60).toFixed(1)} h`, extra: <Delta value={sleepDiff == null ? null : sleepDiff / 60} unit="h" goodWhen="up" /> },
    { label: 'Dieta cumplida', value: dietAnswered.length ? `${dietAnswered.filter(s => s.on_diet).length} de ${dietAnswered.length} días` : '—', extra: null },
    { label: 'Días con peso', value: `${week.filter(s => s.weight != null).length} de 7`, extra: null },
  ];
  return (
    <section className="panel weekly">
      <div className="section-heading"><div><h2>Check-in semanal</h2><p className="helper-text">{displayDate(shiftDate(today, -6))} – {displayDate(today)} · cambio frente a los 7 días anteriores</p></div></div>
      <dl className="weekly-list">{rows.map(r => <div key={r.label}><dt>{r.label}</dt><dd>{r.value}{r.extra}</dd></div>)}</dl>
      {!week.length && <p className="helper-text">Sin registros en los últimos 7 días.</p>}
    </section>
  );
}

export { defaultDate };
