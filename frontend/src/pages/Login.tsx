import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Layout';
export default function Login() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(localStorage.getItem('cfts_owner_email') || '');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setBusy(true); setError('');
    try { await login(email, password); localStorage.setItem('cfts_owner_email', email); navigate('/app', { replace: true }); }
    catch { setError('No se pudo entrar. Revisa tus datos y la conexión e intenta de nuevo.'); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><form className="login-form" onSubmit={submit}><div className="brand"><span className="brand-symbol"><Icon name="sun" /></span><span>cool for<br /><strong>the summer</strong></span></div><h1>Tu espacio. Tu progreso.</h1><p>Entra a tu bitácora personal. Recordaremos tu sesión en este dispositivo durante siete días.</p><label className="field"><span>Correo de tu cuenta</span><input type="email" autoComplete="username" value={email} required onChange={e => setEmail(e.target.value)} /></label><label className="field"><span>Contraseña</span><input type="password" autoComplete="current-password" value={password} required onChange={e => setPassword(e.target.value)} /></label>{error && <p className="error-text" role="alert">{error}</p>}<button className="btn-primary" disabled={busy}>{busy ? 'Entrando…' : 'Entrar a mi bitácora'}</button><p className="helper-text">Una plataforma personal para entrenar, registrar y seguir adelante.</p></form></main>;
}
