'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { useApp } from './app-context';
import { Logo, cx } from './ui';

const ICONS: Record<string, string> = {
  Home: 'M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6H9v6H4a1 1 0 0 1-1-1v-9.5Z',
  Lifelines: 'M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21a8 8 0 0 1 16 0',
  Schedule: 'M12 7v5l3 2M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z',
  Security: 'M12 3 4 6v6c0 4.5 3.2 8 8 9 4.8-1 8-4.5 8-9V6l-8-3Z',
  Activity: 'M4 6h16M4 12h16M4 18h10',
  Account: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8ZM5 20a7 7 0 0 1 14 0',
  Demo: 'M9 3h6M10 3v6l-5 9a2 2 0 0 0 1.8 3h10.4a2 2 0 0 0 1.8-3l-5-9V3',
};
const Icon = ({ name }: { name: string }) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden><path d={ICONS[name]} /></svg>
);

export function AppShell({ children }: { children: ReactNode }) {
  const { me } = useApp();
  const path = usePathname();
  useEffect(() => { if (me.protection.status === 'setup') window.location.assign('/onboarding'); }, [me.protection.status]);
  const nav = [
    ['Home', '/app'], ['Lifelines', '/app/lifelines'], ['Schedule', '/app/schedule'], ['Security', '/app/security'],
    ['Activity', '/app/activity'], ['Account', '/app/account'], ...(me.demoMode ? [['Demo', '/app/demo']] : []),
  ];
  const mobile = [nav[0], nav[1], nav[3], nav[4], me.demoMode ? nav[6] : nav[5]];
  const active = (href: string) => (href === '/app' ? path === '/app' : path.startsWith(href));
  return (
    <div className="mx-auto flex min-h-dvh max-w-6xl flex-col md:flex-row">
      <aside className="hidden w-60 shrink-0 flex-col border-r border-line/60 px-4 py-6 md:flex">
        <Link href="/app" className="px-2"><Logo className="text-lg" /></Link>
        <nav aria-label="App" className="mt-8 space-y-1">
          {nav.map(([label, href]) => (
            <Link key={href} href={href} aria-current={active(href) ? 'page' : undefined}
              className={cx('flex items-center gap-3 rounded-xl px-3 py-2.5 text-[15px] font-medium', active(href) ? 'bg-surface-2 text-text' : 'text-muted hover:text-text')}>
              <Icon name={label} />{label === 'Demo' ? 'Demo controls' : label}
            </Link>
          ))}
        </nav>
        <p className="mt-auto px-2 text-xs leading-relaxed text-muted">Not an emergency service. In an emergency, call your local emergency number.</p>
      </aside>
      <div className="flex min-w-0 flex-1 flex-col">
        {me.demoMode && (
          <div role="status" className="border-b border-warn/30 bg-warn/10 px-5 py-2 text-center text-xs font-medium text-warn">
            Demonstration mode — every message is simulated. Nobody is contacted. Do not rely on this for real safety.
          </div>
        )}
        <header className="flex items-center justify-between px-5 pt-5 md:hidden">
          <Link href="/app"><Logo /></Link>
          <Link href="/app/account" className="text-sm text-muted">{me.user.name || 'Account'}</Link>
        </header>
        <main className="flex-1 px-5 pb-28 pt-6 md:px-10 md:pb-12 md:pt-10">{children}</main>
      </div>
      <nav aria-label="App" className="fixed inset-x-0 bottom-0 z-10 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
        <ul className="mx-auto grid max-w-md grid-cols-5">
          {mobile.map(([label, href]) => (
            <li key={href}>
              <Link href={href} aria-current={active(href) ? 'page' : undefined} className={cx('flex min-h-16 flex-col items-center justify-center gap-1 text-[11px] font-medium', active(href) ? 'text-accent' : 'text-muted')}>
                <Icon name={label} />{label}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </div>
  );
}

export function PageTitle({ title, lead }: { title: string; lead?: string }) {
  return (
    <div className="mb-6">
      <h1 className="text-2xl font-semibold sm:text-3xl">{title}</h1>
      {lead && <p className="mt-2 max-w-2xl text-muted">{lead}</p>}
    </div>
  );
}
