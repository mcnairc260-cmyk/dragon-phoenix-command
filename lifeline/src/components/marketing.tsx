import Link from 'next/link';
import type { ReactNode } from 'react';
import { Logo } from './ui';

export const PREVIEW_NOTE = 'Lifeline is a pre-launch preview. It is not yet approved for real-world safety use.';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-line/60 bg-bg/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Link href="/" aria-label="Lifeline home"><Logo className="text-lg" /></Link>
        <nav aria-label="Main" className="flex items-center gap-1 text-sm sm:gap-2">
          <Link href="/#how" className="hidden rounded-lg px-3 py-2 text-muted hover:text-text sm:block">How it works</Link>
          <Link href="/security" className="hidden rounded-lg px-3 py-2 text-muted hover:text-text sm:block">Security</Link>
          <Link href="/pricing" className="rounded-lg px-3 py-2 text-muted hover:text-text">Pricing</Link>
          <Link href="/login" className="rounded-lg px-3 py-2 text-muted hover:text-text">Sign in</Link>
          <Link href="/register" className="inline-flex min-h-10 items-center rounded-xl bg-accent px-4 font-semibold text-accent-ink hover:bg-accent-strong">Try the demo</Link>
        </nav>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="mt-24 border-t border-line/60">
      <div className="mx-auto max-w-6xl space-y-6 px-5 py-10 text-sm text-muted">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <Logo className="text-base text-text" />
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/pricing" className="hover:text-text">Pricing</Link>
            <Link href="/security" className="hover:text-text">Security &amp; privacy</Link>
            <Link href="/terms" className="hover:text-text">Terms</Link>
            <Link href="/privacy" className="hover:text-text">Privacy</Link>
          </nav>
        </div>
        <p className="max-w-3xl leading-relaxed">
          {PREVIEW_NOTE} Lifeline is not an emergency service and does not contact police, ambulance or fire services.
          A missed check-in means only that a check-in was missed. If you or someone else is in danger, call your local emergency number.
        </p>
        <p>Your Lifeline. Your Rules. Your Peace of Mind.</p>
      </div>
    </footer>
  );
}

export function Page({ title, lead, children }: { title: string; lead?: string; children: ReactNode }) {
  return (
    <>
      <SiteHeader />
      <main className="mx-auto max-w-3xl px-5 pb-10 pt-14">
        <h1 className="text-4xl font-semibold sm:text-5xl">{title}</h1>
        {lead && <p className="mt-4 text-lg leading-relaxed text-muted">{lead}</p>}
        <div className="mt-10 space-y-8 leading-relaxed [&_h2]:mb-2 [&_h2]:text-xl [&_h2]:font-semibold [&_li]:ml-5 [&_li]:list-disc [&_p]:text-muted [&_ul]:space-y-1.5 [&_ul]:text-muted">{children}</div>
      </main>
      <SiteFooter />
    </>
  );
}

export function PlanCards({ plans }: { plans: { id: string; name: string; priceCents: number; features: string[] }[] }) {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {plans.map((p) => (
        <div key={p.id} className={`rounded-2xl border bg-surface p-7 ${p.id === 'premium' ? 'border-accent/60' : 'border-line'}`}>
          <div className="flex items-baseline justify-between">
            <h3 className="text-xl font-semibold">{p.name}</h3>
            {p.id === 'premium' && <span className="rounded-full bg-accent/15 px-2.5 py-1 text-xs font-medium text-accent">Most protection</span>}
          </div>
          <p className="mt-3"><span className="tnum text-4xl font-semibold">${(p.priceCents / 100).toFixed(2)}</span><span className="text-muted"> / month</span></p>
          <ul className="mt-6 space-y-2.5 text-[15px]">
            {p.features.map((f) => (
              <li key={f} className="flex gap-2.5"><span aria-hidden className="mt-0.5 text-accent">✓</span><span>{f}</span></li>
            ))}
          </ul>
          <Link href="/register" className={`mt-7 inline-flex min-h-12 w-full items-center justify-center rounded-xl px-5 font-semibold ${p.id === 'premium' ? 'bg-accent text-accent-ink hover:bg-accent-strong' : 'border border-line bg-surface-2 hover:border-muted'}`}>
            Try the demo
          </Link>
        </div>
      ))}
    </div>
  );
}
