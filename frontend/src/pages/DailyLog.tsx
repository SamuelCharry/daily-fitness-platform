import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { BodyStat } from '../types';

const today = new Date().toISOString().slice(0, 10);

type FormState = {
  weight: string;
  waist: string;
  neck: string;
  hip: string;
  body_fat_manual: string;
  calories: string;
  protein_g: string;
  carbs_g: string;
  fat_g: string;
  sleep_minutes: string;
  steps: string;
  cardio_minutes: string;
  notes: string;
};

const EMPTY: FormState = {
  weight: '',
  waist: '',
  neck: '',
  hip: '',
  body_fat_manual: '',
  calories: '',
  protein_g: '',
  carbs_g: '',
  fat_g: '',
  sleep_minutes: '',
  steps: '',
  cardio_minutes: '',
  notes: '',
};

function toForm(stat: BodyStat | undefined): FormState {
  if (!stat) return EMPTY;
  const f: Record<string, string> = {};
  (Object.keys(EMPTY) as (keyof FormState)[]).forEach((k) => {
    const v = (stat as unknown as Record<string, unknown>)[k];
    f[k] = v == null ? '' : String(v);
  });
  return f as unknown as FormState;
}

export default function DailyLog() {
  const { data: recent, loading, reload } = useApi(() => api.get<BodyStat[]>('/api/body-stats?days=1'));
  const [form, setForm] = useState<FormState>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const existing = recent?.find((s) => s.date === today);
    setForm(toForm(existing));
  }, [recent]);

  function field(key: keyof FormState, label: string, type: string = 'text') {
    return (
      <label className="field">
        <span className="label">{label}</span>
        <input
          type={type}
          value={form[key]}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
        />
      </label>
    );
  }

  const calculatedCalories =
    form.protein_g || form.carbs_g || form.fat_g
      ? Math.round((Number(form.protein_g) || 0) * 4 + (Number(form.carbs_g) || 0) * 4 + (Number(form.fat_g) || 0) * 9)
      : null;

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const num = (v: string) => (v.trim() === '' ? null : Number(v));
      await api.post('/api/body-stats', {
        date: today,
        weight: num(form.weight),
        waist: num(form.waist),
        neck: num(form.neck),
        hip: num(form.hip),
        body_fat_manual: num(form.body_fat_manual),
        calories: num(form.calories),
        protein_g: num(form.protein_g),
        carbs_g: num(form.carbs_g),
        fat_g: num(form.fat_g),
        sleep_minutes: num(form.sleep_minutes),
        steps: num(form.steps),
        cardio_minutes: num(form.cardio_minutes),
        notes: form.notes || null,
      });
      setSaved(true);
      reload();
    } finally {
      setSaving(false);
    }
  }

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="eyebrow">Tracking</span>
        <h1 className="page-title">
          Daily Log —{' '}
          {new Date(today + 'T00:00:00').toLocaleDateString(undefined, { month: 'long', day: 'numeric' })}
        </h1>
      </div>

      {loading && <span className="spinner-text">Loading…</span>}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, maxWidth: 900 }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          {field('weight', 'Weight (kg)', 'number')}
          {field('waist', 'Waist (cm)', 'number')}
          {field('neck', 'Neck (cm)', 'number')}
          {field('hip', 'Hip (cm)', 'number')}
          {field('body_fat_manual', 'Body fat % (InBody / manual scan)', 'number')}
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label className="field">
            <span className="label">Calories</span>
            <input
              type="number"
              value={form.calories}
              onChange={(e) => setForm({ ...form, calories: e.target.value })}
            />
            {calculatedCalories != null && (
              <span style={{ font: "400 11.5px/1.4 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                ≈ {calculatedCalories} kcal from the macros below.{' '}
                <a
                  href="#"
                  onClick={(e) => {
                    e.preventDefault();
                    setForm((f) => ({ ...f, calories: String(calculatedCalories) }));
                  }}
                >
                  Use this
                </a>
              </span>
            )}
          </label>
          {field('protein_g', 'Protein (g)', 'number')}
          {field('carbs_g', 'Carbs (g)', 'number')}
          {field('fat_g', 'Fat (g)', 'number')}
          {field('sleep_minutes', 'Sleep (minutes)', 'number')}
          {field('steps', 'Steps', 'number')}
          {field('cardio_minutes', 'Cardio (minutes)', 'number')}
        </div>
      </div>

      <label className="field" style={{ maxWidth: 900 }}>
        <span className="label">Notes</span>
        <textarea
          rows={3}
          value={form.notes}
          onChange={(e) => setForm({ ...form, notes: e.target.value })}
          style={{ resize: 'none' }}
        />
      </label>

      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button className="btn-primary" style={{ alignSelf: 'flex-start' }} onClick={save} disabled={saving}>
          {saving ? 'Saving…' : 'Save'}
        </button>
        {saved && <span style={{ color: 'var(--text-dim)', fontSize: 12 }}>Saved.</span>}
      </div>
    </>
  );
}
