import { useEffect, useRef, useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth/AuthContext';
import type { BodyStat } from '../types';
import { displayDate, downloadCSV, localDate, shiftDate } from '../utils/journal';

type Column = { key: keyof BodyStat; label: string; max?: number; integer?: boolean };
const columns: Column[] = [
  { key: 'weight', label: 'Peso · kg', max: 500 },
  { key: 'calories', label: 'Energía · kcal', max: 20000 },
  { key: 'protein_g', label: 'Proteína · g', max: 2000 },
  { key: 'carbs_g', label: 'Carbos · g', max: 5000 },
  { key: 'fat_g', label: 'Grasas · g', max: 2000 },
  { key: 'steps', label: 'Pasos', max: 200000, integer: true },
  { key: 'sleep_minutes', label: 'Sueño · min', max: 1440, integer: true },
  { key: 'cardio_minutes', label: 'Cardio · min', max: 1440, integer: true },
  { key: 'waist', label: 'Cintura · cm', max: 500 },
  { key: 'neck', label: 'Cuello · cm', max: 500 },
  { key: 'hip', label: 'Cadera · cm', max: 500 },
  { key: 'body_fat_manual', label: 'Grasa · %', max: 99.9 },
  { key: 'notes', label: 'Notas' },
];

export default function DailyLog() {
  const { user } = useAuth();
  const storageKey = `cfts-journal-drafts-${user?.id}`;
  const { data, error, loading, reload } = useApi(() => api.get<BodyStat[]>('/api/body-stats?days=36500'));
  const [end, setEnd] = useState(localDate());
  const [length, setLength] = useState(14);
  const [drafts, setDrafts] = useState<Record<string, Record<string, string>>>(() => {
    try { return JSON.parse(sessionStorage.getItem(storageKey) || '{}'); } catch { return {}; }
  });
  useEffect(() => { sessionStorage.setItem(storageKey, JSON.stringify(drafts)); }, [drafts, storageKey]);
  const [saving, setSaving] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const dirty = Object.keys(drafts).length;
  const currentDrafts = useRef(drafts);
  useEffect(() => { currentDrafts.current = drafts; }, [drafts]);
  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => { if (Object.keys(currentDrafts.current).length) event.preventDefault(); };
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, []);
  const dates = Array.from({ length }, (_, i) => shiftDate(end, -i));
  const records = new Map((data || []).map(s => [s.date, s]));
  function value(date: string, key: keyof BodyStat) {
    return drafts[date]?.[key] ?? String(records.get(date)?.[key] ?? '');
  }
  function edit(date: string, key: keyof BodyStat, text: string) {
    setMessage('');
    setDrafts(old => ({ ...old, [date]: { ...old[date], [key]: text } }));
  }
  function pasteCells(event: React.ClipboardEvent<HTMLInputElement>, row: number, column: number) {
    const text = event.clipboardData.getData('text/plain');
    if (!text.includes('\t') && !text.includes('\n')) return;
    event.preventDefault();
    const grid = text.replaceAll('\r', '').trimEnd().split('\n').map(line => line.split('\t'));
    setDrafts(old => {
      const next = { ...old };
      grid.forEach((cells, dy) => {
        const date = dates[row + dy];
        if (!date) return;
        next[date] = { ...next[date] };
        cells.forEach((cell, dx) => { const col = columns[column + dx]; if (col) next[date][col.key] = cell.trim(); });
      });
      return next;
    });
    setMessage('Celdas pegadas. Revisa los valores y pulsa Guardar.');
  }
  async function saveRow(date: string) {
    const changes = drafts[date];
    if (!changes) return;
    const body: Record<string, unknown> = { date };
    for (const [key, raw] of Object.entries(changes)) {
      if (key === 'notes') { body[key] = raw || null; continue; }
      const c = columns.find(col => col.key === key)!;
      const n = raw.trim() === '' ? null : Number(raw.replace(',', '.'));
      if (n != null && (!Number.isFinite(n) || n < 0 || (c.max != null && n > c.max) || (c.integer && !Number.isInteger(n)) || (key === 'weight' && n <= 0))) throw new Error(`${c.label}: revisa el valor del ${displayDate(date)}.`);
      body[key] = n;
    }
    await api.post('/api/body-stats', body);
    setDrafts(old => { const next = { ...old }; delete next[date]; return next; });
  }
  async function save(date?: string) {
    setSaving(date || 'all'); setMessage('');
    try {
      for (const d of date ? [date] : Object.keys(drafts)) await saveRow(d);
      reload(); setMessage('Guardado. Tus datos están en el servidor.');
    } catch (err) {
      reload(); setMessage(err instanceof Error ? err.message : 'No se pudo guardar. Intenta de nuevo.');
    } finally { setSaving(null); }
  }
  function exportCSV() {
    downloadCSV('cool-for-the-summer-bitacora.csv', [['Fecha', ...columns.map(c => c.label)], ...(data || []).map(s => [s.date, ...columns.map(c => s[c.key])])]);
  }
  return <>
    <div className="page-heading"><div><h1>Bitácora diaria</h1><p>Tu hoja de siempre, con todo tu progreso conectado.</p></div><button className="btn-ghost" onClick={exportCSV} disabled={!data?.length}>Exportar CSV</button></div>
    <div className="journal-toolbar"><div><label>Hasta <input type="date" value={end} max={localDate()} onChange={e => e.target.value && setEnd(e.target.value)} /></label><label>Mostrar <select value={length} onChange={e => setLength(Number(e.target.value))}><option value={7}>7 días</option><option value={14}>14 días</option><option value={30}>30 días</option><option value={90}>90 días</option></select></label></div><button className="btn-primary" disabled={!dirty || !!saving || loading || !!error} onClick={() => save()}>{saving ? 'Guardando…' : dirty ? `Guardar ${dirty} ${dirty === 1 ? 'fila' : 'filas'}` : 'Todo guardado'}</button></div>
    <p className="helper-text">Escribe en una celda, avanza con Tab o pega un bloque desde Excel. Las celdas vacías no cuentan como cero. Puedes editar fechas anteriores. Desliza para ver todas las columnas.</p>
    {error && <div className="error-banner" role="alert">No se pudo cargar la bitácora: {error} <button onClick={reload}>Reintentar</button></div>}
    {loading && <p role="status">Cargando registros…</p>}
    {message && <p className="save-message" role="status">{message}</p>}
    <div className="sheet-scroll" role="region" aria-label="Registro diario editable" tabIndex={0}><table className="journal-sheet"><thead><tr><th scope="col">Fecha</th>{columns.map(c => <th scope="col" key={c.key}>{c.label}</th>)}<th scope="col">Estado</th></tr></thead><tbody>{dates.map((date, row) => <tr key={date} className={date === localDate() ? 'today-row' : ''}><th scope="row">{displayDate(date)}{date === localDate() && <small>Hoy</small>}</th>{columns.map((c, column) => <td key={c.key}><input aria-label={`${c.label}, ${date}`} inputMode={c.key === 'notes' ? 'text' : 'decimal'} value={value(date, c.key)} placeholder="—" disabled={!!saving || loading || !!error} onChange={e => edit(date, c.key, e.target.value)} onPaste={e => pasteCells(e, row, column)} /></td>)}<td>{drafts[date] ? <button className="row-save" disabled={!!saving} onClick={() => save(date)}>Guardar</button> : <span className="row-status">{records.has(date) ? 'Guardado' : 'Sin registro'}</span>}</td></tr>)}</tbody></table></div>
    <div className="journal-foot"><span>{data?.length || 0} días registrados en total</span><span>{dirty ? `${dirty} filas pendientes de guardar` : 'Los cambios se guardan al pulsar Guardar'}</span></div>
  </>;
}
