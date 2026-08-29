import { useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { BodyStat, DashboardData, Profile } from '../types';
import MetricTrendCard from '../components/MetricTrendCard';
import { classifyFFMI } from '../utils/ffmi';
import { useLanguage } from '../i18n/LanguageContext';
import Preparation from './Preparation';
import StrengthMap from './StrengthMap';

type Tab = 'overview' | 'preparation' | 'strengthMap';

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card" style={{ padding: '20px 22px', gap: 10 }}>
      <span className="label">{label}</span>
      <span style={{ font: "500 28px/1 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{value}</span>
    </div>
  );
}

function fmtSleep(minutes: number | null) {
  if (minutes == null) return '—';
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

function fmtSteps(steps: number | null) {
  if (steps == null) return '—';
  return steps >= 1000 ? `${(steps / 1000).toFixed(1)}k` : String(steps);
}

function OverviewTab() {
  const { t } = useLanguage();
  const { data, error, loading } = useApi(() => api.get<DashboardData>('/api/dashboard'));
  const { data: history } = useApi(() => api.get<BodyStat[]>('/api/body-stats?days=3650'));
  const { data: profile } = useApi(() => api.get<Profile | null>('/api/profile'));

  if (loading) return <span className="spinner-text">Loading…</span>;
  if (error) return <span className="error-text">{error}</span>;
  if (!data) return null;

  return (
    <>
      <section style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16 }}>
        <StatCard label={t('dashboard.weight')} value={data.weight != null ? `${data.weight} kg` : '—'} />
        <StatCard label={t('dashboard.sleep')} value={fmtSleep(data.sleep_minutes)} />
        <StatCard label={t('dashboard.steps')} value={fmtSteps(data.steps)} />
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1.65fr 1fr', gap: 16 }}>
        <MetricTrendCard stats={history || []} />

        <div className="card">
          <span className="label">{t('dashboard.todaysTraining')}</span>
          {data.today_workout ? (
            <>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ font: "500 20px/1.2 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>
                  {data.today_workout.name}
                </span>
                <span style={{ font: "400 13px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>
                  {data.today_workout.exercise_count} exercises · {data.today_workout.routine_name}
                </span>
              </div>
              <Link
                to={`/app/session/${data.today_workout.id}`}
                className="btn-primary"
                style={{ marginTop: 'auto', textAlign: 'center' }}
              >
                {t('dashboard.startWorkout')}
              </Link>
            </>
          ) : (
            <>
              <span style={{ font: "400 13px/1.4 'Inter', sans-serif", color: 'var(--text-muted)' }}>
                {t('dashboard.noRoutine')}
              </span>
              <Link to="/app/routines" className="btn-ghost" style={{ marginTop: 'auto', textAlign: 'center' }}>
                {t('dashboard.setUpRoutine')}
              </Link>
            </>
          )}
        </div>
      </section>

      <section style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>
        <div className="card">
          <span className="label">{t('dashboard.performance')}</span>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {data.performance.map((r) => (
              <div
                key={r.label}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  paddingBottom: 12,
                  borderBottom: '1px solid var(--border)',
                }}
              >
                <span style={{ font: "400 13.5px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>{r.label}</span>
                <span style={{ font: "600 14px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>{r.trend}</span>
              </div>
            ))}
          </div>
        </div>

        <div className="card">
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
            <span className="label">{t('dashboard.tabPreparation')}</span>
            <span style={{ font: "400 11px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>{t('dashboard.bodyFatEstimate')}</span>
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12 }}>
            {[
              { name: 'Deurenberg', value: data.body_fat_methods.deurenberg },
              { name: 'Navy', value: data.body_fat_methods.navy },
              { name: 'InBody', value: data.body_fat_methods.inbody },
            ].map((b) => (
              <div key={b.name} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span
                  style={{
                    font: "400 10.5px/1 'Inter', sans-serif",
                    color: 'var(--text-dim)',
                    textTransform: 'uppercase',
                    letterSpacing: '.04em',
                  }}
                >
                  {b.name}
                </span>
                <span style={{ font: "500 18px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>
                  {b.value != null ? `${b.value}%` : '—'}
                </span>
              </div>
            ))}
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginTop: 4 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                paddingBottom: 12,
                borderBottom: '1px solid var(--border)',
              }}
            >
              <span style={{ font: "400 13.5px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>{t('dashboard.adherence')}</span>
              <span style={{ font: "600 14px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>
                {data.adherence_pct}%
              </span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <span style={{ font: "400 13.5px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>
                FFMI{' '}
                <Link to="/app/glossary" style={{ color: 'var(--text-dim)', fontSize: 11 }}>
                  {t('dashboard.ffmiWhatsThis')}
                </Link>
              </span>
              <span style={{ font: "600 14px/1 'Inter Tight', sans-serif", color: 'var(--text)', textAlign: 'right' }}>
                {data.ffmi != null ? (
                  <>
                    {data.ffmi}{' '}
                    <span style={{ font: "400 11px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
                      · {classifyFFMI(data.ffmi, profile?.sex === 'female' ? 'female' : 'male')}
                    </span>
                  </>
                ) : (
                  '—'
                )}
              </span>
            </div>
          </div>
        </div>
      </section>
    </>
  );
}

export default function Dashboard() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('overview');

  const TABS: { key: Tab; labelKey: string }[] = [
    { key: 'overview', labelKey: 'dashboard.tabOverview' },
    { key: 'preparation', labelKey: 'dashboard.tabPreparation' },
    { key: 'strengthMap', labelKey: 'dashboard.tabStrengthMap' },
  ];

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
        <h1 className="page-title">{t('dashboard.title')}</h1>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
          {TABS.map((tb) => (
            <button
              key={tb.key}
              onClick={() => setTab(tb.key)}
              style={{
                border: 'none',
                background: tab === tb.key ? 'var(--accent)' : 'transparent',
                color: tab === tb.key ? 'var(--accent-text)' : 'var(--nav-inactive)',
                padding: '7px 16px',
                borderRadius: 6,
                font: "600 12px/1 'Inter Tight', sans-serif",
              }}
            >
              {t(tb.labelKey)}
            </button>
          ))}
        </div>
      </div>

      {tab === 'overview' && <OverviewTab />}
      {tab === 'preparation' && <Preparation />}
      {tab === 'strengthMap' && <StrengthMap />}
    </>
  );
}
