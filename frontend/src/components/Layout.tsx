import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

interface NavItem {
  to: string;
  label: string;
}

interface NavGroup {
  heading: string;
  to?: string;
  items: NavItem[];
}

const NAV_GROUPS: NavGroup[] = [
  { heading: 'Dashboard', to: '/', items: [] },
  {
    heading: 'Training',
    items: [
      { to: '/routines', label: 'Routines' },
      { to: '/exercises', label: 'Exercises' },
    ],
  },
  {
    heading: 'Tracking',
    items: [{ to: '/daily-log', label: 'Daily Log' }],
  },
  {
    heading: 'Analysis',
    items: [
      { to: '/preparation', label: 'Preparation' },
      { to: '/strength-map', label: 'Strength Map' },
    ],
  },
  { heading: 'Glossary', to: '/glossary', items: [] },
];

function topLinkStyle(active: boolean) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 6,
    padding: '8px 12px',
    borderRadius: 6,
    font: "500 13px/1 'Inter', sans-serif",
    color: active ? 'var(--text-strong)' : '#a8a8aa',
    background: active ? '#1f1f21' : 'transparent',
    whiteSpace: 'nowrap' as const,
  };
}

function NavGroupMenu({ group, open, onToggle, onClose }: { group: NavGroup; open: boolean; onToggle: () => void; onClose: () => void }) {
  const location = useLocation();
  const active = group.items.some((item) => location.pathname === item.to);

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={onToggle}
        style={{
          ...topLinkStyle(active || open),
          border: 'none',
          background: active || open ? '#1f1f21' : 'transparent',
          cursor: 'pointer',
        }}
      >
        {group.heading}
        <span style={{ fontSize: 9, marginTop: 1, color: '#6e6e70' }}>{open ? '▲' : '▼'}</span>
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
                color: isActive ? 'var(--text-strong)' : '#a8a8aa',
                background: isActive ? '#262627' : 'transparent',
              })}
            >
              <span style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--accent)', flex: 'none', opacity: 0.9 }} />
              {item.label}
            </NavLink>
          ))}
        </div>
      )}
    </div>
  );
}

export default function Layout() {
  const { user, logout } = useAuth();
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
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingRight: 20, marginRight: 4, borderRight: '1px solid var(--border)' }}>
            <div style={{ width: 8, height: 8, borderRadius: 2, background: 'var(--accent)' }} />
            <span
              style={{
                font: "600 12px/1 'Inter Tight', sans-serif",
                letterSpacing: '.06em',
                color: 'var(--text-strong)',
                textTransform: 'uppercase',
              }}
            >
              Daily Fitness
            </span>
          </div>

          {NAV_GROUPS.map((group) =>
            group.to ? (
              <NavLink key={group.heading} to={group.to} end style={({ isActive }) => topLinkStyle(isActive)}>
                {group.heading}
              </NavLink>
            ) : (
              <NavGroupMenu
                key={group.heading}
                group={group}
                open={openGroup === group.heading}
                onToggle={() => setOpenGroup(openGroup === group.heading ? null : group.heading)}
                onClose={() => setOpenGroup(null)}
              />
            ),
          )}
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
          <span style={{ font: "400 11px/1.4 'Inter', sans-serif", color: 'var(--text-dim)' }}>{user?.email}</span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
            style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}
          >
            Log out
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
