import { useTheme, type ThemeMode } from '../theme/ThemeContext';
import { useLanguage } from '../i18n/LanguageContext';
import type { Lang } from '../i18n/translations';

const THEME_ICONS: Record<ThemeMode, string> = { system: '🖥', light: '☀', dark: '☾' };

export default function QuickPreferences() {
  const { mode, setMode } = useTheme();
  const { lang, setLang } = useLanguage();

  function cycleTheme() {
    const order: ThemeMode[] = ['system', 'light', 'dark'];
    setMode(order[(order.indexOf(mode) + 1) % order.length]);
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
      <button
        type="button"
        onClick={cycleTheme}
        title={`Theme: ${mode}`}
        style={{
          border: '1px solid var(--border2)',
          background: 'transparent',
          borderRadius: 6,
          width: 30,
          height: 30,
          fontSize: 13,
          color: 'var(--text-dim)',
        }}
      >
        {THEME_ICONS[mode]}
      </button>
      <div style={{ display: 'flex', border: '1px solid var(--border2)', borderRadius: 6, overflow: 'hidden' }}>
        {(['en', 'es'] as Lang[]).map((l) => (
          <button
            key={l}
            type="button"
            onClick={() => setLang(l)}
            style={{
              border: 'none',
              background: lang === l ? 'var(--accent)' : 'transparent',
              color: lang === l ? 'var(--accent-text)' : 'var(--text-dim)',
              padding: '6px 9px',
              font: "600 11px/1 'Inter Tight', sans-serif",
              textTransform: 'uppercase',
            }}
          >
            {l}
          </button>
        ))}
      </div>
    </div>
  );
}
