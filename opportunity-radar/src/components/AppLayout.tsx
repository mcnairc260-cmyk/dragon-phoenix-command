import { Link, NavLink, Outlet } from 'react-router-dom';
import { Logo } from './Logo';
import { useSaved } from '../state/AppState';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Feed', icon: '📡' },
  { to: '/saved', label: 'Saved', icon: '🔖' },
  { to: '/pricing', label: 'Plans', icon: '💠' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
] as const;

function sideNavClass({ isActive }: { isActive: boolean }) {
  return `flex items-center gap-3 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
    isActive ? 'bg-gold text-ink' : 'text-body hover:bg-tint hover:text-ink'
  }`;
}

function topNavClass({ isActive }: { isActive: boolean }) {
  return `rounded px-3 py-2 text-sm font-medium transition-colors ${
    isActive ? 'bg-gold/25 text-ink' : 'text-soft hover:text-ink'
  }`;
}

function bottomNavClass({ isActive }: { isActive: boolean }) {
  return `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-semibold uppercase tracking-wider transition-colors ${
    isActive ? 'text-gold-ink' : 'text-soft'
  }`;
}

function SavedCount() {
  const { savedIds } = useSaved();
  if (savedIds.length === 0) return null;
  return (
    <span className="ml-auto rounded-full bg-ink/10 px-2 py-0.5 text-[10px] font-bold text-ink">
      {savedIds.length}
    </span>
  );
}

export function AppLayout() {
  const { savedIds } = useSaved();

  return (
    <div className="min-h-screen lg:flex">
      {/* Desktop sidebar — per the Stitch dashboard screen */}
      <aside className="sticky top-0 hidden h-screen w-60 flex-shrink-0 flex-col border-r border-line bg-card lg:flex">
        <div className="border-b border-line px-4 py-5">
          <Logo to="/dashboard" />
          <p className="mt-2 text-[9px] font-semibold tracking-[0.12em] text-faint uppercase">
            Demo build
          </p>
        </div>
        <nav aria-label="Application" className="flex-1 space-y-1 px-3 py-4">
          {NAV_ITEMS.map((item) => (
            <NavLink key={item.to} to={item.to} className={sideNavClass}>
              <span aria-hidden="true">{item.icon}</span>
              {item.label}
              {item.to === '/saved' && <SavedCount />}
            </NavLink>
          ))}
        </nav>
        <div className="px-3 pb-5">
          <div className="rounded-xl bg-ink p-4 text-on-ink">
            <p className="text-sm font-bold">Upgrade to Founder</p>
            <p className="mt-1 text-xs leading-relaxed text-on-ink-soft">
              Team workspace, shared collections, exportable reports.
            </p>
            <Link
              to="/pricing"
              className="mt-3 block rounded-lg bg-gold px-3 py-2 text-center text-xs font-bold text-ink transition-opacity hover:opacity-90"
            >
              View plans
            </Link>
          </div>
        </div>
      </aside>

      {/* min-w-0 lets the content column shrink beside the fixed sidebar */}
      <div className="flex min-h-screen min-w-0 flex-1 flex-col">
        {/* Top bar (mobile / tablet) */}
        <header className="sticky top-0 z-20 border-b border-line bg-card/95 backdrop-blur lg:hidden">
          <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
            <Logo to="/dashboard" />
            <nav aria-label="Application" className="hidden items-center gap-1 sm:flex">
              {NAV_ITEMS.map((item) => (
                <NavLink key={item.to} to={item.to} className={topNavClass}>
                  {item.label}
                  {item.to === '/saved' && savedIds.length > 0 && (
                    <span className="ml-1.5 rounded-full bg-ink/10 px-1.5 py-0.5 text-[10px] font-bold text-ink">
                      {savedIds.length}
                    </span>
                  )}
                </NavLink>
              ))}
            </nav>
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 lg:px-8 sm:pb-10">
          <Outlet />
        </main>
      </div>

      {/* Mobile bottom navigation */}
      <nav
        aria-label="Application mobile"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-card/95 backdrop-blur sm:hidden"
      >
        {NAV_ITEMS.map((item) => (
          <NavLink key={item.to} to={item.to} className={bottomNavClass}>
            <span aria-hidden="true" className="text-base">
              {item.icon}
            </span>
            {item.label}
            {item.to === '/saved' && savedIds.length > 0 && (
              <span className="sr-only">({savedIds.length} saved)</span>
            )}
          </NavLink>
        ))}
      </nav>
    </div>
  );
}
