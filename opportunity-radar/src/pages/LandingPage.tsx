import { Link } from 'react-router-dom';
import { OPPORTUNITIES } from '../data/opportunities';
import { SCORE_BANDS, SCORE_FACTOR_LABELS, SCORE_WEIGHTS } from '../lib/score';
import type { ScoreComponents } from '../types/opportunity';
import { DemoBadge, ScoreBadge } from '../components/badges';

const HOW_IT_WORKS = [
  {
    step: '01',
    title: 'Signals are gathered',
    detail:
      'Market signals — search growth, hiring demand, funding, regulation, technology shifts — are collected and normalized. (This MVP runs on structured demonstration data; the live pipeline is on the roadmap.)',
  },
  {
    step: '02',
    title: 'AI clusters them into opportunities',
    detail:
      'Related signals are grouped into concrete, actionable opportunity briefs: who the customer is, why the timing works, what it costs to start.',
  },
  {
    step: '03',
    title: 'Every opportunity gets scored',
    detail:
      'A transparent 0–100 Opportunity Score weighs growth, competition, revenue potential, timing, execution difficulty, and data confidence — with every component visible.',
  },
  {
    step: '04',
    title: 'You act before the crowd',
    detail:
      'Filter by your budget, skills, and risk tolerance. Save what fits. Each brief ends in a concrete 7-day and 30-day action plan.',
  },
];

const FEATURES = [
  { icon: '📡', title: 'Opportunity feed', detail: 'A scannable radar of emerging opportunities across ten industries, sortable by score, growth, competition, and cost.' },
  { icon: '🧭', title: 'Why-now analysis', detail: 'Every opportunity explains its timing: the signals that opened the window and how long it may stay open.' },
  { icon: '💯', title: 'Transparent scoring', detail: 'No black boxes — every score shows its six weighted components and how they combine.' },
  { icon: '🎯', title: 'Fit-based recommendations', detail: 'Your budget, experience, and risk tolerance shape which opportunities surface first.' },
  { icon: '🗺️', title: 'Action plans', detail: 'Strategic plans plus first-7-days and first-30-days checklists turn analysis into motion.' },
  { icon: '🔖', title: 'Saved opportunities', detail: 'Build your personal watchlist and come back when the timing is right.' },
];

