import { useEffect, useRef, useState } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Icon } from '../components/Layout';
import { normalizeSearch, noteTopics, readingMinutes, readingNotes } from '../content/notes';

export default function Notes({ embedded = false }: { embedded?: boolean }) {
  const { user } = useAuth();
  const { slug } = useParams();
  const [params, setParams] = useSearchParams();
  const [copyMessage, setCopyMessage] = useState<{ slug: string; text: string } | null>(null);
  const heading = useRef<HTMLHeadingElement>(null);
  const base = embedded ? '/app/notes' : '/notes';
  const note = readingNotes.find(n => n.slug === slug);
  const query = params.get('q') || '';
  const topic = params.get('topic') || 'Todas';
  const search = normalizeSearch(query.trim());
  const visible = readingNotes.filter(n => (topic === 'Todas' || topic === n.topic) && normalizeSearch([n.title, n.summary, ...n.tags, ...n.sections.map(s => s.text)].join(' ')).includes(search));

  useEffect(() => {
    document.title = `${note ? note.title : 'Mis notas'} · Cool for the Summer`;
    if (slug) heading.current?.focus();
    return () => { document.title = 'Cool for the Summer'; };
  }, [slug, note]);

  function updateFilter(key: string, value: string) {
    const next = new URLSearchParams(params);
    if (value && value !== 'Todas') next.set(key, value); else next.delete(key);
    setParams(next, { replace: true });
  }

  async function copyLink() {
    if (!note) return;
    try {
      // Public URL works even when the reader has no account.
      const buildBase = import.meta.env.BASE_URL.replace(/\/$/, '');
      await navigator.clipboard.writeText(`${window.location.origin}${buildBase}/notes/${note.slug}`);
      setCopyMessage({ slug: note.slug, text: 'Enlace copiado.' });
    } catch { setCopyMessage({ slug: note.slug, text: 'Puedes copiar la dirección desde la barra del navegador.' }); }
  }

  const contents = slug ? note ? <article className="note-reader">
    <Link className="note-back" to={`${base}${params.size ? `?${params}` : ''}`}>← Todas las notas</Link>
    <div className="note-meta"><span>{note.topic}</span><span>{readingMinutes(note)} min de lectura</span></div>
    <h1 ref={heading} tabIndex={-1}>{note.title}</h1>
    <p className="note-lead">{note.summary}</p>
    <div className="note-takeaway"><span>Para recordar</span><p>{note.takeaway}</p></div>
    {note.sections.map(section => <section key={section.title}><h2>{section.title}</h2><p>{section.text}</p></section>)}
    <footer className="note-sources">
      <h2>Fuentes de esta nota</h2>
      <ul>{note.sources.map(source => <li key={source.title}>{source.url ? <a href={source.url} target="_blank" rel="noreferrer">{source.title} ↗</a> : <><strong>{source.title}</strong><span>Páginas del PDF: {source.pages}</span></>}</li>)}</ul>
      <p>Resumen de lectura en palabras propias. Las páginas del PDF incluyen la portada. Las propuestas de TNF reflejan el enfoque de su autor; no todas son reglas universales. Información educativa para adultos, no una pauta médica o de preparación de competición.</p>
      <button className="btn-ghost" onClick={copyLink}>Copiar enlace de esta nota</button>
      <p role="status" aria-live="polite">{copyMessage?.slug === slug ? copyMessage.text : ''}</p>
    </footer>
    <div className="note-related"><h2>Seguir leyendo</h2>{readingNotes.filter(n => n.topic === note.topic && n.slug !== note.slug).slice(0, 2).map(n => <Link key={n.slug} to={`${base}/${n.slug}`}>{n.title} <span aria-hidden="true">→</span></Link>)}</div>
  </article> : <section className="notes-empty"><h1>Esta nota no existe.</h1><p>Encuentra otro tema en la biblioteca.</p><Link className="btn-ghost" to={base}>Ver todas las notas</Link></section> : <>
    <header className="notes-intro"><span className="notes-eyebrow">Biblioteca abierta · Gratis</span><h1>Mis notas</h1><p>Ideas claras para entrenar y entender tu progreso.</p><p className="notes-description">Apuntes de lectura compartidos a partir de los manuales de TNF. Temas cortos, en palabras simples y con sus fuentes. Puedes leerlos sin crear una cuenta.</p></header>
    <div className="notes-tools"><label className="field"><span>¿Qué quieres aprender?</span><input type="search" placeholder="Busca RIR, peso, calorías…" value={query} onChange={e => updateFilter('q', e.target.value)} /></label>
      <div className="notes-filters" role="group" aria-label="Filtrar notas por tema">{['Todas', ...noteTopics].map(t => <button key={t} className={topic === t ? 'selected' : ''} aria-pressed={topic === t} onClick={() => updateFilter('topic', t)}>{t}</button>)}</div>
    </div>
    <p className="notes-count" role="status" aria-live="polite">{visible.length} {visible.length === 1 ? 'nota' : 'notas'}{topic !== 'Todas' ? ` · ${topic}` : ''}</p>
    {visible.length ? <div className="notes-grid">{visible.map(n => <article key={n.slug} className="note-preview"><div className="note-meta"><span>{n.topic}</span><span>{readingMinutes(n)} min</span></div><h2><Link to={`${base}/${n.slug}${params.size ? `?${params}` : ''}`}>{n.title}</Link></h2><p>{n.summary}</p><span className="note-read" aria-hidden="true">Leer nota →</span></article>)}</div> : <div className="notes-empty"><h2>No encontramos ese tema.</h2><p>Prueba otra palabra o elimina los filtros.</p><button className="btn-ghost" onClick={() => setParams({}, { replace: true })}>Mostrar todas las notas</button></div>}
    <footer className="notes-library-footer"><h2>Sobre estos apuntes</h2><p>Esta colección resume conceptos de <strong>TNF Muscle Building Manual</strong> y <strong>Fat Loss &amp; Building Phases</strong>. No reproduce los manuales ni sus programas completos. Las referencias de cada nota permiten identificar de dónde sale la idea.</p><p>Las notas son educativas y están abiertas a todos. Las anotaciones privadas de tu bitácora permanecen dentro de tu cuenta.</p></footer>
  </>;

  if (embedded) return <div className="notes-page">{contents}</div>;
  return <div className="notes-public"><header className="notes-public-header"><Link className="brand" to="/notes"><span className="brand-symbol"><Icon name="sun" /></span><span>cool for<br /><strong>the summer</strong></span></Link><Link className="btn-ghost" to={user ? '/app' : '/login'}>{user ? 'Mi plataforma' : 'Entrar a mi bitácora'}</Link></header><main className="notes-page">{contents}</main></div>;
}
