import { analyzeWeightTrend } from '../utils/phaseSuggestion';
import type { BodyStat } from '../types';

export default function PhaseSuggestionCard({ stats, phase }: { stats: BodyStat[]; phase: string | null }) {
  const trend = analyzeWeightTrend(stats, phase);

  return (
    <div className="card">
      <span className="label">Calorie suggestion</span>
      {!trend.hasEnoughData ? (
        <span className="spinner-text">{trend.message}</span>
      ) : (
        <>
          <div style={{ display: 'flex', gap: 24 }}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Weekly trend
              </span>
              <span style={{ font: "500 20px/1 'Inter Tight', sans-serif", color: 'var(--text)' }}>
                {trend.weeklyRatePct! > 0 ? '+' : ''}
                {trend.weeklyRatePct!.toFixed(2)}%
              </span>
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                Direction
              </span>
              <span style={{ font: "500 20px/1 'Inter Tight', sans-serif", color: 'var(--text)', textTransform: 'capitalize' }}>
                {trend.direction}
              </span>
            </div>
            {trend.suggestionKcal !== 0 && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                <span style={{ font: "400 10.5px/1 'Inter', sans-serif", color: 'var(--text-dim)', textTransform: 'uppercase' }}>
                  Suggested change
                </span>
                <span style={{ font: "500 20px/1 'Inter Tight', sans-serif", color: 'var(--accent)' }}>
                  {trend.suggestionKcal! > 0 ? '+' : ''}
                  {trend.suggestionKcal} kcal
                </span>
              </div>
            )}
          </div>
          <p className="muted-note">{trend.message}</p>
        </>
      )}
    </div>
  );
}
