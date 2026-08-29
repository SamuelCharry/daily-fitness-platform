import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Exercise, Routine } from '../types';
import { ROUTINE_TEMPLATES, SESSION_LENGTHS, type SessionLength } from '../data/routineTemplates';
import { buildWorkoutsFromTemplate } from '../utils/templateBuilder';

export default function TemplatePicker({ onCreated }: { onCreated: () => void }) {
  const navigate = useNavigate();
  const { data: exercises } = useApi(() => api.get<Exercise[]>('/api/exercises'));
  const [minutes, setMinutes] = useState<SessionLength>(60);
  const [busyKey, setBusyKey] = useState<string | null>(null);

  const templates = [...ROUTINE_TEMPLATES].sort((a, b) => a.rank - b.rank);

  async function useTemplate(templateKey: (typeof ROUTINE_TEMPLATES)[number]['key']) {
    const template = ROUTINE_TEMPLATES.find((t) => t.key === templateKey)!;
    if (!exercises) return;
    setBusyKey(templateKey);
    try {
      const routine = await api.post<Routine>('/api/routines', { name: template.label });
      const workouts = buildWorkoutsFromTemplate(template, minutes, exercises);
      for (let i = 0; i < workouts.length; i++) {
        await api.post(`/api/routines/${routine.id}/workouts`, workouts[i]);
      }
      onCreated();
      navigate(`/app/routines/${routine.id}`);
    } finally {
      setBusyKey(null);
    }
  }

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <span className="label">Start from a template</span>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <span style={{ font: "400 11px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>Time per session</span>
          <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
            {SESSION_LENGTHS.map((m) => (
              <button
                key={m}
                onClick={() => setMinutes(m)}
                style={{
                  border: 'none',
                  background: minutes === m ? 'var(--accent)' : 'transparent',
                  color: minutes === m ? 'var(--accent-text)' : 'var(--nav-inactive)',
                  padding: '6px 12px',
                  borderRadius: 6,
                  font: "600 12px/1 'Inter Tight', sans-serif",
                }}
              >
                {m}m
              </button>
            ))}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 12 }}>
        {templates.map((tpl) => (
          <div
            key={tpl.key}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 10,
              padding: '16px 18px',
              borderRadius: 10,
              border: tpl.rank === 1 ? '1px solid var(--accent)' : '1px solid var(--border)',
              background: 'var(--bg-raised)',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ font: "600 14.5px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{tpl.label}</span>
              {tpl.rank === 1 && (
                <span style={{ font: "700 9.5px/1 'Inter Tight', sans-serif", color: 'var(--accent)', letterSpacing: '.04em' }}>
                  RECOMMENDED
                </span>
              )}
            </div>
            <span style={{ font: "400 11.5px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
              {tpl.daysPerWeek} days/week · ~{tpl.frequencyPerMuscle}x/week per muscle
            </span>
            <p style={{ margin: 0, font: "400 12.5px/1.5 'Inter', sans-serif", color: 'var(--text-muted)' }}>{tpl.rationale}</p>
            <span style={{ font: "400 11px/1.4 'Inter', sans-serif", color: 'var(--text-dim)' }}>
              {tpl.days.map((d) => d.name).join(' · ')}
            </span>
            <button
              className={tpl.rank === 1 ? 'btn-primary' : 'btn-ghost'}
              onClick={() => useTemplate(tpl.key)}
              disabled={busyKey !== null || !exercises}
              style={{ marginTop: 'auto' }}
            >
              {busyKey === tpl.key ? 'Creating…' : `Use ${tpl.label}`}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
