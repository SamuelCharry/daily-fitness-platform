import { useEffect, useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { BodyStat, Profile } from '../types';

function average(values: number[]) {
  if (!values.length) return null;
  return Math.round(values.reduce((a, b) => a + b, 0) / values.length);
}

export default function Preparation() {
  const { data: profile, setData: setProfile, loading: profileLoading } = useApi(() =>
    api.get<Profile | null>('/api/profile'),
  );
  const { data: stats, loading: statsLoading } = useApi(() => api.get<BodyStat[]>('/api/body-stats?days=30'));

  const [form, setForm] = useState<Profile>({
    height_cm: null,
    sex: null,
    birthdate: null,
    current_phase: 'maintain',
    phase_start_date: null,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (profile) setForm(profile);
  }, [profile]);

  async function save() {
    setSaving(true);
    setSaved(false);
    try {
      const updated = await api.put<Profile>('/api/profile', form);
      setProfile(updated);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  async function setPhase(phase: string) {
    const next = { ...form, current_phase: phase, phase_start_date: form.phase_start_date ?? new Date().toISOString().slice(0, 10) };
    setForm(next);
    const updated = await api.put<Profile>('/api/profile', next);
    setProfile(updated);
  }

  const latestWeight = stats?.length ? stats[stats.length - 1].weight : null;
  const avgCalories = average((stats || []).map((s) => s.calories).filter((v): v is number => v != null));
  const avgProtein = average((stats || []).map((s) => s.protein_g).filter((v): v is number => v != null));
  const loggedDays = (stats || []).filter((s) => s.weight != null).length;
  const adherence = Math.round((Math.min(loggedDays, 14) / 14) * 100);

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Analysis</span>
          <h1 className="page-title">Preparation</h1>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
          {['cut', 'maintain', 'bulk'].map((p) => (
            <button
              key={p}
              onClick={() => setPhase(p)}
              style={{
                border: 'none',
                background: form.current_phase === p ? 'var(--accent)' : 'transparent',
                color: form.current_phase === p ? 'var(--accent-text)' : '#a9adb1',
                padding: '7px 16px',
                borderRadius: 6,
                font: "600 12px/1 'Inter Tight', sans-serif",
                textTransform: 'capitalize',
              }}
            >
              {p}
            </button>
          ))}
        </div>
      </div>

      {(profileLoading || statsLoading) && <span className="spinner-text">Loading…</span>}

      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16 }}>
        {[
          { label: 'Bodyweight', value: latestWeight != null ? `${latestWeight} kg` : '—' },
          { label: 'Calories', value: avgCalories != null ? `${avgCalories} avg` : '—' },
          { label: 'Protein', value: avgProtein != null ? `${avgProtein} g avg` : '—' },
          { label: 'Adherence (14d)', value: `${adherence}%` },
        ].map((s) => (
          <div key={s.label} className="card" style={{ padding: '18px 20px', gap: 8 }}>
            <span className="label" style={{ fontSize: 10.5 }}>
              {s.label}
            </span>
            <span style={{ font: "500 22px/1 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{s.value}</span>
          </div>
        ))}
      </section>

      <div className="card">
        <span className="label">Profile</span>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, maxWidth: 500 }}>
          <label className="field">
            <span className="label">Height (cm)</span>
            <input
              type="number"
              value={form.height_cm ?? ''}
              onChange={(e) => setForm({ ...form, height_cm: e.target.value ? Number(e.target.value) : null })}
            />
          </label>
          <label className="field">
            <span className="label">Sex</span>
            <select
              value={form.sex ?? ''}
              onChange={(e) => setForm({ ...form, sex: e.target.value || null })}
            >
              <option value="">—</option>
              <option value="male">Male</option>
              <option value="female">Female</option>
            </select>
          </label>
          <label className="field">
            <span className="label">Birthdate</span>
            <input
              type="date"
              value={form.birthdate ?? ''}
              onChange={(e) => setForm({ ...form, birthdate: e.target.value || null })}
            />
          </label>
        </div>
        <div>
          <button className="btn-primary" onClick={save} disabled={saving}>
            {saving ? 'Saving…' : 'Save profile'}
          </button>
          {saved && <span style={{ marginLeft: 12, color: 'var(--text-dim)', fontSize: 12 }}>Saved.</span>}
        </div>
      </div>
    </>
  );
}
