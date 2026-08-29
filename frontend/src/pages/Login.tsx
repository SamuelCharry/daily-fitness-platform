import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api';

export default function Login() {
  const { login, register } = useAuth();
  const navigate = useNavigate();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      if (mode === 'login') await login(email, password);
      else await register(email, password);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : 'Something went wrong');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background:
          'radial-gradient(120% 120% at 50% -10%, #3a0508 0%, #170303 45%, #060606 100%)',
      }}
    >
      <form
        onSubmit={onSubmit}
        style={{ width: 400, display: 'flex', flexDirection: 'column', gap: 32 }}
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
            Daily Fitness
          </span>
        </div>
        <h1
          style={{
            margin: 0,
            font: "500 32px/1.25 'Inter Tight', sans-serif",
            color: 'var(--text-strong)',
            letterSpacing: '-0.01em',
          }}
        >
          Your data.
          <br />
          Your training.
          <br />
          Your preparation.
        </h1>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
          <label className="field">
            <span className="label">Email</span>
            <input
              type="email"
              placeholder="you@domain.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoFocus
            />
          </label>
          <label className="field">
            <span className="label">Password</span>
            <input
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === 'register' ? 8 : undefined}
            />
          </label>

          {error && <span className="error-text">{error}</span>}

          <button type="submit" className="btn-primary" style={{ marginTop: 6 }} disabled={busy}>
            {busy ? 'Please wait…' : mode === 'login' ? 'Log in' : 'Create account'}
          </button>
          <a
            href="#"
            onClick={(e) => {
              e.preventDefault();
              setError(null);
              setMode(mode === 'login' ? 'register' : 'login');
            }}
            style={{ alignSelf: 'center', font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}
          >
            {mode === 'login' ? "Don't have an account? Sign up" : 'Already have an account? Log in'}
          </a>
        </div>
      </form>
    </div>
  );
}
