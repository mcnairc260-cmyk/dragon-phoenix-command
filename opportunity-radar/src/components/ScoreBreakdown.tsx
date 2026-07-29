import type { ScoreComponents } from '../types/opportunity';
import { SCORE_EXPLANATION, SCORE_FACTOR_LABELS, SCORE_WEIGHTS } from '../lib/score';

export function ScoreBreakdown({
  components,
  isDemo,
}: {
  components: ScoreComponents;
  isDemo: boolean;
}) {
  const keys = Object.keys(SCORE_WEIGHTS) as (keyof ScoreComponents)[];
  return (
    <div>
      <ul className="space-y-2.5">
        {keys.map((key) => {
          const value = components[key];
          const weightPct = Math.round(SCORE_WEIGHTS[key] * 100);
          return (
            <li key={key}>
              <div className="mb-1 flex items-baseline justify-between gap-2">
                <span className="text-xs text-ash">
                  {SCORE_FACTOR_LABELS[key]}{' '}
                  <span className="font-mono text-[9px] text-smoke">({weightPct}%)</span>
                </span>
                <span className="font-mono text-xs text-gold">{value}</span>
              </div>
              <div
                className="h-1.5 overflow-hidden rounded-full bg-surface2"
                role="meter"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={value}
                aria-label={`${SCORE_FACTOR_LABELS[key]}: ${value} of 100`}
              >
                <div
                  className="h-full rounded-full bg-gradient-to-r from-ember to-gold"
                  style={{ width: `${value}%` }}
                />
              </div>
            </li>
          );
        })}
      </ul>
      <p className="mt-4 text-xs leading-relaxed text-muted">
        {SCORE_EXPLANATION}
        {isDemo && ' This score was generated from demonstration data.'}
      </p>
    </div>
  );
}
