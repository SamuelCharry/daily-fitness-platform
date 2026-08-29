import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { Routine } from '../types';

export default function Routines() {
  const { data: routines, error, loading, reload } = useApi(() => api.get<Routine[]>('/api/routines'));
  const [name, setName] = useState('');
  const [creating, setCreating] = useState(false);

  async function createRoutine() {
    if (!name.trim()) return;
    setCreating(true);
    try {
      await api.post('/api/routines', { name: name.trim() });
      setName('');
      reload();
    } finally {
      setCreating(false);
    }
  }

  async function activate(id: number) {
    await api.patch(`/api/routines/${id}/activate`);
    reload();
  }

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Training</span>
          <h1 className="page-title">Routines</h1>
        </div>
      </div>

      <div className="card" style={{ maxWidth: 500 }}>
        <span className="label">New routine</span>
        <div style={{ display: 'flex', gap: 10 }}>
          <input
            type="text"
            placeholder="e.g. Upper/Lower 4x"
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && createRoutine()}
            style={{ flex: 1 }}
          />
          <button className="btn-primary" onClick={createRoutine} disabled={creating || !name.trim()}>
            Add
          </button>
        </div>
      </div>

      {loading && <span className="spinner-text">Loading…</span>}
      {error && <span className="error-text">{error}</span>}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        {routines?.map((r) => (
          <div
            key={r.id}
            className="card"
            style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', padding: '16px 20px' }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <Link to={`/routines/${r.id}`} style={{ font: "500 15px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>
                {r.name}
              </Link>
              <span style={{ font: "400 11.5px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>
                {r.workouts.length} workout{r.workouts.length === 1 ? '' : 's'}
              </span>
            </div>
            {r.is_active ? (
              <span className="chip active">Active</span>
            ) : (
              <button className="btn-ghost" onClick={() => activate(r.id)}>
                Set active
              </button>
            )}
          </div>
        ))}
        {routines?.length === 0 && <span className="spinner-text">No routines yet — add one above.</span>}
      </div>
    </>
  );
}
