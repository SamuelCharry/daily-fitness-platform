import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { api } from '../api';
import { Icon } from '../components/Layout';

type GoogleAPI = { accounts: { id: { initialize: (options: {client_id: string; callback: (response: {credential: string}) => void}) => void; renderButton: (node: HTMLElement, options: object) => void } } };
declare global { interface Window { google?: GoogleAPI } }

export default function Login({ createAccount = false }: { createAccount?: boolean }) {
  const { googleLogin, login, register, registrationEnabled } = useAuth();
  const navigate = useNavigate();
  const loginRef = useRef(googleLogin);
  useEffect(() => { loginRef.current = googleLogin; }, [googleLogin]);
  const button = useRef<HTMLDivElement>(null);
  const figure = useRef<SVGSVGElement>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'missing' | 'busy' | 'success' | 'error'>('loading');
  const [error, setError] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordMode, setPasswordMode] = useState(false);
  const [passwordFocused, setPasswordFocused] = useState(false);
  const [reaction, setReaction] = useState(0);
  function invalidField(event: React.InvalidEvent<HTMLInputElement>) {
    const input = event.currentTarget;
    setStatus('error'); setReaction(n => n + 1);
    setError(input.type === 'email' ? 'Escribe un correo válido.' : createAccount ? 'Usa una contraseña de al menos 12 caracteres.' : 'Escribe tu contraseña.');
  }
  function editing() {
    if (status === 'error') { setError(''); setStatus('missing'); }
  }
  async function submitPassword(event: React.FormEvent) {
    event.preventDefault(); setError(''); setStatus('busy');
    try {
      if (createAccount) await register(email, password); else await login(email, password);
      setStatus('success');
      setTimeout(() => navigate('/app', {replace: true}), 700);
    } catch (err) { setStatus('error'); setReaction(n => n + 1); setError(err instanceof Error ? err.message : 'No se pudo conectar.'); }
  }
  useEffect(() => {
    let active = true;
    let timer: ReturnType<typeof setTimeout>;
    const initialize = (clientId: string) => {
      if (!active || !window.google || !button.current) return;
      window.google.accounts.id.initialize({client_id: clientId, callback: async ({credential}) => {
        if (!active) return;
        setStatus('busy'); setError('');
        try {
          await loginRef.current(credential);
          if (!active) return;
          setStatus('success');
          timer = setTimeout(() => navigate('/app', {replace: true}), 900);
        } catch (err) { if (active) { setStatus('error'); setError(err instanceof Error ? err.message : 'No se pudo iniciar sesión. Intenta de nuevo.'); } }
      }});
      button.current.replaceChildren();
      window.google.accounts.id.renderButton(button.current, {theme: 'outline', size: 'large', text: 'continue_with', shape: 'pill', width: 280, locale: 'es'});
      setStatus('ready');
    };
    let script: HTMLScriptElement | undefined;
    api.get<{google_client_id?: string}>('/api/auth/config').then(config => {
      if (!active) return;
      if (!config.google_client_id) { setPasswordMode(true); setStatus('missing'); return; }
      if (window.google) { initialize(config.google_client_id); return; }
      script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client'; script.async = true;
      script.onload = () => initialize(config.google_client_id!);
      script.onerror = () => { if (active) { setStatus('error'); setError('No se pudo cargar Google. Recarga la página.'); } };
      document.head.appendChild(script);
    }).catch(() => { if (active) { setStatus('error'); setError('No se pudo conectar. Recarga la página.'); } });
    return () => { active = false; clearTimeout(timer); script?.remove(); };
  }, [navigate]);
  return <main className="google-login" onPointerMove={event => {
    if (event.pointerType === 'touch' || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const x = (event.clientX / window.innerWidth - .5) * 48;
    const y = (event.clientY / window.innerHeight - .5) * 32;
    figure.current?.style.setProperty('--look-x', `${x}px`);
    figure.current?.style.setProperty('--look-y', `${y}px`);
  }}>
    <section className={`login-character ${status} ${passwordFocused ? 'eyes-closed' : ''}`} aria-label="Sol animado">
      <Link to="/" className="login-wordmark"><Icon name="sun"/><span>cool for<br/><strong>the summer</strong></span></Link>
      <svg ref={figure} viewBox="0 0 400 440" role="img" aria-label="Sol minimalista animado">
        <ellipse className="sun-shadow" cx="200" cy="355" rx="56" ry="5" fill="#333"/>
        <g key={reaction} className="sun-follow"><g className="sun-float">
          <g className="sun-rays" stroke="white" strokeWidth="3" strokeLinecap="round">
            {Array.from({length:12}, (_,i) => <path key={i} d="M200 102 V119" transform={`rotate(${i*30} 200 220)`}/>)}
          </g>
          <circle cx="200" cy="220" r="72" fill="white"/>
          <g className="sun-face" fill="#111"><g className="sun-open-eyes"><ellipse cx="181" cy="215" rx="4.5" ry="8"/><ellipse cx="219" cy="215" rx="4.5" ry="8"/></g>
          <g className="sun-closed-eyes" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"><path d="M174 216 Q181 222 188 216"/><path d="M212 216 Q219 222 226 216"/></g>
          {status === 'error' && <g className="sun-brows" fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"><path d="M175 202 L187 198"/><path d="M213 198 L225 202"/></g>}
          <path d={status === 'error' ? 'M186 246 Q200 234 214 246' : 'M186 238 Q200 254 214 238'} fill="none" stroke="#111" strokeWidth="3" strokeLinecap="round"/></g>
        </g></g>
      </svg>
      <span className="character-caption" aria-live="polite">{status === 'success' ? '¡Dentro!' : status === 'busy' ? 'Entrando…' : status === 'error' ? 'Probemos otra vez.' : ''}</span>
    </section>
    <section className="google-login-content">
      <Link to="/notes" className="google-login-info">Infórmate ↗</Link>
      <div className="google-login-form"><h1>{createAccount ? 'Crear cuenta' : 'Iniciar sesión'}</h1><p>{passwordMode ? 'Accede a tu cuenta.' : 'Continúa con tu cuenta de Google.'}</p>
      {passwordMode && <form className="email-login-form" onSubmit={submitPassword}>
        <label className="field"><span>Correo</span><input type="email" autoComplete="username" required value={email} onInvalid={invalidField} onChange={e=>{setEmail(e.target.value); editing();}}/></label>
        <label className="field"><span>Contraseña</span><input type="password" autoComplete={createAccount ? 'new-password' : 'current-password'} minLength={createAccount ? 12 : undefined} required value={password} onInvalid={invalidField} onFocus={()=>setPasswordFocused(true)} onBlur={()=>setPasswordFocused(false)} onChange={e=>{setPassword(e.target.value); editing();}}/></label>
        {createAccount && <p className="helper-text">Mínimo 12 caracteres.</p>}
        <button className="btn-primary" disabled={status === 'busy' || status === 'success' || (createAccount && !registrationEnabled)}>{status === 'busy' ? 'Entrando…' : createAccount ? 'Crear cuenta' : 'Iniciar sesión'}</button>
        {createAccount ? <Link to="/login">Ya tengo cuenta</Link> : registrationEnabled && <Link to="/register">Crear cuenta</Link>}
      </form>}
      <div ref={button} className="google-button-host" hidden={passwordMode || status === 'busy' || status === 'success'} />
      {!passwordMode && (status === 'loading' || status === 'missing' || status === 'busy' || status === 'success') && <button className="google-placeholder" disabled>{status === 'busy' ? 'Entrando…' : status === 'success' ? 'Conectado ✓' : 'Continuar con Google'}</button>}
      {error && <p className="error-text" role="alert">{error}</p>}
      {!passwordMode && <p className="google-login-footnote">Si es tu primera vez, se creará tu cuenta.</p>}</div>
    </section>
  </main>;
}
