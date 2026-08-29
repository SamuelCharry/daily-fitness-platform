import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import { useAuth } from '../auth/AuthContext';
import { GLOSSARY } from '../data/glossary';
import GlossaryTermCard from '../components/GlossaryTermCard';
import { buildPersonalizationContext } from '../utils/personalization';
import type { BodyStat, Profile } from '../types';
import { useLanguage } from '../i18n/LanguageContext';
import QuickPreferences from '../components/QuickPreferences';

export default function Glossary({ standalone = false }: { standalone?: boolean }) {
  const { user } = useAuth();
  const { t } = useLanguage();
  const { data: profile } = useApi(() => (user ? api.get<Profile | null>('/api/profile') : Promise.resolve(null)), [user]);
  const { data: stats } = useApi(() => (user ? api.get<BodyStat[]>('/api/body-stats?days=60') : Promise.resolve([])), [user]);

  const ctx = buildPersonalizationContext(profile ?? null, stats || []);

  return (
    <>
      {standalone && (
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Link to="/" style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />
            <span
              style={{
                font: "600 12px/1 'Inter Tight', sans-serif",
                letterSpacing: '.06em',
                color: 'var(--text-strong)',
                textTransform: 'uppercase',
              }}
            >
              {t('nav.brand')}
            </span>
          </Link>
          <QuickPreferences />
        </div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="eyebrow">{t('pages.learn')}</span>
        <h1 className="page-title">{t('pages.glossary')}</h1>
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
