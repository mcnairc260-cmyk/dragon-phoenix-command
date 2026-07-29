import { Link } from 'react-router-dom';

export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="Opportunity Radar home">
      <span
        aria-hidden="true"
        className="flex h-8 w-8 items-center justify-center rounded-lg bg-ink text-base"
      >
        📡
      </span>
      <span className="leading-tight">
        <span className="block text-sm font-bold tracking-tight text-ink">Opportunity Radar</span>
        <span className="block text-[9px] font-semibold tracking-[0.12em] whitespace-nowrap text-soft uppercase">
          Intelligence Layer
        </span>
      </span>
    </Link>
  );
}
