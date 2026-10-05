import { useState, type FormEvent } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { ApiError } from '../api';
import { Icon } from '../components/Layout';
export default function Login({ createAccount = false }: { createAccount?: boolean }) {
  const { login, register, registrationEnabled } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState(localStorage.getItem('cfts_owner_email') || '');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  async function submit(e: FormEvent) {
    e.preventDefault(); setError('');
    if (createAccount && password !== confirmation) { setError('Las contraseñas no coinciden.'); return; }
    setBusy(true);
    try {
      if (createAccount) await register(email, password);
      else await login(email, password);
      localStorage.setItem('cfts_owner_email', email); navigate('/app', { replace: true });
    }
    catch (err) { setError(err instanceof ApiError ? (err.status === 422 ? 'Revisa el correo y usa una contraseña de 12 a 72 caracteres (máximo 72 bytes).' : err.message) : 'No se pudo conectar. Intenta de nuevo.'); }
    finally { setBusy(false); }
  }
  return <main className="login-page"><Link className="login-notes-link btn-ghost" to="/notes"><Icon name="book" /><span>Notas</span></Link><form className="login-form" onSubmit={submit}>
    <div className="brand"><span className="brand-symbol"><Icon name="sun" /></span><span>cool for<br /><strong>the summer</strong></span></div>
    <h1>{createAccount ? 'Crea tu cuenta.' : 'Tu espacio. Tu progreso.'}</h1>
    <p>{createAccount ? 'Tu propio espacio para entrenar, registrar y seguir tu progreso. Tus registros son privados.' : 'Entra a tu bitácora personal. Recordaremos tu sesión en este dispositivo durante siete días.'}</p>
    {createAccount && !registrationEnabled && <p role="alert" className="error-text">El registro está desactivado en este servidor.</p>}
    <label className="field"><span>Correo de tu cuenta</span><input type="email" autoComplete="username" value={email} required onChange={e => setEmail(e.target.value)} /></label>
    <label className="field"><span>Contraseña</span><input type="password" autoComplete={createAccount ? 'new-password' : 'current-password'} minLength={createAccount ? 12 : undefined} maxLength={createAccount ? 72 : undefined} value={password} required onChange={e => setPassword(e.target.value)} /></label>
    {createAccount && <>
      <p className="helper-text">Usa al menos 12 caracteres.</p>
      <label className="field"><span>Repite tu contraseña</span><input type="password" autoComplete="new-password" value={confirmation} required onChange={e => setConfirmation(e.target.value)} /></label>
    </>}
    {error && <p className="error-text" role="alert">{error}</p>}
    <button className="btn-primary" disabled={busy || (createAccount && !registrationEnabled)}>{busy ? (createAccount ? 'Creando…' : 'Entrando…') : (createAccount ? 'Crear mi cuenta' : 'Entrar a mi bitácora')}</button>
    {createAccount ? <p>¿Ya tienes cuenta? <Link to="/login">Inicia sesión</Link></p> : registrationEnabled && <p>¿Primera vez? <Link to="/register">Crear una cuenta</Link></p>}
    <p className="helper-text">Una plataforma personal para entrenar, registrar y seguir adelante.</p>
    <Link to="/notes">Leer las notas gratis →</Link>
  </form></main>;
}
