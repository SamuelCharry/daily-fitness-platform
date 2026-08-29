import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useLanguage } from '../i18n/LanguageContext';
import QuickPreferences from '../components/QuickPreferences';

interface NavItem {
  to: string;
  labelKey: string;
}

interface NavGroup {
  headingKey: string;
  to?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { headingKey: 'nav.dashboard', to: '/app', items: [] },
  {
    headingKey: 'nav.training',
    items: [
      { to: '/app/routines', labelKey: 'nav.routines' },
      { to: '/app/exercises', labelKey: 'nav.exercises' },
    ],
  },
  {
    headingKey: 'nav.tracking',
    items: [
      { to: '/app/daily-log', labelKey: 'nav.dailyLog' },
      { to: '/app/history', labelKey: 'nav.history' },
    ],
  },
  { headingKey: 'nav.glossary', to: '/app/glossary', items: [] },
  { headingKey: 'nav.settings', to: '/app/settings', items: [] },
];

function topLinkStyle(active: boolean) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 6,
    font: "500 13px/1 'Inter', sans-serif",
    color: active ? 'var(--text-strong)' : 'var(--nav-inactive)',
    background: active ? 'var(--hover-bg)' : 'transparent',
    whiteSpace: 'nowrap' as const,
  };
}

function NavGroupMenu({
  group,
  open,
  onToggle,
  onClose,
  t,
}: {
  group: NavGroup;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  t: (key: string) => string;
}) {
  const location = useLocation();
  const active = group.items.some((item) => location.pathname === item.to);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        style={{
          ...topLinkStyle(active || open),
          border: 'none',
          background: active || open ? 'var(--hover-bg)' : 'transparent',
          cursor: 'pointer',
        }}
      >
        {t(group.headingKey)}
        <span style={{ fontSize: 9, marginTop: 1, color: 'var(--text-dim)' }}>{open ? '▲' : '▼'}</span>
      </button>

      {open && (
        <div
          style={{
            position: 'absolute',
            top: '110%',
            left: 0,
            minWidth: 180,
            background: 'var(--bg-alt)',
            border: '1px solid var(--border)',
            borderRadius: 8,
            padding: 6,
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
            boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            zIndex: 20,
          }}
        >
          {group.items.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              onClick={onClose}
              style={({ isActive }) => ({
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                padding: '8px 10px',
                borderRadius: 6,
                font: "500 13px/1 'Inter', sans-serif",
                color: isActive ? 'var(--text-strong)' : 'var(--nav-inactive)',
                background: isActive ? 'var(--hover-bg)' : 'transparent',
              })}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flex: 'none', opacity: 0.9 }} />
              {t(item.labelKey)}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();
  const [openGroup, setOpenGroup] = useState<string | null>(null);
  const navRef = useRef<HTMLElement>(null);

  useEffect(() => {
    setOpenGroup(null);
  }, [location.pathname]);

  useEffect(() => {
    function onDocClick(e: MouseEvent) {
      if (navRef.current && !navRef.current.contains(e.target as Node)) {
        setOpenGroup(null);
      }
    }
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', background: 'var(--bg)' }}>
      <header
        ref={navRef}
        style={{
          position: 'sticky',
          top: 0,
          zIndex: 10,
          borderBottom: '1px solid var(--border)',
          background: 'var(--bg-alt)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '10px 28px',
          minHeight: 56,
          flex: 'none',
          flexWrap: 'wrap',
          rowGap: 8,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap', rowGap: 8 }}>
          <Link
            to="/"
            title="Daily Fitness — home"
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 8,
              paddingRight: 20,
              marginRight: 4,
              borderRight: '1px solid var(--border)',
            }}
          >
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

          {NAV_GROUPS.map((group) =>
            group.to ? (
              <NavLink key={group.headingKey} to={group.to} end style={({ isActive }) => topLinkStyle(isActive)}>
                {t(group.headingKey)}
              </NavLink>
            ) : (
              <NavGroupMenu
                key={group.headingKey}
                group={group}
                open={openGroup === group.headingKey}
                onToggle={() => setOpenGroup(openGroup === group.headingKey ? null : group.headingKey)}
                onClose={() => setOpenGroup(null)}
                t={t}
              />
            ),
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <QuickPreferences />
          <span style={{ font: "400 11px/1.4 'Inter', sans-serif", color: 'var(--text-dim)' }}>{user?.email}</span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
            style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}
          >
            {t('nav.logout')}
          </a>
        </div>
      </header>

      <main
        style={{
          padding: '32px 44px 56px',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          maxWidth: 1320,
          width: '100%',
          margin: '0 auto',
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
