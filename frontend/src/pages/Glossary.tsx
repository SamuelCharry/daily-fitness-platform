import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { GLOSSARY } from '../data/glossary';
import GlossaryTermCard from '../components/GlossaryTermCard';
import { buildPersonalizationContext } from '../utils/personalization';
import type { BodyStat, Profile } from '../types';

export default function Glossary() {
  const { data: profile } = useApi(() => api.get<Profile | null>('/api/profile'));
  const { data: stats } = useApi(() => api.get<BodyStat[]>('/api/body-stats?days=60'));

  const ctx = buildPersonalizationContext(profile ?? null, stats || []);

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="eyebrow">Learn</span>
        <h1 className="page-title">Glossary</h1>
        <p style={{ margin: 0, font: "400 13.5px/1.5 'Inter', sans-serif", color: 'var(--text-muted)', maxWidth: 640 }}>
          The concepts behind why this app is built the way it is: every routine, exercise choice, and
          number on your dashboard traces back to one of these ideas. Terms marked "Applied to you" use your own
          logged weight, profile, and intake — log those to unlock them.
        </p>
      </div>

      {GLOSSARY.map((category) => (
        <section key={category.key} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <h2
              style={{
                margin: 0,
                font: "600 13px/1 'Inter Tight', sans-serif",
                letterSpacing: '.04em',
                color: 'var(--text-strong)',
                textTransform: 'uppercase',
              }}
            >
              {category.label}
            </h2>
            <span style={{ font: "400 12.5px/1.4 'Inter', sans-serif", color: 'var(--text-dim)' }}>{category.intro}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 16 }}>
            {category.terms.map((t) => (
              <GlossaryTermCard key={t.term} {...t} ctx={ctx} />
            ))}
          </div>
        </section>
      ))}
    </>
  );
}
