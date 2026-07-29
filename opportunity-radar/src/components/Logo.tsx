import { Link } from 'react-router-dom';

/**
 * Product lockup for Opportunity Radar inside the DPA family.
 *
 * The canonical DPA monogram and the phoenix hero emblem are reserved brand
 * marks (design/brand/DPA_BRAND_GUIDE_v1.png). Per the guide's usage
 * principles they must not be redrawn or substituted, so this product uses its
 * own radar glyph in the brand's silver-and-ember metal treatment and carries
 * the DPA endorsement as a wordmark instead.
 */
export function Logo({ to = '/' }: { to?: string }) {
  return (
    <Link to={to} className="flex items-center gap-2.5" aria-label="Opportunity Radar home">
      <span
        aria-hidden="true"
        className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg border border-line-ember bg-void"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="9" stroke="var(--color-ash)" strokeWidth="1.25" opacity="0.45" />
          <circle cx="12" cy="12" r="5" stroke="var(--color-ash)" strokeWidth="1.25" opacity="0.7" />
          <circle cx="12" cy="12" r="1.75" fill="var(--color-ember)" />
          <circle cx="17.5" cy="6.5" r="2" fill="var(--color-gold)" />
        </svg>
      </span>
      <span className="leading-tight">
        <span className="font-display block text-[13px] font-bold tracking-[0.04em] text-ash uppercase">
          Opportunity Radar
        </span>
        <span className="block text-[8px] font-semibold tracking-[0.16em] whitespace-nowrap text-ember uppercase">
          Dragon Phoenix Ascension
        </span>
      </span>
    </Link>
  );
}
