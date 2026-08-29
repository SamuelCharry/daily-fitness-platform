import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';

const NAV_GROUPS: { heading: string; items: { to: string; label: string }[] }[] = [
  { heading: '', items: [{ to: '/', label: 'Dashboard' }] },
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
];

function navLinkStyle(active: boolean) {
  return {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
    padding: '9px 10px',
    borderRadius: 6,
    font: "500 13px/1 'Inter', sans-serif",
    color: active ? 'var(--text-strong)' : '#a9adb1',
    background: active ? '#1e2124' : 'transparent',
  };
}

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'grid',
        gridTemplateColumns: '240px 1fr',
        background: 'var(--bg)',
      }}
    >
      <aside
        style={{
          borderRight: '1px solid var(--border)',
          padding: '24px 16px',
          display: 'flex',
          flexDirection: 'column',
          gap: 26,
          overflowY: 'auto',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '0 8px' }}>
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

        {NAV_GROUPS.map((group) => (
          <div key={group.heading} style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            {group.heading && (
              <span
                style={{
                  font: "600 10px/1 'Inter', sans-serif",
                  letterSpacing: '.08em',
                  color: '#5f6469',
                  padding: '6px 10px 4px',
                  textTransform: 'uppercase',
                }}
              >
                {group.heading}
              </span>
            )}
            {group.items.map((item) => (
              <NavLink key={item.to} to={item.to} end={item.to === '/'} style={({ isActive }) => navLinkStyle(isActive)}>
                <span
                  style={{
                    width: 5,
                    height: 5,
                    borderRadius: '50%',
                    background: 'var(--accent)',
                    flex: 'none',
                    opacity: 0.9,
                  }}
                />
                {item.label}
              </NavLink>
            ))}
          </div>
        ))}

        <div style={{ marginTop: 'auto', padding: '0 8px', display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span style={{ font: "400 11px/1.4 'Inter', sans-serif", color: 'var(--text-dim)' }}>{user?.email}</span>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              logout();
            }}
            style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)', padding: '4px 2px' }}
          >
            Log out
          </a>
        </div>
      </aside>

      <main
        style={{
          padding: '32px 44px 56px',
          display: 'flex',
          flexDirection: 'column',
          gap: 32,
          maxWidth: 1320,
          overflowY: 'auto',
        }}
      >
        <Outlet />
      </main>
    </div>
  );
}
