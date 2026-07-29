import { Link } from 'react-router-dom';
import type { Opportunity } from '../types/opportunity';
import { formatCostRange } from '../lib/format';
import {
  CompetitionBadge,
  ConfidenceBadge,
  DemoBadge,
  GrowthBadge,
  ScoreBadge,
  Stat,
  TimeWindowBadge,
} from './badges';
import { SaveButton } from './SaveButton';

export function OpportunityCard({ opportunity }: { opportunity: Opportunity }) {
  const o = opportunity;
  return (
    <article className="flex flex-col rounded-xl border border-line bg-surface p-4 transition-colors hover:border-line-strong">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1 flex flex-wrap items-center gap-2 font-mono text-[10px] tracking-[0.14em] text-gold uppercase">
            {o.category}
            <span className="text-smoke normal-case tracking-normal">· {o.opportunityType}</span>
            {o.isDemo && <DemoBadge />}
          </p>
          <h3 className="font-display text-base leading-snug font-bold">
            <Link
              to={`/opportunities/${o.slug}`}
              className="hover:text-gold focus-visible:text-gold"
            >
              {o.title}
            </Link>
          </h3>
        </div>
        <ScoreBadge score={o.score} isDemo={o.isDemo} />
      </div>

      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-muted">{o.shortDescription}</p>

      <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
        <GrowthBadge velocity={o.growthVelocity} />
        <CompetitionBadge level={o.competitionLevel} />
        <TimeWindowBadge window={o.timeWindow} />
        <ConfidenceBadge confidence={o.confidence} />
      </div>

      <dl className="mb-4 grid grid-cols-3 gap-2 border-t border-line pt-3">
        <Stat label="Startup cost" value={formatCostRange(o.startupCostRange)} />
        <Stat label="Difficulty" value={o.difficulty} />
        <Stat label="Time to market" value={o.timeToMarket.split(' to ')[0]} />
      </dl>

      <div className="mt-auto flex items-center justify-between gap-2">
        <Link
          to={`/opportunities/${o.slug}`}
          className="rounded-lg bg-gradient-to-r from-ember to-gold px-3.5 py-2 text-xs font-bold text-void transition-opacity hover:opacity-90"
        >
          Full analysis →
        </Link>
        <SaveButton opportunityId={o.id} title={o.title} />
      </div>
    </article>
  );
}
