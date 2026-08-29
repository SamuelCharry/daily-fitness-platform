import { useState } from 'react';
import { calorieRangeForWeight, computeMacros, type CalorieAggressiveness } from '../utils/macros';
import type { Profile } from '../types';

export default function MacroCalculator({ profile, weightKg }: { profile: Profile | null; weightKg: number | null }) {
  const [aggressiveness, setAggressiveness] = useState<CalorieAggressiveness>('moderate');

  if (!profile?.sex || !profile.height_cm || !weightKg) {
    return (
      <div className="card">
        <span className="label">Macro targets</span>
        <span className="spinner-text">
          Fill in your sex and height in the profile above, and log a bodyweight entry, to see personalized macro
          targets.
        </span>
      </div>
    );
  }

  const sex = profile.sex === 'female' ? 'female' : 'male';
  const range = calorieRangeForWeight(sex, weightKg);
  const macros = computeMacros(sex, weightKg, profile.height_cm, aggressiveness);

  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between' }}>
        <span className="label">Macro targets for weight loss</span>
        <span style={{ font: "400 11px/1 'Inter', sans-serif", color: 'var(--text-dim)' }}>
          {range.low}–{range.high} kcal range
        </span>
      </div>

      <div style={{ display: 'flex', gap: 4, background: 'var(--bg)', border: '1px solid var(--border)', borderRadius: 8, padding: 3, alignSelf: 'flex-start' }}>
        {(['faster', 'moderate', 'gentler'] as CalorieAggressiveness[]).map((a) => (
          <button
            key={a}
            onClick={() => setAggressiveness(a)}
            style={{
              border: 'none',
              background: aggressiveness === a ? 'var(--accent)' : 'transparent',
              color: aggressiveness === a ? 'var(--accent-text)' : '#a8a8aa',
              padding: '6px 14px',
              borderRadius: 6,
              font: "600 12px/1 'Inter Tight', sans-serif",
              textTransform: 'capitalize',
            }}
          >
            {a}
          </button>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12 }}>
        {[
          { label: 'Calories', value: macros.calories },
          { label: 'Protein', value: `${macros.proteinG}g` },
          { label: 'Fat', value: `${macros.fatG}g` },
          { label: 'Carbs', value: `${macros.carbsG}g` },
        ].map((m) => (
          <div key={m.label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '.04em' }}>
              {m.label}
            </span>
            <span style={{ font: "500 20px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>{m.value}</span>
          </div>
        ))}
      </div>
      <p className="muted-note">
        Protein and fat are minimums (fixed by your height/sex); carbs fill whatever calories are left. This range is
        specifically for a fat-loss phase — for maintaining or building, use the phase suggestion below instead.
      </p>
    </div>
  );
}
