'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { MeProvider, useAction, useApp } from '@/components/app-context';
import { LifelineEditor, PasskeyPanel, PassphraseForm, ScheduleEditor } from '@/components/editors';
import { Badge, Button, Card, Logo, Notice } from '@/components/ui';
import { api, fmtDuration } from '@/lib/client';

function Steps() {
  const { me, refresh } = useApp();
  const r = me.readiness;
  const a = useAction();
  const [skippedPasskey, setSkippedPasskey] = useState(false);
  const [scheduleDone, setScheduleDone] = useState(false);
  const [lifelinesDone, setLifelinesDone] = useState(false); // adding the first person must not skip past this step
  const [understood, setUnderstood] = useState(false);
  const [open, setOpen] = useState<number | null>(null);
  useEffect(() => { if (me.protection.status !== 'setup') window.location.assign('/app'); }, [me.protection.status]);

  const demoLink = async (kind: string, re: RegExp) => {
    const { notifications } = await api('GET', '/history');
    const hit = notifications.find((n: any) => n.kind === kind && n.body);
    return hit?.body.match(re)?.[1] as string | undefined;
  };
  const done = [r.emailVerified, r.passphrase, r.passkeyEnrolled || skippedPasskey, r.lifeline && lifelinesDone, scheduleDone, false];
  const current = open ?? done.findIndex((d) => !d);
  const p = me.protection;
  const names = me.contacts.map((c: any) => c.name).join(', ');

  const steps = [
    { title: 'Confirm your email', body: (
      <div className="space-y-4">
        <p className="text-muted">We sent a link to <strong className="text-text">{me.user.email}</strong>. Open it to confirm that the address is yours.</p>
        {me.demoMode && (
          <Notice tone="accent">Demo mode: no real email was sent.{' '}
            <button className="font-medium text-accent underline" onClick={() => a.run('verify', async () => {
              const token = await demoLink('verify_email', /verify-email\/(\S+)/);
              if (token) await api('POST', '/auth/verify-email', { token });
              await refresh();
            })}>Confirm it for me</button>
          </Notice>
        )}
        <Button variant="secondary" busy={a.busy === 'resend'} onClick={() => a.run('resend', () => api('POST', '/auth/verify-email/resend', {}), 'Sent.')}>Send the link again</Button>
        <Button variant="ghost" onClick={refresh}>I confirmed it</Button>
      </div>
    ) },
    { title: 'Create your check-in passphrase', body: (
      <div className="space-y-4">
        <p className="text-muted">Each check-in asks for this passphrase. It is separate from your sign-in password, so a person who learns your password still cannot check in as you.</p>
        <PassphraseForm onSaved={() => setOpen(null)} />
      </div>
    ) },
    { title: 'Add this device', body: (
      <div className="space-y-4">
        <p className="text-muted">A passkey lets your phone or computer confirm it is you with Face ID, a fingerprint or your device PIN.</p>
        <PasskeyPanel onAdded={() => setOpen(null)} />
        {me.demoMode && !r.passkeyEnrolled && <Button variant="ghost" onClick={() => { setSkippedPasskey(true); setOpen(null); }}>Skip in demo mode (check-ins will be marked “simulated device”)</Button>}
        {r.passkeyEnrolled && <Button onClick={() => setOpen(null)}>Continue</Button>}
      </div>
    ) },
    { title: 'Choose your Lifelines', body: (
      <div className="space-y-4">
        <p className="text-muted">A Lifeline is a person you trust. If you miss a check-in, Lifeline tells them. Each person must accept first.</p>
        <LifelineEditor />
        {me.demoMode && me.contacts.some((c: any) => c.consent_status === 'pending') && (
          <Notice tone="accent">Demo mode: your Lifelines are fictional, so nobody can answer the request. Open <Link className="font-medium text-accent underline" href="/app/demo">Demo controls</Link> after set-up to open their consent page, or{' '}
            <button className="font-medium text-accent underline" onClick={() => a.run('consent', async () => {
              const { notifications } = await api('GET', '/history');
              for (const n of notifications.filter((x: any) => x.kind === 'consent_request' && x.body)) {
                const t = n.body.match(/consent\/(\S+)/)?.[1];
                if (t) await api('POST', `/consent/${t}`, { decision: 'grant' }).catch(() => {});
              }
              await refresh();
            })}>accept for them now</button>.
          </Notice>
        )}
        {r.lifeline && <Button onClick={() => { setLifelinesDone(true); setOpen(null); }}>Continue</Button>}
      </div>
    ) },
    { title: 'Set your schedule', body: <ScheduleEditor onSaved={() => { setScheduleDone(true); setOpen(null); }} /> },
    { title: 'Review and turn on', body: (
      <div className="space-y-4">
        <ul className="space-y-3 text-[15px] leading-relaxed">
          <li><strong>You check in</strong> at least every {fmtDuration(p.intervalSeconds)}, with your device and your passphrase.</li>
          <li><strong>Reminders</strong> go to you {p.reminderOffsets.length ? p.reminderOffsets.map((s: number) => fmtDuration(s)).join(' and ') + ' before the deadline' : 'only at the deadline'}.</li>
          <li><strong>If you miss the deadline</strong>, you get a final warning{p.graceSeconds ? ` and ${fmtDuration(p.graceSeconds)} more` : ''}.</li>
          <li><strong>After that</strong>, Lifeline tells {names || 'your Lifelines'} {p.escalationMode === 'simultaneous' ? 'at the same time' : `one after another, ${fmtDuration(p.stageWaitSeconds)} apart, until one confirms`}.</li>
          <li><strong>They receive</strong>: “{me.user.name || 'You'} missed a scheduled check-in. This means only that the check-in was missed.” plus your own message, if you wrote one.</li>
        </ul>
        <Notice tone="warn">
          <strong>What Lifeline cannot do.</strong> It cannot know why a check-in was missed. It does not contact emergency services. It cannot guarantee that an email, text or call reaches a person. It is not a rescue service.
          {me.demoMode && ' This is a demonstration build: every message is simulated and reaches nobody.'}
        </Notice>
        {!r.consentingLifeline && <Notice tone="warn">No Lifeline has accepted yet. You can turn protection on now, but nobody can be notified until one of them accepts.</Notice>}
        <label className="flex gap-3 text-sm leading-relaxed">
          <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-(--accent)" checked={understood} onChange={(e) => setUnderstood(e.target.checked)} />
          <span>I understand what happens when I miss a check-in, and what Lifeline cannot guarantee.</span>
        </label>
        {a.error && <Notice tone="danger">{a.error}</Notice>}
        <Button disabled={!understood} busy={a.busy === 'arm'} onClick={() => a.run('arm', async () => { await api('POST', '/protection/arm', {}); window.location.assign('/app'); })}>Turn on my protection</Button>
      </div>
    ) },
  ];

  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <div className="flex items-center justify-between">
        <Logo className="text-lg" />
        <button className="text-sm text-muted hover:text-text" onClick={async () => { await api('POST', '/auth/logout', {}); window.location.assign('/'); }}>Sign out</button>
      </div>
      <h1 className="mt-10 text-3xl font-semibold sm:text-4xl">Set up your protection</h1>
      <p className="mt-3 text-muted">Six short steps. You can change everything later.</p>
      <ol className="mt-8 space-y-3">
        {steps.map((s, i) => (
          <li key={s.title}>
            <Card className={current === i ? 'border-accent/50' : ''}>
              <button className="flex w-full items-center justify-between gap-3 text-left" aria-expanded={current === i} onClick={() => setOpen(current === i ? null : i)}>
                <span className="flex items-center gap-3">
                  <span className={`tnum grid size-8 shrink-0 place-items-center rounded-full text-sm font-semibold ${done[i] ? 'bg-ok/20 text-ok' : current === i ? 'bg-accent text-accent-ink' : 'bg-surface-2 text-muted'}`}>{done[i] ? '✓' : i + 1}</span>
                  <span className="text-lg font-semibold">{s.title}</span>
                </span>
                {done[i] && <Badge tone="ok">Done</Badge>}
              </button>
              {current === i && <div className="rise mt-5">{s.body}</div>}
            </Card>
          </li>
        ))}
      </ol>
    </main>
  );
}

export default function Onboarding() {
  return <MeProvider><Steps /></MeProvider>;
}
