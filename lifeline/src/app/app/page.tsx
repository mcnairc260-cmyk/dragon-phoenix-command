'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAction, useApp, useNow } from '@/components/app-context';
import { Ring } from '@/components/ring';
import { Badge, Button, Card, Field, LockIcon, Modal, Notice } from '@/components/ui';
import { api, fmtCountdown, fmtDate, fmtDuration, passkeyAssertion } from '@/lib/client';

const STATUS = {
  active: { label: 'Protected', tone: 'ok', text: 'Your countdown is running.' },
  grace: { label: 'Check-in overdue', tone: 'warn', text: 'You are in your grace period. Check in now.' },
  escalating: { label: 'Lifelines are being notified', tone: 'danger', text: 'You missed a check-in. Check in to stop messages that are not sent yet.' },
  paused: { label: 'Paused', tone: 'muted', text: 'Protection is off. Nobody will be notified.' },
  setup: { label: 'Not set up', tone: 'muted', text: '' },
} as const;

function VerifyModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { me, refresh } = useApp();
  const [passphrase, setPassphrase] = useState('');
  const [result, setResult] = useState<any>(null);
  const a = useAction();
  useEffect(() => { if (open) { setPassphrase(''); setResult(null); a.setError(''); } }, [open]); // eslint-disable-line react-hooks/exhaustive-deps
  return (
    <Modal open={open} onClose={onClose} title={result ? 'You are checked in' : 'Verify I’m OK'}>
      {result ? (
        <div className="space-y-4">
          <Notice tone="ok">Your next check-in is due by <strong>{fmtDate(result.deadlineAt)}</strong>.{result.resolvedIncident && ' Messages that were not sent yet were stopped. Messages already sent cannot be recalled; the people who received one were told that you checked in.'}</Notice>
          {result.device === 'simulated' && <p className="text-sm text-muted">Device check: simulated (demo mode, no passkey enrolled).</p>}
          <Button className="w-full" onClick={onClose}>Done</Button>
        </div>
      ) : (
        <form className="space-y-4" onSubmit={(e) => {
          e.preventDefault();
          a.run('go', async () => {
            const assertion = await passkeyAssertion('/checkin/options');
            const out = await api('POST', '/checkin', { passphrase, assertion });
            await refresh();
            setResult(out);
          });
        }}>
          <p className="text-sm leading-relaxed text-muted">Enter your check-in passphrase{me.readiness.passkeyEnrolled ? '. Your device will then ask for Face ID, fingerprint or PIN.' : '.'}</p>
          <Field label="Check-in passphrase" type="password" autoComplete="off" autoFocus required value={passphrase} onChange={(e) => setPassphrase(e.target.value)} />
          {a.error && <Notice tone="danger">{a.error}</Notice>}
          <Button type="submit" busy={a.busy === 'go'} className="w-full">Verify</Button>
        </form>
      )}
    </Modal>
  );
}

