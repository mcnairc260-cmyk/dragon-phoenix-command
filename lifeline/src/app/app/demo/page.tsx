'use client';
import { useEffect, useState } from 'react';
import { useAction, useApp } from '@/components/app-context';
import { PageTitle } from '@/components/app-shell';
import { Badge, Button, Card, Notice } from '@/components/ui';
import { ApiError, api, fmtDate } from '@/lib/client';

const JUMPS: [string, string, string][] = [
  ['reminder', 'Jump to the first reminder', 'Moves this account’s timers so the first reminder is due.'],
  ['deadline', 'Jump past the deadline', 'The deadline passes. You get the final warning and the grace period starts.'],
  ['grace', 'Jump past the grace period', 'Lifeline opens an incident and notifies the first stage of Lifelines.'],
  ['stage', 'Jump to the next escalation stage', 'If nobody confirmed receipt, the next Lifeline is notified.'],
  ['recovery', 'Skip the VaultLock recovery wait', 'Makes a waiting release request ready to complete.'],
];
const ATTEMPTS = (id?: string): [string, string, string, unknown][] => [
  ['Add a new Lifeline', 'POST', '/contacts', { name: 'Unknown Person', email: 'unknown@example.test', channels: ['email'] }],
  ['Change a Lifeline’s email', 'PUT', `/contacts/${id}`, { name: 'Changed', email: 'someone-else@example.test', channels: ['email'] }],
  ['Remove a Lifeline', 'DELETE', `/contacts/${id}`, undefined],
  ['Change the interval to 30 days', 'PUT', '/protection/settings', { intervalSeconds: 2592000 }],
  ['Make the grace period 7 days', 'PUT', '/protection/settings', { graceSeconds: 604800 }],
  ['Pause protection', 'POST', '/protection/pause', {}],
  ['Replace the check-in passphrase', 'POST', '/auth/passphrase', { passphrase: 'attacker passphrase' }],
];

