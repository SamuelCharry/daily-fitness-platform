import type { ReactNode } from 'react';
import { Navigate, Route, BrowserRouter, Routes } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StrengthMap from './pages/StrengthMap';
import Preparation from './pages/Preparation';
import Routines from './pages/Routines';
import RoutineDetail from './pages/RoutineDetail';
import Exercises from './pages/Exercises';
import DailyLog from './pages/DailyLog';
import Session from './pages/Session';
import Glossary from './pages/Glossary';
import History from './pages/History';
import ExerciseProgress from './pages/ExerciseProgress';

function RequireAuth({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return <span className="spinner-text">Loading…</span>;
  if (!user) return <Navigate to="/login" replace />;
  return <>{children}</>;
}

function RedirectIfAuthed({ children }: { children: ReactNode }) {
  const { user, loading } = useAuth();
  if (loading) return null;
  if (user) return <Navigate to="/" replace />;
  return <>{children}</>;
}

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route
            path="/login"
            element={
              <RedirectIfAuthed>
                <Login />
              </RedirectIfAuthed>
            }
          />
          <Route
            path="/session/:workoutId"
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
            <Route path="/" element={<Dashboard />} />
            <Route path="/strength-map" element={<StrengthMap />} />
            <Route path="/preparation" element={<Preparation />} />
            <Route path="/routines" element={<Routines />} />
            <Route path="/routines/:id" element={<RoutineDetail />} />
            <Route path="/exercises" element={<Exercises />} />
            <Route path="/exercises/:id/progress" element={<ExerciseProgress />} />
            <Route path="/daily-log" element={<DailyLog />} />
            <Route path="/glossary" element={<Glossary />} />
            <Route path="/history" element={<History />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}
