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
    <article className="flex flex-col rounded-2xl bg-surface p-4 shadow-card transition-shadow hover:shadow-card-hover">
      <div className="mb-3 flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="mb-1.5 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center rounded-full bg-ember/12 px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-gold uppercase">
              {o.category}
            </span>
            <span className="text-[10px] font-medium text-muted">{o.opportunityType}</span>
            {o.isDemo && <DemoBadge />}
          </p>
          <h3 className="text-base leading-snug font-bold tracking-tight text-ash">
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

      <p className="mb-4 line-clamp-3 text-sm leading-relaxed text-body">{o.shortDescription}</p>

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
          className="rounded-lg bg-gold px-3.5 py-2 text-xs font-bold text-void transition-opacity hover:opacity-90"
        >
          Full analysis →
        </Link>
        <SaveButton opportunityId={o.id} title={o.title} />
      </div>
    </article>
  );
}
