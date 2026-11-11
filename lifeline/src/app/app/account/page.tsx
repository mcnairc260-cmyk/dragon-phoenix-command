'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAction, useApp } from '@/components/app-context';
import { PageTitle } from '@/components/app-shell';
import { Badge, Button, Card, Notice } from '@/components/ui';
import { api } from '@/lib/client';

const SUB: Record<string, { label: string; tone: 'ok' | 'warn' | 'danger' | 'muted' }> = {
  none: { label: 'No subscription (preview)', tone: 'muted' }, active: { label: 'Active', tone: 'ok' }, active_simulated: { label: 'Active (simulated)', tone: 'ok' },
  past_due: { label: 'Payment failed', tone: 'danger' }, canceled: { label: 'Cancelled', tone: 'warn' },
};

export default function Account() {
  const { me, refresh } = useApp();
  const a = useAction();
  const [plans, setPlans] = useState<any[]>([]);
  useEffect(() => { api('GET', '/plans').then((p) => setPlans(p.plans)); }, []);
  const sub = SUB[me.user.subStatus] ?? SUB.none;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageTitle title="Account" />
      <Card>
        <p className="text-lg font-semibold">{me.user.name}</p>
        <p className="text-muted">{me.user.email}</p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link href="/app/activity" className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface-2 px-4 text-sm font-medium md:hidden">Activity</Link>
          <Link href="/app/schedule" className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface-2 px-4 text-sm font-medium md:hidden">Schedule</Link>
          <a href="/api/export" download="lifeline-export.json" className="inline-flex min-h-11 items-center rounded-xl border border-line bg-surface-2 px-4 text-sm font-medium">Download my data</a>
          <Button variant="secondary" className="min-h-11 text-sm" onClick={async () => { await api('POST', '/auth/logout', {}); window.location.assign('/'); }}>Sign out</Button>
        </div>
      </Card>
      <Card>
        <div className="flex items-center justify-between">
          <h2 className="text-xl font-semibold">Plan: {me.plan.name}</h2>
          <Badge tone={sub.tone}>{sub.label}</Badge>
        </div>
        {(me.user.subStatus === 'past_due' || me.user.subStatus === 'canceled') && (
          <div className="mt-4"><Notice tone="warn">There is a billing problem. <strong>Your countdown is still running and alerts will still be sent.</strong> Lifeline never switches off active protection silently because of a payment.</Notice></div>
        )}
        <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
          {plans.map((p) => (
            <div key={p.id} className={`rounded-xl border p-4 ${p.id === me.plan.id ? 'border-accent/60' : 'border-line'}`}>
              <p className="font-semibold">{p.name} <span className="tnum font-normal text-muted">${(p.priceCents / 100).toFixed(2)}/month</span></p>
              <p className="mt-1 text-sm text-muted">{p.maxContacts} Lifelines · {p.channels.join(', ')} · {p.maxReminders} reminders</p>
              {p.id === me.plan.id ? <p className="mt-3 text-sm font-medium text-accent">Your plan</p> : (
                <Button variant="secondary" className="mt-3 min-h-10 text-sm" busy={a.busy === p.id} onClick={() => a.run(p.id, async () => {
                  const out = await api('POST', '/billing/checkout', { plan: p.id });
                  if (out.url) window.location.assign(out.url); else await refresh();
                })}>Switch to {p.name}</Button>
              )}
            </div>
          ))}
        </div>
        {a.error && <div className="mt-3"><Notice tone="danger">{a.error}</Notice></div>}
        <p className="mt-4 text-sm text-muted">{me.demoMode ? 'Demo mode: plan changes are simulated. No card is asked for and nothing is charged.' : 'Payments are handled by Stripe.'} Prices are provisional. VaultLock is included in every plan.</p>
      </Card>
      <Card>
        <h2 className="text-xl font-semibold">Closing your account</h2>
        <p className="mt-2 text-sm leading-relaxed text-muted">Account deletion is not automated in this preview. While VaultLock is active, a deletion request must go through VaultLock recovery first, so that deleting an account cannot be used to switch protection off. The final process needs legal review.</p>
      </Card>
    </div>
  );
}
