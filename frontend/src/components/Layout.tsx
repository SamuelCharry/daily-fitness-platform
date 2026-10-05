import { Link, NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { useTheme } from '../theme/ThemeContext';

const navigation = [
  ['/app', 'Mi resumen', 'overview'],
  ['/app/checkin', 'Check-in diario', 'table'],
  ['/app/routines', 'Entrenamientos', 'training'],
  ['/app/history', 'Historial', 'history'],
  ['/app/notes', 'Mis notas', 'book'],
] as const;

export function Icon({ name }: { name: string }) {
  const paths: Record<string, string> = {
    overview: 'M3 3h7v7H3z M14 3h7v7h-7z M3 14h7v7H3z M14 14h7v7h-7z',
    table: 'M3 4h18v16H3z M3 9h18 M3 14h18 M9 4v16 M15 4v16',
    training: 'M7 5v14 M3 8v8 M17 5v14 M21 8v8 M7 12h10',
    target: 'M12 3a9 9 0 1 0 9 9 M12 7a5 5 0 1 0 5 5 M12 12l8-8 M16 4h4v4',
    history: 'M3 11a9 9 0 1 1 2 7 M3 4v7h7 M12 7v5l3 2',
    book: 'M12 5v16 M3 3h5a4 4 0 0 1 4 2 4 4 0 0 1 4-2h5v16h-5a4 4 0 0 0-4 2 4 4 0 0 0-4-2H3z',
    settings: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v3 M12 19v3 M2 12h3 M19 12h3 M5 5l2 2 M17 17l2 2 M5 19l2-2 M17 7l2-2',
    sun: 'M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8 M12 2v2 M12 20v2 M2 12h2 M20 12h2 M5 5l1.5 1.5 M17.5 17.5L19 19 M5 19l1.5-1.5 M17.5 6.5L19 5',
  };
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d={paths[name] || paths.overview} /></svg>;
}

export default function Layout() {
  const { personalMode, logout } = useAuth();
  const { mode, setMode } = useTheme();
  return (
    <div className="app-shell">
      <aside className="sidebar">
        <Link className="brand" to="/app"><span className="brand-symbol"><Icon name="sun" /></span><span>cool for<br /><strong>the summer</strong></span></Link>
        <nav aria-label="Navegación principal">{navigation.map(([to, label, icon]) => <NavLink end={to === '/app'} key={to} to={to} className={({ isActive }) => `nav-item ${isActive ? 'selected' : ''}`}><Icon name={icon} /><span>{label}</span></NavLink>)}</nav>
        <div className="sidebar-bottom">
          <NavLink to="/app/exercises" className="nav-item"><Icon name="training" />Biblioteca de ejercicios</NavLink>
          <NavLink to="/app/settings" className="nav-item"><Icon name="settings" />Preferencias</NavLink>
        </div>
      </aside>
      <div className="workspace">
        <header className="workspace-header"><Link className="notes-header-link" to="/app/notes"><Icon name="book" /><span>Mis notas</span></Link><div><button className="quiet-button" onClick={() => setMode(mode === 'dark' ? 'light' : 'dark')} aria-label="Cambiar entre tema claro y oscuro"><Icon name="sun" /></button>{!personalMode && <button className="quiet-button" onClick={logout}>Salir</button>}<Link className="user-avatar" to="/app/settings" aria-label="Abrir mi espacio y preferencias">Yo</Link></div></header>
        <main className="workspace-main"><Outlet /></main>
      </div>
    </div>
  );
}
