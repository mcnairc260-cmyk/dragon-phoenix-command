import { useState } from 'react';
import { PricingCard, type PricingTier } from '../components/PricingCard';

const TIERS: PricingTier[] = [
  {
    name: 'Free',
    subtitle: 'Validate your first ideas.',
    price: '$0',
    priceNote: 'forever',
    description: 'Get a feel for the radar and follow a handful of opportunities.',
    features: [
      'Limited opportunity feed',
      'Basic filters and search',
      'Up to 5 saved opportunities',
      'Basic opportunity summaries',
    ],
    cta: { label: 'Start exploring', to: '/dashboard' },
    highlighted: false,
  },
  {
    name: 'Pro',
    subtitle: 'Professional market intelligence.',
    price: '$29',
    priceNote: '/mo · placeholder',
    description: 'The full intelligence layer for operators actively hunting their next move.',
    features: [
      'Full opportunity database',
      'Advanced filters and sorting',
      'Full Opportunity Score breakdowns',
      'Opportunity alerts',
      'Unlimited saved opportunities',
      'Detailed 7-day and 30-day action plans',
    ],
    cta: { label: 'Join the waitlist', to: '/signup' },
    highlighted: true,
  },
  {
    name: 'Founder',
    subtitle: 'The elite intelligence layer.',
    price: '$99',
    priceNote: '/mo · placeholder',
    description: 'For teams and serious builders who share research and move together.',
    features: [
      'Everything in Pro',
      'Team workspace',
      'Shared collections',
      'Exportable reports',
      'Early-signal alerts',
      'Priority intelligence features',
    ],
    cta: { label: 'Join the waitlist', to: '/signup' },
    highlighted: false,
  },
];

const COMPARISON: { feature: string; free: string; pro: string; founder: string }[] = [
  { feature: 'Opportunity feed', free: 'Limited', pro: 'Full database', founder: 'Full database' },
  { feature: 'Filters & sorting', free: 'Basic', pro: 'Advanced', founder: 'Advanced' },
  { feature: 'Score breakdown', free: '—', pro: 'Full', founder: 'Full' },
  { feature: 'Saved opportunities', free: '5', pro: 'Unlimited', founder: 'Unlimited' },
  { feature: 'Action plans', free: '—', pro: '7 & 30 day', founder: '7 & 30 day' },
  { feature: 'Team workspace', free: '—', pro: '—', founder: 'Included' },
  { feature: 'Exportable reports', free: '—', pro: '—', founder: 'Included' },
];

const FAQS: { q: string; a: string }[] = [
  {
    q: 'Can I change plans later?',
    a: 'Yes. Plans will be upgradeable and downgradeable at any time once billing is live. Nothing is charged in this MVP — paid tiers currently open a waitlist.',
  },
  {
    q: 'Is the opportunity data real?',
    a: 'No. Every opportunity in this build is clearly labeled demonstration data written to exercise the product. It is not verified market research, and none of it is investment advice.',
  },
  {
    q: 'Why is pricing marked as placeholder?',
    a: 'Launch pricing has not been finalized. The numbers shown illustrate the intended tier structure and will be confirmed before any payment processing goes live.',
  },
];

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false);
  return (
    <div className="rounded-xl border border-line bg-surface">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
      >
        <span className="text-sm font-bold text-ash">{q}</span>
        <span aria-hidden="true" className="text-xs text-muted">
          {open ? '▲' : '▼'}
        </span>
      </button>
      {open && (
        <p className="border-t border-line px-5 py-4 text-sm leading-relaxed text-body">{a}</p>
      )}
    </div>
  );
}

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <header className="mb-12 text-center">
        <h1 className="font-display text-3xl font-bold text-ash sm:text-4xl">
          Choose your intelligence tier
        </h1>
        <p className="mx-auto mt-3 max-w-xl text-base leading-relaxed text-body">
          Scale your market awareness from basic tracking to deep-pulse analysis.
        </p>
        <p className="mx-auto mt-5 max-w-xl rounded-lg bg-gold/12 px-4 py-2.5 text-xs leading-relaxed text-gold">
          Prices shown are placeholders while launch pricing is finalized. Payments are not live in
          this MVP — paid tiers open a waitlist, and billing will run on Stripe when it ships.
        </p>
      </header>

      <div className="grid gap-6 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <PricingCard key={tier.name} tier={tier} />
        ))}
      </div>

      <section className="mt-16">
        <h2 className="mb-6 text-center font-display text-2xl font-bold text-ash">
          Compare features
        </h2>
        <div className="overflow-x-auto rounded-2xl bg-surface shadow-card">
          <table className="w-full min-w-lg border-collapse text-left">
            <caption className="sr-only">Feature comparison across the three plans</caption>
            <thead>
              <tr className="border-b border-line">
                <th
                  scope="col"
                  className="px-5 py-3 text-[10px] font-semibold tracking-[0.1em] text-muted uppercase"
                >
                  Core features
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-[10px] font-semibold tracking-[0.1em] text-muted uppercase"
                >
                  Free
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-[10px] font-semibold tracking-[0.1em] text-gold uppercase"
                >
                  Pro
                </th>
                <th
                  scope="col"
                  className="px-5 py-3 text-[10px] font-semibold tracking-[0.1em] text-muted uppercase"
                >
                  Founder
                </th>
              </tr>
            </thead>
            <tbody>
              {COMPARISON.map((row) => (
                <tr key={row.feature} className="border-b border-line last:border-0">
                  <th scope="row" className="px-5 py-3.5 text-sm font-medium text-body">
                    {row.feature}
                  </th>
                  <td className="px-5 py-3.5 text-sm text-body">{row.free}</td>
                  <td className="px-5 py-3.5 text-sm font-semibold text-ash">{row.pro}</td>
                  <td className="px-5 py-3.5 text-sm text-body">{row.founder}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-16">
        <h2 className="mb-6 text-center font-display text-2xl font-bold text-ash">
          Frequently asked questions
        </h2>
        <div className="mx-auto max-w-2xl space-y-3">
          {FAQS.map((faq) => (
            <FaqItem key={faq.q} {...faq} />
          ))}
        </div>
      </section>

      <p className="mt-12 text-center text-[10px] font-semibold tracking-[0.08em] text-muted uppercase">
        No dark patterns · Cancel anytime · Demo data clearly labeled at every tier
      </p>
    </div>
  );
}
