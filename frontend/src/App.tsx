import type { ReactNode } from 'react';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import { ThemeProvider } from './theme/ThemeContext';
import { LanguageProvider } from './i18n/LanguageContext';
import Layout from './components/Layout';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Routines from './pages/Routines';
import RoutineDetail from './pages/RoutineDetail';
import Exercises from './pages/Exercises';
import DailyLog from './pages/DailyLog';
import Session from './pages/Session';
import Glossary from './pages/Glossary';
import History from './pages/History';
import ExerciseProgress from './pages/ExerciseProgress';
import Settings from './pages/Settings';

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
              <Route path="/" element={<Landing />} />
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
                    <div style={{ padding: '32px 44px', maxWidth: 900 }}>
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
                <Route path="/app/daily-log" element={<DailyLog />} />
                <Route path="/app/glossary" element={<Glossary />} />
                <Route path="/app/history" element={<History />} />
                <Route path="/app/settings" element={<Settings />} />
              </Route>
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  );
}
