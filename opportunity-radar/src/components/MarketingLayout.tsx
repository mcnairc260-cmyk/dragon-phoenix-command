import { Link, NavLink, Outlet } from 'react-router-dom';
import { Logo } from './Logo';

const navLinkClass = ({ isActive }: { isActive: boolean }) =>
  `rounded px-3 py-2 text-sm transition-colors ${
    isActive ? 'text-gold' : 'text-muted hover:text-ash'
  }`;

export function MarketingLayout() {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-line">
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
              className="ml-2 hidden rounded-lg bg-gradient-to-r from-ember to-gold px-4 py-2 text-sm font-bold text-void transition-opacity hover:opacity-90 sm:block"
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
    <footer className="border-t border-line">
      <div className="mx-auto flex max-w-6xl flex-col items-center gap-4 px-4 py-10 text-center">
        <nav aria-label="Footer" className="flex flex-wrap justify-center gap-x-6 gap-y-2 text-sm">
          <Link to="/dashboard" className="text-muted hover:text-ash">
            Dashboard
          </Link>
          <Link to="/pricing" className="text-muted hover:text-ash">
            Pricing
          </Link>
          <Link to="/login" className="text-muted hover:text-ash">
            Log in
          </Link>
          <Link to="/signup" className="text-muted hover:text-ash">
            Sign up
          </Link>
        </nav>
        <p className="max-w-xl text-xs leading-relaxed text-smoke">
          All opportunities shown in this MVP are demonstration data for product illustration — not
          verified market research or investment advice.
        </p>
        <p className="font-mono text-[10px] tracking-[0.2em] text-smoke uppercase">
          Part of the{' '}
          <span className="text-gold">Dragon Phoenix Ascension</span> ecosystem — Fire Within.
          Power Unleashed.
        </p>
      </div>
    </footer>
  );
}
