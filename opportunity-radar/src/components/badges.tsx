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
      <dt className="font-mono text-[9px] tracking-[0.14em] text-smoke uppercase">{label}</dt>
      <dd className="truncate text-xs text-ash">{value}</dd>
    </div>
  );
}

export function DemoBadge({ className = '' }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center rounded border border-cyan/30 bg-cyan/10 px-1.5 py-0.5 font-mono text-[9px] tracking-[0.12em] text-cyan uppercase ${className}`}
      title="Demonstration data — not verified market research"
    >
      Demo data
    </span>
  );
}

export function ScoreBadge({ score, isDemo, size = 'md' }: { score: number; isDemo: boolean; size?: 'md' | 'lg' }) {
  const band = scoreBand(score);
  const color = `var(${band.colorVar})`;
  return (
    <div
      className={`flex flex-col items-center rounded-lg border bg-surface2 ${
        size === 'lg' ? 'px-4 py-3' : 'px-2.5 py-1.5'
      }`}
      style={{ borderColor: color }}
      aria-label={`Opportunity Score ${score} out of 100 — ${band.label}${isDemo ? ' (demo score)' : ''}`}
    >
      <span
        className={`font-display font-extrabold ${size === 'lg' ? 'text-4xl' : 'text-xl'}`}
        style={{ color }}
      >
        {score}
      </span>
      <span className="font-mono text-[9px] tracking-[0.12em] text-muted uppercase">
        {band.label}
      </span>
      {isDemo && (
        <span className="font-mono text-[8px] tracking-[0.12em] text-smoke uppercase">demo</span>
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
    <span className={`font-mono text-xs ${hot ? 'text-gold' : 'text-muted'}`}>
      <span aria-hidden="true">{GROWTH_ICON[velocity]}</span> {velocity}
    </span>
  );
}

export function CompetitionBadge({ level }: { level: CompetitionLevel }) {
  const color =
    level === 'Low' ? 'text-green' : level === 'Moderate' ? 'text-muted' : 'text-danger';
  return <span className={`font-mono text-xs ${color}`}>{level} competition</span>;
}

export function TimeWindowBadge({ window: w }: { window: TimeWindow }) {
  const color = w === 'Open now' ? 'text-green' : w === 'Opening' ? 'text-cyan' : 'text-gold';
  return <span className={`font-mono text-xs ${color}`}>{w}</span>;
}

export function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className="font-mono text-xs text-muted">
      {confidence} confidence
    </span>
  );
}

const STRENGTH_DOTS: Record<Signal['strength'], string> = {
  Strong: '●●●',
  Moderate: '●●○',
  Weak: '●○○',
};

export function SignalStrengthIndicator({ strength }: { strength: Signal['strength'] }) {
  return (
    <span
      className={`font-mono text-[10px] tracking-widest ${
        strength === 'Strong' ? 'text-gold' : strength === 'Moderate' ? 'text-cyan' : 'text-smoke'
      }`}
      aria-label={`${strength} signal`}
    >
      <span aria-hidden="true">{STRENGTH_DOTS[strength]}</span> {strength}
    </span>
  );
}
