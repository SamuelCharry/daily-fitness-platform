import type { ReactNode } from 'react';
import { useAuth } from '../auth/AuthContext';
import { useTheme, type ThemeMode } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/translations';

function SectionCard({ label, hint, children }: { label: string; hint?: string; children: ReactNode }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span className="label">{label}</span>
        {hint && <span style={{ font: "400 12px/1.4 'Inter', sans-serif", color: 'var(--text-dim)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  );
}

function IntegrationRow({ name, desc, comingSoon }: { name: string; desc: string; comingSoon: string }) {
  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        gap: 16,
        padding: '12px 0',
        borderBottom: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
        <span style={{ font: "500 14px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{name}</span>
        <span style={{ font: "400 12px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>{desc}</span>
      </div>
      <button className="btn-ghost" disabled style={{ opacity: 0.55, cursor: 'default', whiteSpace: 'nowrap' }}>
        {comingSoon}
      </button>
    </div>
  );
}

export default function Settings() {
  const { user, logout } = useAuth();
  const { mode, setMode } = useTheme();
  const { lang, setLang, t } = useLanguage();

  return (
    <>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span className="eyebrow">{t('settings.eyebrow')}</span>
        <h1 className="page-title">{t('settings.title')}</h1>
      </div>

      <SectionCard label={t('settings.account')}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ font: "400 13.5px/1.4 'Inter', sans-serif", color: 'var(--text-body)' }}>
            {t('settings.loggedInAs')} <b style={{ color: 'var(--text-strong)' }}>{user?.email}</b>
          </span>
          <button className="btn-ghost" onClick={logout}>
            {t('settings.logout')}
          </button>
        </div>
      </SectionCard>

      <SectionCard label={t('settings.appearance')} hint={t('settings.appearanceHint')}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, alignSelf: 'flex-start' }}>
          {([
            ['system', t('settings.themeSystem')],
            ['light', t('settings.themeLight')],
            ['dark', t('settings.themeDark')],
          ] as [ThemeMode, string][]).map(([m, label]) => (
            <button
              key={m}
              onClick={() => setMode(m)}
              style={{
                border: 'none',
                background: mode === m ? 'var(--accent)' : 'transparent',
                color: mode === m ? 'var(--accent-text)' : 'var(--nav-inactive)',
                padding: '7px 16px',
                borderRadius: 6,
                font: "600 12px/1 'Inter Tight', sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard label={t('settings.language')} hint={t('settings.languageHint')}>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, alignSelf: 'flex-start' }}>
          {([
            ['en', 'English'],
            ['es', 'Español'],
          ] as [Lang, string][]).map(([l, label]) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              style={{
                border: 'none',
                background: lang === l ? 'var(--accent)' : 'transparent',
                color: lang === l ? 'var(--accent-text)' : 'var(--nav-inactive)',
                padding: '7px 16px',
                borderRadius: 6,
                font: "600 12px/1 'Inter Tight', sans-serif",
              }}
            >
              {label}
            </button>
          ))}
        </div>
      </SectionCard>

      <SectionCard label={t('settings.integrations')} hint={t('settings.integrationsHint')}>
        <div>
          <IntegrationRow name="MyFitnessPal" desc={t('settings.mfpDesc')} comingSoon={t('settings.integrationComingSoon')} />
          <IntegrationRow name="MacroFactor" desc={t('settings.macrofactorDesc')} comingSoon={t('settings.integrationComingSoon')} />
          <IntegrationRow name="Apple Health" desc={t('settings.appleHealthDesc')} comingSoon={t('settings.integrationComingSoon')} />
          <IntegrationRow name="Google Health Connect" desc={t('settings.googleFitDesc')} comingSoon={t('settings.integrationComingSoon')} />
        </div>
      </SectionCard>
    </>
  );
}
