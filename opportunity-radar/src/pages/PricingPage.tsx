import { PricingCard, type PricingTier } from '../components/PricingCard';

const TIERS: PricingTier[] = [
  {
    name: 'Free',
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
    price: '$29',
    priceNote: '/month · placeholder',
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
    price: '$99',
    priceNote: '/month · placeholder',
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

export default function PricingPage() {
  return (
    <div className="mx-auto max-w-6xl px-4 py-14">
      <header className="mb-10 text-center">
        <p className="mb-2 font-mono text-[10px] tracking-[0.24em] text-ember uppercase">// Plans</p>
        <h1 className="font-display text-3xl font-extrabold">Pricing</h1>
        <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-muted">
          Prices shown are placeholders while launch pricing is finalized. Payments are not live in
          this MVP — paid tiers open a waitlist, and billing will run on Stripe when it ships.
        </p>
      </header>
      <div className="grid gap-5 lg:grid-cols-3">
        {TIERS.map((tier) => (
          <PricingCard key={tier.name} tier={tier} />
        ))}
      </div>
      <p className="mt-8 text-center font-mono text-[10px] tracking-[0.12em] text-smoke uppercase">
        No dark patterns · Cancel anytime · Demo data clearly labeled at every tier
      </p>
    </div>
  );
}
