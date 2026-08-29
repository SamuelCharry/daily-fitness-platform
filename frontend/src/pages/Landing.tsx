import { Link } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import QuickPreferences from '../components/QuickPreferences';

const DEVELOPER = {
  name: 'Samuel Charry',
  github: 'https://github.com/SamuelCharry',
  linkedin: 'https://www.linkedin.com/in/samuel-charry-1670152b4/',
  email: 'sami.charry27@gmail.com',
};

function FeatureCard({ title, body }: { title: string; body: string }) {
  return (
    <div className="card" style={{ gap: 8 }}>
      <span style={{ font: "500 15px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{title}</span>
      <span style={{ font: "400 13px/1.5 'Inter', sans-serif", color: 'var(--text-muted)' }}>{body}</span>
    </div>
  );
}

export default function Landing() {
  const { user } = useAuth();
  const { t } = useLanguage();

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '18px 28px',
          borderBottom: '1px solid var(--border)',
          flexWrap: 'wrap',
          gap: 12,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />
          <span
            style={{
              font: "600 13px/1 'Inter Tight', sans-serif",
              letterSpacing: '.06em',
              color: 'var(--text-strong)',
              textTransform: 'uppercase',
            }}
          >
            {t('nav.brand')}
          </span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
          <QuickPreferences />
          {user ? (
            <Link to="/app" className="btn-ghost">
              {t('landing.ctaOpenApp')}
            </Link>
          ) : (
            <Link to="/login" className="btn-ghost">
              {t('landing.ctaLogin')}
            </Link>
          )}
        </div>
      </header>

      <main style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 64, padding: '64px 28px 40px', maxWidth: 980, width: '100%', margin: '0 auto' }}>
        <section style={{ display: 'flex', flexDirection: 'column', gap: 20, maxWidth: 640 }}>
          <span className="eyebrow">{t('landing.eyebrow')}</span>
          <h1 style={{ margin: 0, font: "500 44px/1.15 'Inter Tight', sans-serif", color: 'var(--text-strong)', letterSpacing: '-0.01em' }}>
            {t('landing.title1')}
            <br />
            {t('landing.title2')}
          </h1>
          <p style={{ margin: 0, font: "400 15.5px/1.6 'Inter', sans-serif", color: 'var(--text-muted)' }}>{t('landing.subtitle')}</p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginTop: 8 }}>
            <Link to="/app" className="btn-primary">
              {t('landing.ctaOpenApp')}
            </Link>
            <Link to="/glossary" className="btn-ghost">
              {t('landing.ctaGlossary')}
            </Link>
          </div>
          <p className="muted-note" style={{ maxWidth: 480 }}>
            {t('landing.freeNote')}
          </p>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <span className="eyebrow">{t('landing.philosophyEyebrow')}</span>
          <h2 style={{ margin: 0, font: "500 24px/1.3 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>
            {t('landing.philosophyTitle')}
          </h2>
          <p style={{ margin: 0, font: "400 14px/1.65 'Inter', sans-serif", color: 'var(--text-muted)', maxWidth: 720 }}>
            {t('landing.philosophyBody')}
          </p>
        </section>

        <section style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <span className="eyebrow">{t('landing.featuresEyebrow')}</span>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            <FeatureCard title={t('landing.feature1Title')} body={t('landing.feature1Body')} />
            <FeatureCard title={t('landing.feature2Title')} body={t('landing.feature2Body')} />
            <FeatureCard title={t('landing.feature3Title')} body={t('landing.feature3Body')} />
            <FeatureCard title={t('landing.feature4Title')} body={t('landing.feature4Body')} />
          </div>
        </section>
      </main>

      <footer
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: 14,
          padding: '20px 28px',
          borderTop: '1px solid var(--border)',
          flexWrap: 'wrap',
        }}
      >
        <span style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
          {t('landing.footerDeveloped')} {DEVELOPER.name}
        </span>
        <span style={{ display: 'flex', gap: 10 }}>
          <a href={DEVELOPER.github} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
            GitHub
          </a>
          <a href={DEVELOPER.linkedin} target="_blank" rel="noreferrer" style={{ fontSize: 12 }}>
            LinkedIn
          </a>
          <a href={`mailto:${DEVELOPER.email}`} style={{ fontSize: 12 }}>
            Email
          </a>
        </span>
      </footer>
    </div>
  );
}