export default function Demo() {
  const { me, refresh } = useApp();
  const a = useAction();
  const [inbox, setInbox] = useState<any[]>([]);
  const [results, setResults] = useState<{ label: string; status: number; code: string }[]>([]);
  const load = () => api('GET', '/history').then((h) => setInbox(h.notifications.filter((n: any) => n.simulated && n.body && n.status === 'accepted')), () => {});
  useEffect(() => { load(); }, [me.serverTime]);
  if (!me.demoMode) return <Notice>Demo controls are not available outside demonstration mode.</Notice>;

  const jump = (j: string) => a.run(j, async () => { await api('POST', '/demo/jump', { jump: j }); await refresh(); await load(); }, 'Done. The normal scheduler ran after the jump.');
  const attempt = async () => {
    const out = [];
    for (const [label, method, path, body] of ATTEMPTS(me.contacts[0]?.id)) {
      try { await api(method, path, body); out.push({ label, status: 200, code: 'ALLOWED' }); } catch (e) { out.push({ label, status: (e as ApiError).status, code: (e as ApiError).code }); }
    }
    setResults(out); await refresh();
  };
  const linkify = (body: string) => body.split(/(https?:\/\/\S+)/).map((part, i) => (/^https?:\/\//.test(part)
    ? <a key={i} className="break-all font-medium text-accent underline" href={new URL(part).pathname} target="_blank" rel="noreferrer">{new URL(part).pathname}</a> : part));

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageTitle title="Demo controls" lead="For demonstrations only. These controls exist only in demo mode and act only on your own account. Nothing here contacts a real person." />
      <Card>
        <h2 className="text-xl font-semibold">1. Fast-forward time</h2>
        <p className="mt-2 text-sm text-muted">Status now: <strong className="text-text">{me.protection.status}</strong> · deadline {fmtDate(me.protection.deadlineAt)}. A jump moves your timers into the past, then the real scheduler runs — the same code that runs in normal use.</p>
        <div className="mt-4 space-y-3">
          {JUMPS.map(([j, label, text]) => (
            <div key={j} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-line p-3">
              <p className="min-w-0 flex-1 text-sm"><span className="font-medium">{label}</span><br /><span className="text-muted">{text}</span></p>
              <Button variant="secondary" className="min-h-10 text-sm" busy={a.busy === j} onClick={() => jump(j)}>Go</Button>
            </div>
          ))}
        </div>
        {a.error && <div className="mt-3"><Notice tone="danger">{a.error}</Notice></div>}
        {a.ok && <div className="mt-3"><Notice tone="ok">{a.ok}</Notice></div>}
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">2. Simulated inbox</h2>
        <p className="mt-2 text-sm text-muted">Messages Lifeline would have sent. Open a link to act as that person: accept a Lifeline request, or confirm receipt of an alert.</p>
        <ul className="mt-4 space-y-3">
          {inbox.length === 0 && <li className="text-sm text-muted">No simulated messages yet.</li>}
          {inbox.map((n) => (
            <li key={n.id} className="rounded-xl border border-line p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-sm font-semibold">{n.subject || `${n.channel} message`}</p>
                <Badge tone="warn">Simulated {n.channel}</Badge>
              </div>
              <p className="text-xs text-muted">To: {n.contact_name ? `${n.contact_name} · ` : ''}{n.recipient} · {fmtDate(n.sent_at)}</p>
              <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-muted">{linkify(n.body)}</p>
            </li>
          ))}
        </ul>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">3. Try prohibited changes</h2>
        <p className="mt-2 text-sm text-muted">Sends real change requests from this signed-in session. With VaultLock {me.vaultlock.active ? 'active, the server must refuse every one (HTTP 423)' : 'off, the server asks for identity confirmation instead (HTTP 403). Seal first to see VaultLock refuse them'}. Each attempt is written to the security log.</p>
        <Button variant="secondary" className="mt-4" onClick={attempt}>Attempt all changes</Button>
        {results.length > 0 && (
          <ul className="mt-4 divide-y divide-line text-sm">
            {results.map((r) => (
              <li key={r.label} className="flex items-center justify-between gap-3 py-2.5"><span>{r.label}</span><Badge tone={r.status === 423 ? 'ok' : r.status === 200 ? 'danger' : 'warn'}>{r.status === 423 ? 'Blocked by VaultLock' : r.status === 200 ? 'ALLOWED' : `Refused · ${r.code}`}</Badge></li>
            ))}
          </ul>
        )}
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">4. Simulate database tampering</h2>
        <p className="mt-2 text-sm text-muted">Plays the part of an attacker with direct database access who rewrites your first Lifeline’s email. With VaultLock active, the dashboard shows an integrity warning and alerts still go to the sealed address.</p>
        <Button variant="secondary" className="mt-4" busy={a.busy === 'tamper'} onClick={() => a.run('tamper', async () => { await api('POST', '/demo/tamper', {}); await refresh(); }, 'Email rewritten in the database. Open Home or Security to see the integrity check.')}>Rewrite a Lifeline’s email</Button>
      </Card>

      <Card>
        <h2 className="text-xl font-semibold">5. Billing events</h2>
        <p className="mt-2 text-sm text-muted">Shows that a billing problem does not stop the countdown. Subscription now: <strong className="text-text">{me.user.subStatus}</strong>.</p>
        <div className="mt-4 flex flex-wrap gap-3">
          {[['payment_failed', 'Payment fails'], ['cancelled', 'Subscription cancelled'], ['recovered', 'Payment recovers']].map(([ev, label]) => (
            <Button key={ev} variant="secondary" className="min-h-10 text-sm" busy={a.busy === ev} onClick={() => a.run(ev, async () => { await api('POST', '/demo/billing', { event: ev }); await refresh(); })}>{label}</Button>
          ))}
        </div>
      </Card>
    </div>
  );
}
