import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api';
import { useLanguage } from '../i18n/LanguageContext';
import QuickPreferences from '../components/QuickPreferences';

export default function Login() {
  const { login, register } = useAuth();
  const { t } = useLanguage();
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
      navigate('/app', { replace: true });
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
        flexDirection: 'column',
        background:
          'radial-gradient(120% 120% at 50% -10%, #3a0508 0%, #170303 45%, #060606 100%)',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '18px 28px' }}>
        <Link to="/" style={{ font: "400 12px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
          {t('login.backToHome')}
        </Link>
        <QuickPreferences />
      </div>

      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <form onSubmit={onSubmit} style={{ width: 400, display: 'flex', flexDirection: 'column', gap: 32 }}>
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
              {t('nav.brand')}
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
            {t('login.title1')}
            <br />
            {t('login.title2')}
            <br />
            {t('login.title3')}
          </h1>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 18 }}>
            <label className="field">
              <span className="label">{t('login.email')}</span>
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
              <span className="label">{t('login.password')}</span>
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
              {busy ? t('login.pleaseWait') : mode === 'login' ? t('login.submitLogin') : t('login.submitRegister')}
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
              {mode === 'login' ? t('login.switchToRegister') : t('login.switchToLogin')}
            </a>
          </div>
        </form>
      </div>
    </div>
  );
}
