import { useEffect } from 'react';
import { Link, useParams } from 'react-router-dom';
import { useOpportunities, useOpportunity } from '../state/useOpportunities';
import { useRecent, useToasts } from '../state/AppState';
import { formatCostRange, formatDate } from '../lib/format';
import {
  CompetitionBadge,
  ConfidenceBadge,
  DemoBadge,
  GrowthBadge,
  ScoreBadge,
  SignalStrengthIndicator,
  Stat,
  TimeWindowBadge,
} from '../components/badges';
import { ScoreBreakdown } from '../components/ScoreBreakdown';
import { SaveButton } from '../components/SaveButton';
import { EmptyState, ErrorState } from '../components/states';

function Section({ label, title, children }: { label: string; title: string; children: React.ReactNode }) {
  return (
    <section className="border-t border-line py-6">
      <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-soft uppercase">{label}</p>
      <h2 className="mb-3 text-lg font-bold tracking-tight text-ink">{title}</h2>
      {children}
    </section>
  );
}

function PlanList({ items }: { items: string[] }) {
  return (
    <ol className="space-y-2">
      {items.map((item, i) => (
        <li key={i} className="flex gap-3 text-sm leading-relaxed text-body">
          <span className="text-xs font-semibold text-gold-ink">{String(i + 1).padStart(2, '0')}</span>
          <span>{item}</span>
        </li>
      ))}
    </ol>
  );
}

function DetailSkeleton() {
  return (
    <div className="animate-pulse space-y-4" role="status" aria-label="Loading opportunity">
      <div className="h-3 w-32 rounded bg-tint" />
      <div className="h-8 w-2/3 rounded bg-tint" />
      <div className="h-24 w-full rounded-xl bg-tint" />
      <div className="h-40 w-full rounded-xl bg-tint" />
      <span className="sr-only">Loading…</span>
    </div>
  );
}

function DataProvenanceNote() {
  return (
    <div className="rounded-xl border border-emerald/25 bg-emerald/5 p-4 text-xs leading-relaxed text-body">
      <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-emerald-ink uppercase">
        How to read this analysis
      </p>
      <p>
        <strong className="text-ink">Verified data:</strong> none in this record — it is
        demonstration content.{' '}
        <strong className="text-ink">AI interpretation:</strong> the narrative sections (why now,
        competition analysis, action plans) are generated interpretations.{' '}
        <strong className="text-ink">Estimates:</strong> costs, timelines, and score components are
        illustrative estimates.{' '}
        <strong className="text-ink">Predictions:</strong> growth and timing outlooks are
        speculative. Nothing on this page is investment, legal, or financial advice.
      </p>
    </div>
  );
}

