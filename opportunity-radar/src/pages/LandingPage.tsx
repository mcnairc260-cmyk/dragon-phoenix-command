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
      {/* Hero */}
      <section className="border-b border-line py-16 text-center sm:py-24">
        <p className="mb-4 font-mono text-[10px] tracking-[0.3em] text-ember uppercase">
          // Your AI Opportunity Intelligence Platform
        </p>
        <h1 className="mx-auto max-w-3xl font-display text-4xl leading-tight font-extrabold sm:text-6xl">
          See tomorrow's markets{' '}
          <span className="bg-gradient-to-r from-ember via-gold to-cyan bg-clip-text text-transparent">
            today.
          </span>
        </h1>
        <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-muted">
          Opportunity Radar helps entrepreneurs, creators, and ambitious professionals discover
          high-potential business opportunities <em>before</em> they become obvious to everyone
          else — with transparent scoring, timing analysis, and concrete action plans instead of
          hype.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link
            to="/dashboard"
            className="rounded-lg bg-gradient-to-r from-ember to-gold px-6 py-3 text-sm font-bold text-void transition-opacity hover:opacity-90"
          >
            Explore Opportunities
          </Link>
          <a
            href="#how-it-works"
            className="rounded-lg border border-line-strong px-6 py-3 text-sm font-bold text-ash transition-colors hover:border-gold hover:text-gold"
          >
            See How It Works
          </a>
        </div>
        <p className="mt-6 font-mono text-[10px] tracking-[0.14em] text-smoke uppercase">
          Free to explore · No credit card · Demo dataset
        </p>
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
            <h2 className="mb-2 font-display text-lg font-bold">{item.title}</h2>
            <p className="text-sm leading-relaxed text-muted">{item.detail}</p>
          </div>
        ))}
      </section>

      {/* How it works */}
      <section id="how-it-works" className="border-b border-line py-14">
        <p className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ember uppercase">// Process</p>
        <h2 className="mb-8 font-display text-2xl font-extrabold">How Opportunity Radar works</h2>
        <ol className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
          {HOW_IT_WORKS.map((step) => (
            <li key={step.step} className="rounded-xl border border-line bg-surface p-5">
              <p className="mb-2 font-mono text-xs text-gold">{step.step}</p>
              <h3 className="mb-2 text-sm font-bold">{step.title}</h3>
              <p className="text-xs leading-relaxed text-muted">{step.detail}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Example opportunities */}
      <section className="border-b border-line py-14">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <div>
            <p className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ember uppercase">
              // On the radar
            </p>
            <h2 className="font-display text-2xl font-extrabold">Example opportunities</h2>
          </div>
          <DemoBadge />
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {examples.map((o) => (
            <Link
              key={o.id}
              to={`/opportunities/${o.slug}`}
              className="rounded-xl border border-line bg-surface p-5 transition-colors hover:border-line-strong"
            >
              <div className="mb-3 flex items-start justify-between gap-3">
                <p className="font-mono text-[10px] tracking-[0.14em] text-gold uppercase">
                  {o.category}
                </p>
                <ScoreBadge score={o.score} isDemo={o.isDemo} />
              </div>
              <h3 className="mb-2 font-display text-base leading-snug font-bold">{o.title}</h3>
              <p className="line-clamp-3 text-sm leading-relaxed text-muted">{o.shortDescription}</p>
            </Link>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="border-b border-line py-14">
        <p className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ember uppercase">
          // Intelligence
        </p>
        <h2 className="mb-8 font-display text-2xl font-extrabold">Key intelligence features</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map((f) => (
            <div key={f.title} className="rounded-xl border border-line bg-surface p-5">
              <p aria-hidden="true" className="mb-2 text-xl">
                {f.icon}
              </p>
              <h3 className="mb-1.5 text-sm font-bold">{f.title}</h3>
              <p className="text-xs leading-relaxed text-muted">{f.detail}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Score explanation */}
      <section className="border-b border-line py-14">
        <p className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ember uppercase">// Scoring</p>
        <h2 className="mb-4 font-display text-2xl font-extrabold">The Opportunity Score</h2>
        <p className="mb-6 max-w-2xl text-sm leading-relaxed text-muted">
          Every opportunity is scored 0–100 from six weighted factors. The weights are fixed and
          public, every component is shown on the detail page, and scores from demo data are always
          labeled as demo scores.
        </p>
        <div className="grid gap-6 lg:grid-cols-2">
          <ul className="space-y-2 rounded-xl border border-line bg-surface p-5">
            {factorKeys.map((key) => (
              <li key={key} className="flex items-center justify-between gap-4 text-sm">
                <span className="text-ash">{SCORE_FACTOR_LABELS[key]}</span>
                <span className="font-mono text-xs text-gold">
                  {Math.round(SCORE_WEIGHTS[key] * 100)}%
                </span>
              </li>
            ))}
          </ul>
          <ul className="space-y-2 rounded-xl border border-line bg-surface p-5">
            {SCORE_BANDS.map((band, i) => {
              const prev = SCORE_BANDS[i - 1];
              const rangeLabel = `${band.min}–${prev ? prev.min - 1 : 100}`;
              return (
                <li key={band.label} className="flex items-center justify-between gap-4 text-sm">
                  <span className="text-ash">{band.label}</span>
                  <span className="font-mono text-xs text-muted">{rangeLabel}</span>
                </li>
              );
            })}
          </ul>
        </div>
      </section>

      {/* Social proof placeholder */}
      <section className="border-b border-line py-14">
        <div className="mb-8 flex flex-wrap items-center gap-3">
          <h2 className="font-display text-2xl font-extrabold">What early users say</h2>
          <span className="rounded border border-gold/30 bg-gold/10 px-2 py-0.5 font-mono text-[9px] tracking-[0.12em] text-gold uppercase">
            Placeholder — illustrative, not real testimonials
          </span>
        </div>
        <div className="grid gap-4 sm:grid-cols-3">
          {[
            'The kind of quote an early user might give about spotting a niche weeks before it hit the mainstream.',
            'The kind of quote a freelancer might give about picking a service niche using the fit-based recommendations.',
            'The kind of quote an operator might give about the 7-day plans making the first step obvious.',
          ].map((text, i) => (
            <figure key={i} className="rounded-xl border border-line bg-surface p-5">
              <blockquote className="text-sm leading-relaxed text-muted">“{text}”</blockquote>
              <figcaption className="mt-3 font-mono text-[10px] tracking-[0.12em] text-smoke uppercase">
                Placeholder testimonial {i + 1}
              </figcaption>
            </figure>
          ))}
        </div>
      </section>

      {/* Pricing preview */}
      <section className="border-b border-line py-14 text-center">
        <h2 className="mb-3 font-display text-2xl font-extrabold">Simple, honest pricing</h2>
        <p className="mx-auto mb-6 max-w-xl text-sm leading-relaxed text-muted">
          Start free. Upgrade to Pro for the full database, score breakdowns, and action plans — or
          Founder for team workspaces and exportable reports. Placeholder pricing while the launch
          plan is finalized.
        </p>
        <Link
          to="/pricing"
          className="rounded-lg border border-line-strong px-6 py-3 text-sm font-bold text-ash transition-colors hover:border-gold hover:text-gold"
        >
          View pricing →
        </Link>
      </section>

      {/* Final CTA */}
      <section className="py-16 text-center sm:py-20">
        <h2 className="mx-auto max-w-2xl font-display text-3xl leading-tight font-extrabold sm:text-4xl">
          The best opportunities don't announce themselves.{' '}
          <span className="bg-gradient-to-r from-ember to-gold bg-clip-text text-transparent">
            The radar does.
          </span>
        </h2>
        <div className="mt-8">
          <Link
            to="/dashboard"
            className="rounded-lg bg-gradient-to-r from-ember to-gold px-8 py-3.5 text-sm font-bold text-void transition-opacity hover:opacity-90"
          >
            Explore Opportunities
          </Link>
        </div>
      </section>
    </div>
  );
}