export default function Dashboard() {
  const { me, refresh, skew } = useApp();
  const now = useNow(skew);
  const [verify, setVerify] = useState(false);
  const [recent, setRecent] = useState<any[]>([]);
  const a = useAction();
  const p = me.protection;
  const s = STATUS[p.status as keyof typeof STATUS];
  useEffect(() => { api('GET', '/history').then((h) => setRecent(h.notifications.slice(0, 4)), () => {}); }, [me.serverTime]);

  const deadline = p.deadlineAt ? new Date(p.deadlineAt).getTime() : 0;
  const graceEnd = p.graceEndsAt ? new Date(p.graceEndsAt).getTime() : 0;
  const target = p.status === 'grace' ? graceEnd : deadline;
  const left = Math.max(0, target - now);
  const span = p.status === 'grace' ? p.graceSeconds * 1000 : p.intervalSeconds * 1000;
  const cd = fmtCountdown(left);
  const live = p.status === 'active' || p.status === 'grace';
  const order = [...me.contacts].sort((x: any, y: any) => x.stage - y.stage || x.priority - y.priority);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      {me.recovery && (
        <Notice tone="warn">
          A request to release VaultLock is waiting. It can be completed after <strong>{fmtDate(me.recovery.effective_at)}</strong>. Your protection is still active. If you did not start this:{' '}
          <button className="font-semibold underline" onClick={() => a.run('cancel', async () => { await api('POST', '/vaultlock/recovery/cancel', {}); await refresh(); })}>cancel the request</button>.
        </Notice>
      )}
      {me.vaultlock.active && me.vaultlock.integrity !== 'ok' && (
        <Notice tone="danger"><strong>Integrity warning.</strong> Your live settings no longer match your sealed plan ({me.vaultlock.differences.join(', ')}). Alerts will still follow the sealed plan. This was recorded in your security log.</Notice>
      )}

      <Card className="flex flex-col items-center gap-6 py-8 text-center sm:py-10">
        <Badge tone={s.tone}>{s.label}</Badge>
        <Ring fraction={live ? left / span : p.status === 'escalating' ? 0 : 1} tone={s.tone}>
          {live ? (
            <>
              <span className="text-xs uppercase tracking-widest text-muted">{p.status === 'grace' ? 'Grace ends in' : 'Check in within'}</span>
              {cd.days > 0 && <span className="tnum text-2xl font-semibold text-muted">{cd.days} day{cd.days === 1 ? '' : 's'}</span>}
              <span className="tnum text-4xl font-semibold sm:text-5xl" role="timer" aria-label={`${cd.days} days ${cd.clock} remaining`}>{cd.clock}</span>
            </>
          ) : (
            <span className="px-6 text-lg font-semibold">{p.status === 'escalating' ? 'Check-in missed' : 'Paused'}</span>
          )}
        </Ring>
        <p className="max-w-sm text-muted">{s.text}</p>
        {p.status === 'paused' ? (
          <Button busy={a.busy === 'resume'} onClick={() => a.run('resume', async () => { await api('POST', '/protection/resume', {}); await refresh(); })}>Turn protection back on</Button>
        ) : (
          <Button className="min-h-14 w-full max-w-xs text-lg" onClick={() => setVerify(true)}>Verify I’m OK</Button>
        )}
        {a.error && <Notice tone="danger">{a.error}</Notice>}
        <dl className="grid w-full max-w-md grid-cols-2 gap-4 border-t border-line pt-6 text-left text-sm">
          <div><dt className="text-muted">Next deadline</dt><dd className="mt-1 font-medium">{fmtDate(p.deadlineAt)}</dd></div>
          <div><dt className="text-muted">Last verified</dt><dd className="mt-1 font-medium">{fmtDate(p.lastCheckinAt)}</dd></div>
        </dl>
      </Card>

      <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
        <Card>
          <h2 className="text-lg font-semibold">What happens next</h2>
          <ol className="mt-4 space-y-3 text-sm">
            {live && p.status === 'active' && [...p.reminderOffsets].sort((x: number, y: number) => y - x).map((o: number) => (
              <li key={o} className={`flex justify-between gap-3 ${deadline - o * 1000 < now ? 'text-muted line-through' : ''}`}><span>Reminder to you</span><span className="text-muted">{fmtDate(new Date(deadline - o * 1000))}</span></li>
            ))}
            {live && <li className="flex justify-between gap-3"><span>Deadline + final warning</span><span className="text-muted">{fmtDate(p.deadlineAt)}</span></li>}
            {live && <li className="flex justify-between gap-3"><span>Lifelines notified{p.graceSeconds ? ` (after ${fmtDuration(p.graceSeconds)} grace)` : ''}</span><span className="text-muted">{fmtDate(p.graceEndsAt)}</span></li>}
            {p.status === 'escalating' && me.incident && <li>Stage {me.incident.stage} sent.{me.incident.next_stage_at ? ` Next stage at ${fmtDate(me.incident.next_stage_at)} unless someone confirms.` : ' No more stages are scheduled.'}</li>}
            {p.status === 'paused' && <li className="text-muted">Nothing. Protection is paused.</li>}
          </ol>
          <Link href="/app/schedule" className="mt-4 inline-block text-sm font-medium text-accent">Schedule: every {fmtDuration(p.intervalSeconds)} →</Link>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Lifelines</h2>
            <Link href="/app/lifelines" className="text-sm font-medium text-accent">{me.vaultlock.active ? 'View' : 'Manage'} →</Link>
          </div>
          <p className="mt-1 text-sm text-muted">{p.escalationMode === 'simultaneous' ? 'All notified at the same time' : p.escalationMode === 'sequential' ? `One at a time, ${fmtDuration(p.stageWaitSeconds)} apart` : `Custom stages, ${fmtDuration(p.stageWaitSeconds)} apart`}</p>
          <ul className="mt-4 space-y-2.5 text-sm">
            {order.map((c: any, i: number) => (
              <li key={c.id} className="flex items-center justify-between gap-3">
                <span><span className="tnum mr-2 text-muted">{p.escalationMode === 'custom' ? c.stage : p.escalationMode === 'sequential' ? i + 1 : '•'}</span>{c.name}</span>
                <Badge tone={c.consent_status === 'granted' ? 'ok' : c.consent_status === 'pending' ? 'warn' : 'danger'}>{c.consent_status === 'granted' ? 'Accepted' : c.consent_status === 'pending' ? 'Waiting' : 'Not notified'}</Badge>
              </li>
            ))}
          </ul>
          {!me.readiness.consentingLifeline && <p className="mt-3 text-sm text-warn">Nobody has accepted yet, so nobody can be notified.</p>}
        </Card>

        <Card className={me.vaultlock.active ? 'border-accent/50' : ''}>
          <div className="flex items-center justify-between">
            <h2 className="flex items-center gap-2 text-lg font-semibold"><LockIcon className="size-5 text-accent" />VaultLock</h2>
            <Badge tone={me.vaultlock.active ? 'accent' : 'muted'}>{me.vaultlock.active ? 'Sealed' : 'Off'}</Badge>
          </div>
          <p className="mt-3 text-sm leading-relaxed text-muted">
            {me.vaultlock.active
              ? `Sealed on ${fmtDate(me.vaultlock.sealedAt)}. Your Lifelines, schedule, passphrase and devices can be viewed but not changed from a normal session. Check-ins work as normal.`
              : 'Your settings can be changed by anyone who can sign in and confirm your identity. Seal them so that a stolen phone or password cannot switch protection off.'}
          </p>
          <Link href="/app/security" className="mt-4 inline-block text-sm font-medium text-accent">{me.vaultlock.active ? 'Details' : 'Turn on VaultLock'} →</Link>
        </Card>

        <Card>
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Recent messages</h2>
            <Link href="/app/activity" className="text-sm font-medium text-accent">All activity →</Link>
          </div>
          <ul className="mt-4 space-y-2.5 text-sm">
            {recent.length === 0 && <li className="text-muted">Nothing yet.</li>}
            {recent.map((n) => (
              <li key={n.id} className="flex min-w-0 justify-between gap-3"><span className="min-w-0 truncate">{n.subject || n.kind} <span className="text-muted">→ {n.contact_name ?? 'you'}</span></span><span className="shrink-0 text-muted">{n.simulated ? 'simulated' : n.status}</span></li>
            ))}
          </ul>
          <p className="mt-4 border-t border-line pt-3 text-sm text-muted">Plan: {me.plan.name} · <Link href="/app/account" className="text-accent">Account</Link></p>
        </Card>
      </div>
      <VerifyModal open={verify} onClose={() => setVerify(false)} />
    </div>
  );
}
