import { Link } from 'react-router-dom';

export interface PricingTier {
  name: string;
  subtitle: string;
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
      className={`relative flex flex-col rounded-2xl bg-surface p-6 ${
        tier.highlighted
          ? 'border-2 border-gold shadow-card-hover'
          : 'border border-line shadow-card'
      }`}
    >
      {tier.highlighted && (
        <p className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gold px-3 py-1 text-[9px] font-bold tracking-[0.1em] text-void uppercase">
          Most popular
        </p>
      )}
      <h3 className="font-display text-lg font-bold text-ash">{tier.name}</h3>
      <p className="mt-1 text-sm text-muted">{tier.subtitle}</p>
      <p className="mt-4">
        <span className="font-display text-4xl font-bold text-ash">{tier.price}</span>
        <span className="ml-1.5 text-xs font-medium text-muted">{tier.priceNote}</span>
      </p>
      <p className="mt-3 text-sm leading-relaxed text-body">{tier.description}</p>
      <ul className="my-5 space-y-2.5">
        {tier.features.map((feature) => (
          <li key={feature} className="flex gap-2 text-sm text-body">
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
            ? 'bg-gold text-void'
            : tier.name === 'Founder'
              ? 'bg-surface3 text-ash border border-line-strong'
              : 'border border-line-strong text-ash hover:border-gold'
        }`}
      >
        {tier.cta.label}
      </Link>
    </div>
  );
}
