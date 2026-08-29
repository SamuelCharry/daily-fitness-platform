import { useState } from 'react';
import { api } from '../api';
import { useApi } from '../hooks/useApi';
import type { StrengthMapData } from '../types';

type View = 'front' | 'back';

const LAYOUT = [
  { slot: 'shoulderL', x: 46, y: 78, w: 34, h: 30, rx: 10 },
  { slot: 'shoulderR', x: 160, y: 78, w: 34, h: 30, rx: 10 },
  { slot: 'torsoFront', x: 84, y: 80, w: 72, h: 46, rx: 12 },
  { slot: 'upperArmL', x: 44, y: 112, w: 26, h: 54, rx: 10 },
  { slot: 'upperArmR', x: 170, y: 112, w: 26, h: 54, rx: 10 },
  { slot: 'torsoLower', x: 90, y: 130, w: 60, h: 56, rx: 10 },
  { slot: 'forearmL', x: 42, y: 170, w: 24, h: 56, rx: 9 },
  { slot: 'forearmR', x: 174, y: 170, w: 24, h: 56, rx: 9 },
  { slot: 'hips', x: 84, y: 190, w: 72, h: 38, rx: 12 },
  { slot: 'legUpperL', x: 86, y: 232, w: 32, h: 92, rx: 12 },
  { slot: 'legUpperR', x: 122, y: 232, w: 32, h: 92, rx: 12 },
  { slot: 'legLowerL', x: 90, y: 328, w: 24, h: 78, rx: 9 },
  { slot: 'legLowerR', x: 126, y: 328, w: 24, h: 78, rx: 9 },
] as const;

// Maps each anatomical slot to the muscle key our seed/exercise data uses.
const FRONT_SLOTS: Record<string, string> = {
  shoulderL: 'front_delt',
  shoulderR: 'front_delt',
  torsoFront: 'chest',
  upperArmL: 'biceps',
  upperArmR: 'biceps',
  torsoLower: 'abs',
  forearmL: 'forearms',
  forearmR: 'forearms',
  hips: 'quads',
  legUpperL: 'quads',
  legUpperR: 'quads',
  legLowerL: 'calves',
  legLowerR: 'calves',
};

const BACK_SLOTS: Record<string, string> = {
  shoulderL: 'rear_delt',
  shoulderR: 'rear_delt',
  torsoFront: 'upper_back',
  upperArmL: 'triceps',
  upperArmR: 'triceps',
  torsoLower: 'spinal_erectors',
  forearmL: 'forearms',
  forearmR: 'forearms',
  hips: 'glutes',
  legUpperL: 'hamstrings',
  legUpperR: 'hamstrings',
  legLowerL: 'calves',
  legLowerR: 'calves',
};

const NO_DATA_COLOR = '#2a2e32';

function colorFor(ratio: number) {
  const hue = 230 - ratio * 205;
  const c = 0.14 + ratio * 0.06;
  return `oklch(0.63 ${c.toFixed(2)} ${hue.toFixed(0)})`;
}

function muscleKey(label: string) {
  return label.toLowerCase().replace(/ /g, '_');
}

export default function StrengthMap() {
  const [view, setView] = useState<View>('front');
  const { data, error, loading } = useApi(
    () => api.get<StrengthMapData>(`/api/strength-map?view=${view}`),
    [view],
  );

  const ratioByKey: Record<string, number> = {};
  data?.muscles.forEach((m) => {
    ratioByKey[muscleKey(m.label)] = m.ratio;
  });
  const slots = view === 'front' ? FRONT_SLOTS : BACK_SLOTS;

  return (
    <>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
          <span className="eyebrow">Analysis</span>
          <h1 className="page-title">Strength Map</h1>
        </div>
        <div style={{ display: 'flex', gap: 4, background: 'var(--bg-alt)', border: '1px solid var(--border)', borderRadius: 8, padding: 3 }}>
          {(['front', 'back'] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              style={{
                border: 'none',
                background: view === v ? 'var(--accent)' : 'transparent',
                color: view === v ? 'var(--accent-text)' : '#a9adb1',
                padding: '7px 16px',
                borderRadius: 6,
                font: "600 12px/1 'Inter Tight', sans-serif",
              }}
            >
              {v === 'front' ? 'Front' : 'Back'}
            </button>
          ))}
        </div>
      </div>

      {loading && <span className="spinner-text">Loading…</span>}
      {error && <span className="error-text">{error}</span>}

      {data && (
        <section style={{ display: 'grid', gridTemplateColumns: '1fr 1.3fr', gap: 16 }}>
          <div className="card" style={{ alignItems: 'center', padding: 28 }}>
            <svg viewBox="0 0 240 420" width={230} height={400}>
              <circle cx={120} cy={38} r={24} fill="#2a2e32" />
              <rect x={108} y={60} width={24} height={14} rx={4} fill="#2a2e32" />
              {LAYOUT.map((z) => {
                const key = slots[z.slot];
                const ratio = ratioByKey[key];
                return (
                  <rect
                    key={z.slot}
                    x={z.x}
                    y={z.y}
                    width={z.w}
                    height={z.h}
                    rx={z.rx}
                    fill={ratio != null ? colorFor(ratio) : NO_DATA_COLOR}
                  >
                    <title>{key.replace('_', ' ')}</title>
                  </rect>
                );
              })}
            </svg>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, width: '100%' }}>
              <span style={{ font: "400 10px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>Weaker</span>
              <div
                style={{
                  flex: 1,
                  height: 6,
                  borderRadius: 3,
                  background: 'linear-gradient(90deg,oklch(0.62 0.15 230),oklch(0.62 0.17 90),oklch(0.62 0.19 25))',
                }}
              />
              <span style={{ font: "400 10px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>Stronger</span>
            </div>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
            <div className="card">
              <span className="label">Muscle groups · {view === 'front' ? 'Front' : 'Back'}</span>
              {data.muscles.length === 0 ? (
                <span className="spinner-text">{data.note || 'No data yet.'}</span>
              ) : (
                data.muscles.map((m) => (
                  <div key={m.label} style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <span style={{ width: 110, flex: 'none', font: "400 13px/1 'Inter', sans-serif", color: 'var(--text-body)' }}>
                      {m.label}
                    </span>
                    <div style={{ flex: 1, height: 8, borderRadius: 4, background: '#20242a', overflow: 'hidden' }}>
                      <div style={{ height: '100%', borderRadius: 4, background: colorFor(m.ratio), width: m.pct }} />
                    </div>
                    <span style={{ width: 36, textAlign: 'right', font: "600 12px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>
                      {m.pct}
                    </span>
                  </div>
                ))
              )}
            </div>
            <p className="muted-note">
              Relative strength per muscle group, derived from logged working weights vs. bodyweight.
            </p>
          </div>
        </section>
      )}
    </>
  );
}
