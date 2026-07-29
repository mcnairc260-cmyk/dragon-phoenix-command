import { NavLink, Outlet } from 'react-router-dom';
import { Logo } from './Logo';
import { useSaved } from '../state/AppState';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Radar', icon: '📡' },
  { to: '/saved', label: 'Saved', icon: '🔖' },
  { to: '/pricing', label: 'Plans', icon: '💠' },
  { to: '/settings', label: 'Settings', icon: '⚙️' },
] as const;

function topNavClass({ isActive }: { isActive: boolean }) {
  return `rounded px-3 py-2 text-sm transition-colors ${
    isActive ? 'bg-surface2 text-gold' : 'text-muted hover:text-ash'
  }`;
}

function bottomNavClass({ isActive }: { isActive: boolean }) {
  return `flex flex-1 flex-col items-center gap-0.5 py-2 text-[10px] font-mono uppercase tracking-wider transition-colors ${
    isActive ? 'text-gold' : 'text-muted'
  }`;
}

export function AppLayout() {
  const { savedIds } = useSaved();

  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-20 border-b border-line bg-void/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3">
          <Logo to="/dashboard" />
          <nav aria-label="Application" className="hidden items-center gap-1 sm:flex">
            {NAV_ITEMS.map((item) => (
              <NavLink key={item.to} to={item.to} className={topNavClass}>
                {item.label}
                {item.to === '/saved' && savedIds.length > 0 && (
                  <span className="ml-1.5 rounded-full bg-gold/15 px-1.5 py-0.5 font-mono text-[10px] text-gold">
                    {savedIds.length}
                  </span>
                )}
              </NavLink>
            ))}
          </nav>
        </div>
      </header>
      <main className="mx-auto w-full max-w-6xl flex-1 px-4 pt-6 pb-24 sm:pb-10">
        <Outlet />
      </main>
      {/* Mobile bottom navigation */}
      <nav
        aria-label="Application mobile"
        className="fixed inset-x-0 bottom-0 z-20 flex border-t border-line bg-surface/95 backdrop-blur sm:hidden"
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
