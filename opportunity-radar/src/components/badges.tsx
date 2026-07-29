import type {
  CompetitionLevel,
  Confidence,
  GrowthVelocity,
  Signal,
  TimeWindow,
} from '../types/opportunity';
import { scoreBand } from '../lib/score';

/** Small labeled stat used across cards and detail pages. */
export function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="min-w-0">
      <dt className="text-[10px] font-semibold tracking-[0.08em] text-soft uppercase">{label}</dt>
      <dd className="truncate text-xs font-medium text-ink">{value}</dd>
    </div>
  );
}

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded-full bg-gold-soft px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-gold-ink uppercase ${className}`}
      title="Demonstration data — not verified market research"
    >
      Demo data
    </span>
  );
}

/**
 * Radar Score. size 'md' = compact rounded tile (cards); size 'lg' = the
 * Stitch circular gauge (detail page).
 */
export function ScoreBadge({
  score,
  isDemo,
  size = 'md',
}: {
  score: number;
  isDemo: boolean;
  size?: 'md' | 'lg';
}) {
  const band = scoreBand(score);
  const color = `var(${band.colorVar})`;
  const label = `Radar Score ${score} out of 100 — ${band.label}${isDemo ? ' (demo score)' : ''}`;

  if (size === 'lg') {
    // Circular gauge per the Stitch detail screen: colored ring, ink number.
    const r = 34;
    const c = 2 * Math.PI * r;
    return (
      <div
        className="flex flex-col items-center rounded-xl border border-line bg-card px-5 py-4 shadow-card"
        aria-label={label}
      >
        <svg width="88" height="88" viewBox="0 0 88 88" aria-hidden="true">
          <circle cx="44" cy="44" r={r} fill="none" stroke="var(--color-tint)" strokeWidth="8" />
          <circle
            cx="44"
            cy="44"
            r={r}
            fill="none"
            stroke={color}
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={`${(score / 100) * c} ${c}`}
            transform="rotate(-90 44 44)"
          />
          <text
            x="44"
            y="50"
            textAnchor="middle"
            fontSize="24"
            fontWeight="700"
            fill="var(--color-ink)"
          >
            {score}
          </text>
        </svg>
        <span className="mt-1 text-xs font-semibold text-ink">Radar Score</span>
        <span className="text-[10px] font-semibold tracking-[0.08em] text-soft uppercase">
          {band.label}
        </span>
        {isDemo && (
          <span className="text-[9px] font-semibold tracking-[0.08em] text-faint uppercase">
            demo
          </span>
        )}
      </div>
    );
  }

  return (
    <div
      className="flex flex-col items-center rounded-lg border-2 bg-card px-2.5 py-1.5"
      style={{ borderColor: color }}
      aria-label={label}
    >
      <span className="text-xl font-bold tracking-tight text-ink">{score}</span>
      <span className="text-[9px] font-semibold tracking-[0.08em] text-soft uppercase">
        {band.label}
      </span>
      {isDemo && (
        <span className="text-[8px] font-semibold tracking-[0.08em] text-faint uppercase">demo</span>
      )}
    </div>
  );
}

const GROWTH_ICON: Record<GrowthVelocity, string> = {
  Explosive: '▲▲',
  Accelerating: '▲',
  Rising: '↗',
  Steady: '→',
};

export function GrowthBadge({ velocity }: { velocity: GrowthVelocity }) {
  const hot = velocity === 'Explosive' || velocity === 'Accelerating';
  return (
    <span className={`text-xs font-semibold ${hot ? 'text-emerald-ink' : 'text-soft'}`}>
      <span aria-hidden="true">{GROWTH_ICON[velocity]}</span> {velocity}
    </span>
  );
}

export function CompetitionBadge({ level }: { level: CompetitionLevel }) {
  const color =
    level === 'Low' ? 'text-emerald-ink' : level === 'Moderate' ? 'text-soft' : 'text-danger';
  return <span className={`text-xs font-semibold ${color}`}>{level} competition</span>;
}

export function TimeWindowBadge({ window: w }: { window: TimeWindow }) {
  const color =
    w === 'Open now' ? 'text-emerald-ink' : w === 'Opening' ? 'text-gold-ink' : 'text-danger';
  return <span className={`text-xs font-semibold ${color}`}>{w}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return <span className="text-xs font-semibold text-soft">{confidence} confidence</span>;
}

const STRENGTH_DOTS: Record<Signal['strength'], string> = {
  Strong: '●●●',
  Moderate: '●●○',
  Weak: '●○○',
};

export function SignalStrengthIndicator({ strength }: { strength: Signal['strength'] }) {
  return (
    <span
      className={`text-[10px] font-semibold tracking-widest ${
        strength === 'Strong'
          ? 'text-gold-ink'
          : strength === 'Moderate'
            ? 'text-body'
            : 'text-faint'
      }`}
      aria-label={`${strength} signal`}
    >
      <span aria-hidden="true">{STRENGTH_DOTS[strength]}</span> {strength}
    </span>
  );
}
