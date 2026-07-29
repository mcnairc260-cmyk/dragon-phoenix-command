import { Link } from 'react-router-dom';

export interface PricingTier {
  name: string;
  price: string;
  priceNote: string;
  description: string;
  features: string[];
  cta: { label: string; to: string };
  highlighted: boolean;
}

export function PricingCard({ tier }: { tier: PricingTier }) {
  return (
    <div
      className={`flex flex-col rounded-xl border p-6 ${
        tier.highlighted ? 'border-gold bg-surface2' : 'border-line bg-surface'
      }`}
    >
      {tier.highlighted && (
        <p className="mb-3 self-start rounded-full bg-gold/15 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.14em] text-gold uppercase">
          Most popular
        </p>
      )}
      <h3 className="font-display text-lg font-bold">{tier.name}</h3>
      <p className="mt-2">
        <span className="font-display text-3xl font-extrabold text-gold">{tier.price}</span>
        <span className="ml-1.5 font-mono text-[10px] text-smoke">{tier.priceNote}</span>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-muted">{tier.description}</p>
      <ul className="my-5 space-y-2">
        {tier.features.map((feature) => (
          <li key={feature} className="flex gap-2 text-sm text-muted">
            <span aria-hidden="true" className="text-gold">
              ✓
            </span>
            {feature}
          </li>
        ))}
      </ul>
      <Link
        to={tier.cta.to}
        className={`mt-auto rounded-lg px-4 py-2.5 text-center text-sm font-bold transition-opacity hover:opacity-90 ${
          tier.highlighted
            ? 'bg-gradient-to-r from-ember to-gold text-void'
            : 'border border-line-strong text-ash hover:border-gold hover:text-gold'
        }`}
      >
        {tier.cta.label}
      </Link>
    </div>
  );
}
