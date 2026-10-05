import type { ReactNode } from 'react';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Routines from './pages/Routines';
import RoutineDetail from './pages/RoutineDetail';
import Exercises from './pages/Exercises';
import Session from './pages/Session';
import Glossary from './pages/Glossary';
import History from './pages/History';
import ExerciseProgress from './pages/ExerciseProgress';
import Settings from './pages/Settings';
import Checkin from './pages/Checkin';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <span className="spinner-text">Loading…</span>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/app" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Navigate to="/app" replace />} />
              <Route
                path="/glossary"
                element={
                  <div style={{ padding: '32px 44px 56px', maxWidth: 1320, margin: '0 auto', display: 'flex', flexDirection: 'column', gap: 32 }}>
                    <Glossary standalone />
                  </div>
                }
              />
              <Route
                path="/login"
                element={
                  <RedirectIfAuthed>
                    <Login />
                  </RedirectIfAuthed>
                }
              />
              <Route
                path="/app/session/:workoutId"
                element={
                  <RequireAuth>
                    <div className="session-page">
                      <Session />
                    </div>
                  </RequireAuth>
                }
              />
              <Route
                element={
                  <RequireAuth>
                    <Layout />
                  </RequireAuth>
                }
              >
                <Route path="/app" element={<Dashboard />} />
                <Route path="/app/routines" element={<Routines />} />
                <Route path="/app/routines/:id" element={<RoutineDetail />} />
                <Route path="/app/exercises" element={<Exercises />} />
                <Route path="/app/exercises/:id/progress" element={<ExerciseProgress />} />
                <Route path="/app/checkin" element={<Checkin />} />
                <Route path="/app/daily-log" element={<Navigate to="/app/checkin" replace />} />
                <Route path="/app/glossary" element={<Glossary />} />
                <Route path="/app/history" element={<History />} />
                <Route path="/app/settings" element={<Settings />} />
                <Route path="/app/preparation" element={<Navigate to="/app/settings" replace />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
