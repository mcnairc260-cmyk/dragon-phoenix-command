import { Link, NavLink, Outlet } from 'react-router-dom';
import { Logo } from './Logo';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'text-ink underline decoration-gold decoration-2 underline-offset-8' : 'text-soft hover:text-ink'
  }`;

export function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line bg-card">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-4">
          <Logo />
          <nav aria-label="Main" className="flex items-center gap-1">
            <NavLink to="/pricing" className={navLinkClass}>
              Pricing
            </NavLink>
            <NavLink to="/login" className={navLinkClass}>
              Log in
            </NavLink>
            <Link
              to="/dashboard"
              className="ml-2 hidden rounded-lg bg-ink px-4 py-2 text-sm font-bold text-on-ink transition-opacity hover:opacity-90 sm:block"
            >
              Explore Opportunities
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <Outlet />
      </main>
      <MarketingFooter />
    </div>
  );
}

export function MarketingFooter() {
  return (
    <footer className="bg-ink text-on-ink">
      <div className="mx-auto max-w-6xl px-4 py-12">
        <div className="flex flex-col gap-8 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-xs">
            <p className="text-lg font-bold tracking-tight">Opportunity Radar</p>
            <p className="mt-2 text-sm leading-relaxed text-on-ink-soft">
              Empowering decision-makers with the intelligence layer for the modern market.
            </p>
          </div>
          <nav aria-label="Footer" className="flex gap-12">
            <div>
              <p className="mb-3 text-[10px] font-semibold tracking-[0.14em] text-on-ink-soft uppercase">
                Product
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/dashboard" className="text-on-ink-soft hover:text-on-ink">
                    Dashboard
                  </Link>
                </li>
                <li>
                  <Link to="/pricing" className="text-on-ink-soft hover:text-on-ink">
                    Pricing
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <p className="mb-3 text-[10px] font-semibold tracking-[0.14em] text-on-ink-soft uppercase">
                Account
              </p>
              <ul className="space-y-2 text-sm">
                <li>
                  <Link to="/login" className="text-on-ink-soft hover:text-on-ink">
                    Log in
                  </Link>
                </li>
                <li>
                  <Link to="/signup" className="text-on-ink-soft hover:text-on-ink">
                    Sign up
                  </Link>
                </li>
              </ul>
            </div>
          </nav>
        </div>
        <div className="mt-10 border-t border-white/10 pt-6 text-center">
          <p className="mx-auto max-w-xl text-xs leading-relaxed text-on-ink-soft">
            All opportunities shown in this MVP are demonstration data for product illustration —
            not verified market research or investment advice.
          </p>
          <p className="mt-3 text-[10px] font-semibold tracking-[0.16em] text-on-ink-soft uppercase">
            Part of the <span className="text-gold">Dragon Phoenix Ascension</span> ecosystem —
            Fire Within. Power Unleashed.
          </p>
        </div>
      </div>
    </footer>
  );
}
