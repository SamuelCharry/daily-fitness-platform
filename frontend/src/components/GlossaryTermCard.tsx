import type { GlossaryTerm } from '../data/glossary';

export default function GlossaryTermCard({ term, definition, whyItMatters }: GlossaryTerm) {
  return (
    <div className="card" style={{ gap: 12 }}>
      <span style={{ font: "600 15px/1.3 'Inter Tight', sans-serif", color: 'var(--text-strong)' }}>{term}</span>
      <p style={{ margin: 0, font: "400 13.5px/1.55 'Inter', sans-serif", color: 'var(--text-body)' }}>{definition}</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4, paddingTop: 8, borderTop: '1px solid var(--border)' }}>
        <span
          style={{
            font: "600 10px/1 'Inter', sans-serif",
            letterSpacing: '.06em',
            color: 'var(--accent)',
            textTransform: 'uppercase',
          }}
        >
          Why it matters
        </span>
        <p style={{ margin: 0, font: "400 13px/1.55 'Inter', sans-serif", color: 'var(--text-muted)' }}>{whyItMatters}</p>
      </div>
    </div>
  );
}