export default function OpportunityDetailPage() {
  const { slug } = useParams<{ slug: string }>();
  const state = useOpportunity(slug);
  const allState = useOpportunities();
  const { recordView } = useRecent();
  const { showToast } = useToasts();

  const opportunity = state.status === 'ready' ? state.data : null;

  useEffect(() => {
    if (opportunity) recordView(opportunity.id);
  }, [opportunity, recordView]);

  if (state.status === 'loading') return <DetailSkeleton />;
  if (state.status === 'error') return <ErrorState message={state.message} />;
  if (!opportunity) {
    return (
      <EmptyState
        icon="🛰️"
        title="Opportunity not found"
        description="This opportunity isn't on the radar. It may have been removed, or the link may be wrong."
        action={
          <Link
            to="/dashboard"
            className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-ink"
          >
            Back to the radar
          </Link>
        }
      />
    );
  }

  const o = opportunity;
  const related =
    allState.status === 'ready'
      ? o.relatedOpportunityIds.flatMap((id) => allState.data.find((x) => x.id === id) ?? [])
      : [];

  const handleShare = async () => {
    const url = window.location.href;
    try {
      await navigator.clipboard.writeText(url);
      showToast('Link copied to clipboard');
    } catch {
      showToast('Could not copy the link — copy it from the address bar');
    }
  };

  return (
    <article>
      <nav aria-label="Breadcrumb" className="mb-4 text-[10px] font-medium text-soft">
        <Link to="/dashboard" className="hover:text-gold-ink">
          Radar
        </Link>{' '}
        / {o.category}
      </nav>

      {/* Header */}
      <header className="mb-6">
        <p className="mb-2 flex flex-wrap items-center gap-2 text-[10px] font-medium tracking-[0.14em] text-gold-ink uppercase">
          {o.category} <span className="text-soft normal-case">· {o.opportunityType} · {o.locationMode}</span>
          <DemoBadge />
        </p>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <h1 className="max-w-2xl text-2xl leading-tight font-bold tracking-tight text-ink sm:text-3xl">
            {o.title}
          </h1>
          <ScoreBadge score={o.score} isDemo={o.isDemo} size="lg" />
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
          <GrowthBadge velocity={o.growthVelocity} />
          <CompetitionBadge level={o.competitionLevel} />
          <TimeWindowBadge window={o.timeWindow} />
          <ConfidenceBadge confidence={o.confidence} />
        </div>
        <div className="mt-4 flex flex-wrap items-center gap-2">
          <SaveButton opportunityId={o.id} title={o.title} variant="full" />
          <button
            type="button"
            onClick={handleShare}
            className="rounded-lg border border-line-strong px-4 py-2 text-sm font-bold text-ink hover:border-gold hover:text-gold-ink"
          >
            🔗 Share
          </button>
          <button
            type="button"
            disabled
            title="Report export ships with the Pro plan"
            className="cursor-not-allowed rounded-lg border border-line px-4 py-2 text-sm font-bold text-soft"
          >
            📄 Export report (Pro)
          </button>
        </div>
        <p className="mt-3 text-[10px] font-medium text-soft">
          Added {formatDate(o.createdAt)} · Updated {formatDate(o.updatedAt)}
        </p>
      </header>

      <DataProvenanceNote />

      <Section label="Summary" title="Executive summary">
        <p className="mb-3 text-sm leading-relaxed text-body">{o.shortDescription}</p>
        <p className="text-sm leading-relaxed text-body">{o.fullDescription}</p>
        <dl className="mt-4 grid grid-cols-2 gap-3 rounded-xl border border-line bg-card p-4 sm:grid-cols-4">
          <Stat label="Startup cost" value={formatCostRange(o.startupCostRange)} />
          <Stat label="Difficulty" value={o.difficulty} />
          <Stat label="Time to market" value={o.timeToMarket} />
          <Stat label="Target customer" value={o.targetCustomer.split(':')[0]} />
        </dl>
        <p className="mt-3 text-sm leading-relaxed text-body">
          <strong className="text-ink">Target customer:</strong> {o.targetCustomer}
        </p>
      </Section>

      <Section label="Timing" title="Why now?">
        <p className="mb-4 text-sm leading-relaxed text-body">{o.whyNow}</p>
        <h3 className="mb-2 text-[10px] font-semibold tracking-[0.08em] text-emerald-ink uppercase">
          Key market signals <span className="text-soft normal-case">(AI-estimated, demo)</span>
        </h3>
        <ul className="space-y-3">
          {o.signals.map((signal) => (
            <li key={signal.headline} className="rounded-xl border border-line bg-card p-4">
              <div className="mb-1.5 flex flex-wrap items-center justify-between gap-2">
                <span className="text-[10px] font-semibold tracking-[0.08em] text-emerald-ink uppercase">
                  {signal.category}
                </span>
                <SignalStrengthIndicator strength={signal.strength} />
              </div>
              <p className="mb-1 text-sm font-bold text-ink">{signal.headline}</p>
              <p className="mb-2 text-sm leading-relaxed text-body">{signal.detail}</p>
              <p className="text-[10px] font-medium text-soft">
                {signal.evidence === 'verified' ? 'Verified source' : 'Estimate'} — {signal.sourceNote}
              </p>
            </li>
          ))}
        </ul>
      </Section>

      <Section label="Score" title="Opportunity Score breakdown">
        <ScoreBreakdown components={o.scoreComponents} isDemo={o.isDemo} />
      </Section>

      <Section label="Market" title="Competition & revenue">
        <div className="grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-card p-4">
            <h3 className="mb-2 text-sm font-bold">Competition analysis</h3>
            <p className="mb-2 text-sm leading-relaxed text-body">
              Competition level: <CompetitionBadge level={o.competitionLevel} />
            </p>
            <ul className="space-y-2">
              {o.risks.map((risk) => (
                <li key={risk.title} className="text-sm leading-relaxed text-body">
                  <span
                    className={`mr-1.5 text-[10px] font-medium uppercase ${
                      risk.severity === 'High'
                        ? 'text-danger'
                        : risk.severity === 'Medium'
                          ? 'text-gold-ink'
                          : 'text-emerald-ink'
                    }`}
                  >
                    {risk.severity} risk
                  </span>
                  <strong className="text-ink">{risk.title}.</strong> {risk.detail}
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <h3 className="mb-2 text-sm font-bold">Revenue models</h3>
            <ul className="space-y-2">
              {o.revenueModels.map((model) => (
                <li key={model.name} className="text-sm leading-relaxed text-body">
                  <strong className="text-ink">{model.name}.</strong> {model.description}
                </li>
              ))}
            </ul>
          </div>
        </div>
      </Section>

      <Section label="Execution" title="Strategic action plan">
        <PlanList items={o.actionPlan} />
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          <div className="rounded-xl border border-line bg-card p-4">
            <h3 className="mb-3 text-[10px] font-semibold tracking-[0.08em] text-gold-ink uppercase">
              First 7 days
            </h3>
            <PlanList items={o.sevenDayPlan} />
          </div>
          <div className="rounded-xl border border-line bg-card p-4">
            <h3 className="mb-3 text-[10px] font-semibold tracking-[0.08em] text-gold-ink uppercase">
              First 30 days
            </h3>
            <PlanList items={o.thirtyDayPlan} />
          </div>
        </div>
      </Section>

      {related.length > 0 && (
        <Section label="Adjacent" title="Related opportunities">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {related.map((r) => (
              <Link
                key={r.id}
                to={`/opportunities/${r.slug}`}
                className="rounded-xl border border-line bg-card p-4 transition-colors hover:border-line-strong"
              >
                <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-soft uppercase">
                  {r.category}
                </p>
                <p className="mb-2 text-sm leading-snug font-bold text-ink">{r.title}</p>
                <p className="text-xs font-semibold text-gold-ink">
                  Score {r.score} · {r.growthVelocity}
                </p>
              </Link>
            ))}
          </div>
        </Section>
      )}
    </article>
  );
}
