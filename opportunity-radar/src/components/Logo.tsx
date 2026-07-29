import { Link } from 'react-router-dom';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="Opportunity Radar home">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-ember to-gold text-base shadow-[0_0_12px_rgba(255,179,71,0.35)]"
      >
        📡
      </span>
      <span className="leading-tight">
        <span className="block font-display text-xs font-extrabold tracking-[0.08em] uppercase">
          Opportunity Radar
        </span>
        <span className="block font-mono text-[8px] tracking-[0.2em] text-gold uppercase">
          AI Opportunity Intelligence
        </span>
      </span>
    </Link>
  );
}