export default function LandingPage() {
  const examples = [...OPPORTUNITIES].sort((a, b) => b.score - a.score).slice(0, 3);
  const factorKeys = Object.keys(SCORE_WEIGHTS) as (keyof ScoreComponents)[];

  return (
    <div className="mx-auto max-w-6xl px-4">
      {/* Hero — Stitch layout: left-aligned copy, radar visualization right */}
      <section className="grid items-center gap-10 border-b border-line py-16 sm:py-20 lg:grid-cols-2">
        <div>
          <p className="mb-5 inline-flex items-center gap-1.5 rounded-full bg-gold-soft px-3 py-1 text-[10px] font-semibold tracking-[0.1em] text-gold-ink uppercase">
            <span aria-hidden="true">●</span> AI Opportunity Intelligence
          </p>
          <h1 className="max-w-xl text-4xl leading-[1.1] font-bold tracking-tight text-ink sm:text-5xl">
            Find opportunities before{' '}
            <span className="text-gold-ink">everyone else.</span>
          </h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-body">
            Opportunity Radar helps entrepreneurs, creators, and ambitious professionals discover
            high-potential business opportunities <em>before</em> they become obvious — with
            transparent scoring, timing analysis, and concrete action plans instead of hype.
          </p>
          <div className="mt-8 flex flex-wrap items-center gap-3">
            <Link
              to="/dashboard"
              className="rounded-lg bg-gold px-6 py-3 text-sm font-bold text-ink transition-opacity hover:opacity-90"
            >
              Explore Opportunities →
            </Link>
            <a
              href="#how-it-works"
              className="rounded-lg border border-line-strong px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-ink"
            >
              See How It Works
            </a>
          </div>
          <p className="mt-6 text-[10px] font-semibold tracking-[0.08em] text-soft uppercase">
            Free to explore · No credit card · Demo dataset
          </p>
        </div>

        {/* Radar visualization: concentric rings with a gold pulse point */}
        <div className="relative hidden justify-center lg:flex" aria-hidden="true">
          <svg width="360" height="360" viewBox="0 0 360 360">
            {[60, 105, 150].map((r) => (
              <circle
                key={r}
                cx="180"
                cy="180"
                r={r}
                fill="none"
                stroke="var(--color-line)"
                strokeWidth="1.5"
              />
            ))}
            <circle cx="180" cy="180" r="4" fill="var(--color-ink)" />
            <circle cx="262" cy="118" r="7" fill="var(--color-gold)" />
            <circle cx="118" cy="240" r="5" fill="var(--color-emerald)" />
          </svg>
          <div className="absolute top-1/2 left-1/2 w-64 -translate-x-1/2 -translate-y-1/2 rounded-xl bg-ink p-4 text-on-ink shadow-card-hover">
            <p className="mb-2 flex items-center gap-2 text-xs font-bold">
              <span aria-hidden="true">✨</span> New signal found
            </p>
            <p className="rounded-lg bg-white/10 p-2.5 text-[11px] leading-relaxed text-on-ink-soft">
              Search interest in profession-specific AI training keeps climbing.
            </p>
            <p className="mt-2 text-[9px] font-semibold tracking-[0.08em] text-on-ink-soft uppercase">
              Demo signal · illustrative
            </p>
          </div>
        </div>
      </section>

      {/* Value proposition */}
      <section className="grid gap-6 border-b border-line py-14 sm:grid-cols-3">
        {[
          {
            title: 'Built for movers',
            detail:
              'Entrepreneurs, freelancers, creators, and investors who want to enter markets early — not after the listicle.',
          },
          {
            title: 'Evidence over hype',
            detail:
              'Every opportunity separates verified data from AI interpretation and estimates. If something is a guess, it says so.',
          },
          {
            title: 'Analysis that ends in action',
            detail:
              'Each brief closes with a strategic plan and your first 7 and 30 days — because insight without motion is trivia.',
          },
        ].map((item) => (
          <div key={item.title}>
            <h2 className="mb-2 text-lg font-bold tracking-tight text-ink">{item.title}</h2>
            <p className="text-sm leading-relaxed text-body">{item.detail}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-line py-14">
        <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-soft uppercase">Process</p>
        <h2 className="mb-8 text-2xl font-bold tracking-tight text-ink">How Opportunity Radar works</h2>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step) => (
            <li key={step.step} className="rounded-xl border border-line bg-card p-5">
              <p className="mb-2 text-xs font-semibold text-gold-ink">{step.step}</p>
              <h3 className="mb-2 text-sm font-bold">{step.title}</h3>
              <p className="text-xs leading-relaxed text-body">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Example opportunities */}
      <section className="border-b border-line py-14">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div>
            <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-soft uppercase">
              On the radar
            </p>
            <h2 className="text-2xl font-bold tracking-tight text-ink">Example opportunities</h2>
          </div>
          <DemoBadge />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {examples.map((o) => (
            <Link
              key={o.id}
              to={`/opportunities/${o.slug}`}
              className="rounded-xl border border-line bg-card p-5 transition-colors hover:border-line-strong"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="text-[10px] font-medium tracking-[0.14em] text-gold-ink uppercase">
                  {o.category}
                </p>
                <ScoreBadge score={o.score} isDemo={o.isDemo} />
              </div>
              <h3 className="mb-2 text-base leading-snug font-bold">{o.title}</h3>
              <p className="line-clamp-3 text-sm leading-relaxed text-body">{o.shortDescription}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-line py-14">
        <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-soft uppercase">
          Intelligence
        </p>
        <h2 className="mb-8 text-2xl font-bold tracking-tight text-ink">Key intelligence features</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-line bg-card p-5">
              <p aria-hidden="true" className="mb-2 text-xl">
                {f.icon}
              </p>
              <h3 className="mb-1.5 text-sm font-bold">{f.title}</h3>
              <p className="text-xs leading-relaxed text-body">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Score explanation */}
      <section className="border-b border-line py-14">
        <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-soft uppercase">Scoring</p>
        <h2 className="mb-4 text-2xl font-bold tracking-tight text-ink">The Opportunity Score</h2>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-body">
          Every opportunity is scored 0–100 from six weighted factors. The weights are fixed and
          public, every component is shown on the detail page, and scores from demo data are always
          labeled as demo scores.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="space-y-2 rounded-xl border border-line bg-card p-5">
            {factorKeys.map((key) => (
              <li key={key} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-ink">{SCORE_FACTOR_LABELS[key]}</span>
                <span className="text-xs font-semibold text-gold-ink">
                  {Math.round(SCORE_WEIGHTS[key] * 100)}%
                </span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 rounded-xl border border-line bg-card p-5">
            {SCORE_BANDS.map((band, i) => {
              const prev = SCORE_BANDS[i - 1];
              const rangeLabel = `${band.min}–${prev ? prev.min - 1 : 100}`;
              return (
                <li key={band.label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-ink">{band.label}</span>
                  <span className="text-xs font-semibold text-body">{rangeLabel}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Social proof placeholder */}
      <section className="border-b border-line py-14">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <h2 className="text-2xl font-bold tracking-tight text-ink">What early users say</h2>
          <span className="rounded border border-gold/30 bg-gold/10 px-2 py-0.5 text-[10px] font-medium tracking-[0.12em] text-gold-ink uppercase">
            Placeholder — illustrative, not real testimonials
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            'The kind of quote an early user might give about spotting a niche weeks before it hit the mainstream.',
            'The kind of quote a freelancer might give about picking a service niche using the fit-based recommendations.',
            'The kind of quote an operator might give about the 7-day plans making the first step obvious.',
          ].map((text, i) => (
            <figure key={i} className="rounded-xl border border-line bg-card p-5">
              <blockquote className="text-sm leading-relaxed text-body">“{text}”</blockquote>
              <figcaption className="mt-3 text-[10px] font-semibold tracking-[0.08em] text-soft uppercase">
                Placeholder testimonial {i + 1}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-b border-line py-14 text-center">
        <h2 className="mb-3 text-2xl font-bold tracking-tight text-ink">Simple, honest pricing</h2>
        <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-body">
          Start free. Upgrade to Pro for the full database, score breakdowns, and action plans — or
          Founder for team workspaces and exportable reports. Placeholder pricing while the launch
          plan is finalized.
        </p>
        <Link
          to="/pricing"
          className="rounded-lg border border-line-strong px-6 py-3 text-sm font-bold text-ink transition-colors hover:border-gold hover:text-gold-ink"
        >
          View pricing →
        </Link>
      </section>

      {/* Final CTA — Stitch dark conversion band */}
      <section className="my-14 rounded-2xl bg-ink px-6 py-16 text-center text-on-ink sm:py-20">
        <h2 className="mx-auto max-w-2xl text-3xl leading-tight font-bold tracking-tight sm:text-4xl">
          The best opportunities don't announce themselves.{' '}
          <span className="text-gold">The radar does.</span>
        </h2>
        <p className="mx-auto mt-4 max-w-xl text-sm leading-relaxed text-on-ink-soft">
          Explore the full demo radar — no account required, every record clearly labeled as
          demonstration data.
        </p>
        <div className="mt-8 flex flex-wrap justify-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-lg bg-gold px-8 py-3.5 text-sm font-bold text-ink transition-opacity hover:opacity-90"
          >
            Explore Opportunities
          </Link>
          <Link
            to="/pricing"
            className="rounded-lg border border-white/25 px-8 py-3.5 text-sm font-bold text-on-ink transition-colors hover:border-white/60"
          >
            View plans
          </Link>
        </div>
      </section>
    </div>
  );
}
