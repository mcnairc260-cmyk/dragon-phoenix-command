'use client';
import { useEffect, useState } from 'react';
import { useAction, useApp } from '@/components/app-context';
import { PageTitle } from '@/components/app-shell';
import { PasskeyPanel, PassphraseForm } from '@/components/editors';
import { Badge, Button, Card, LockIcon, Modal, Notice } from '@/components/ui';
import { api, fmtDate } from '@/lib/client';

const SEALS = ['Lifelines: who they are, their email and phone, their order, your messages', 'Schedule: interval, grace period, reminders, escalation rules', 'Pausing or switching off protection', 'Your check-in passphrase', 'Adding or removing sign-in devices'];

function VaultLock() {
  const { me, refresh, guarded } = useApp();
  const a = useAction();
  const [ack, setAck] = useState(false);
  const [key, setKey] = useState('');
  const [saved, setSaved] = useState(false);
  const v = me.vaultlock;
  return (
    <Card className={v.active ? 'border-accent/50' : ''}>
      <div className="flex items-center justify-between">
        <h2 className="flex items-center gap-2 text-xl font-semibold"><LockIcon className="size-5 text-accent" />VaultLock</h2>
        <Badge tone={v.active ? 'accent' : 'muted'}>{v.active ? `Sealed · version ${v.version}` : 'Off'}</Badge>
      </div>
      {v.active ? (
        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <p className="text-muted">Sealed on {fmtDate(v.sealedAt)}. A normal signed-in session — including this one — cannot change the items below. The server refuses, and so does the database.</p>
          <ul className="space-y-1.5">{SEALS.map((s) => <li key={s} className="flex gap-2"><LockIcon className="mt-0.5 size-4 shrink-0 text-accent" />{s}</li>)}</ul>
          <Notice tone={v.integrity === 'ok' ? 'ok' : 'danger'}>
            Integrity check: <strong>{v.integrity === 'ok' ? 'sealed plan and live settings match' : `mismatch detected (${v.differences.join(', ')})`}</strong>
            <br /><span className="break-all font-mono text-xs text-muted">Policy fingerprint {v.policyHash}</span>
          </Notice>
          <p className="text-muted">To change sealed settings, use <a className="font-medium text-accent" href="/recover">VaultLock recovery</a>: your password and recovery key, then a waiting period. A password reset email cannot release VaultLock.</p>
        </div>
      ) : (
        <div className="mt-4 space-y-4 text-sm leading-relaxed">
          <p className="text-muted">VaultLock seals your plan so that a person who has your unlocked phone, your password, or access to your email still cannot change it.</p>
          <p className="font-medium">After you seal, these cannot be changed from a normal session:</p>
          <ul className="space-y-1.5 text-muted">{SEALS.map((s) => <li key={s} className="ml-5 list-disc">{s}</li>)}</ul>
          <Notice tone="warn">
            <strong>Before you seal.</strong> Check that your Lifelines and schedule are right. You will get a recovery key once — keep it somewhere safe and separate from your phone. Without your password and that key, sealed settings cannot be changed by anyone, including support. With them, a release still takes {72} hours and your Lifelines are told. A Lifeline can always opt out.
          </Notice>
          {!me.readiness.consentingLifeline && <Notice tone="danger">At least one Lifeline must accept before you can seal.</Notice>}
          {me.passkeys.length < 2 && <Notice>Tip: enroll a second device first. While sealed you cannot add one, so a lost phone would need recovery.</Notice>}
          <label className="flex gap-3">
            <input type="checkbox" className="mt-0.5 size-5 shrink-0 accent-(--accent)" checked={ack} onChange={(e) => setAck(e.target.checked)} />
            <span>I reviewed my Lifelines and schedule. I understand that sealed settings cannot be changed without my recovery key and a waiting period.</span>
          </label>
          {a.error && <Notice tone="danger">{a.error}</Notice>}
          <Button disabled={!ack || !me.readiness.consentingLifeline} busy={a.busy === 'seal'} onClick={() => a.run('seal', async () => {
            const out = await guarded(() => api('POST', '/vaultlock/seal', { acknowledged: true }));
            setKey(out.recoveryKey); setSaved(false);
            await refresh();
          })}>Seal my protection</Button>
        </div>
      )}
      <Modal open={!!key} onClose={() => saved && setKey('')} title="Save your recovery key">
        <div className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">This key is shown <strong className="text-text">once</strong>. Lifeline keeps only a scrambled copy and cannot show it again. Write it down or store it in a password manager — not only on this phone.</p>
          <p data-testid="recovery-key" className="select-all break-all rounded-xl border border-line bg-bg p-4 text-center font-mono text-sm leading-7">{key}</p>
          <Button variant="secondary" className="w-full" onClick={() => navigator.clipboard?.writeText(key)}>Copy</Button>
          <label className="flex gap-3 text-sm"><input type="checkbox" className="size-5 accent-(--accent)" checked={saved} onChange={(e) => setSaved(e.target.checked)} />I saved my recovery key.</label>
          <Button className="w-full" disabled={!saved} onClick={() => setKey('')}>Done</Button>
        </div>
      </Modal>
    </Card>
  );
}

export default function Security() {
  const { me, refresh, guarded } = useApp();
  const a = useAction();
  const [log, setLog] = useState<any>(null);
  useEffect(() => { api('GET', '/audit').then(setLog, () => {}); }, [me.serverTime]);
  const sealed = me.vaultlock.active;
  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <PageTitle title="Security" lead="How Lifeline knows it is you, and how your plan is protected from changes." />
      <VaultLock />
      <Card><h2 className="mb-4 text-xl font-semibold">Devices (passkeys)</h2><PasskeyPanel /></Card>
      <Card><h2 className="mb-4 text-xl font-semibold">Check-in passphrase</h2><PassphraseForm /></Card>
      <Card>
        <h2 className="text-xl font-semibold">Pause protection</h2>
        <p className="mt-2 text-sm text-muted">While paused, the countdown stops and nobody is notified.{sealed && ' Pausing is not available while VaultLock is active.'}</p>
        {a.error && <div className="mt-3"><Notice tone="danger">{a.error}</Notice></div>}
        {me.protection.status !== 'paused' && !sealed && (
          <Button variant="secondary" className="mt-4" disabled={me.protection.status === 'escalating'} busy={a.busy === 'pause'} onClick={() => a.run('pause', async () => { await guarded(() => api('POST', '/protection/pause', {})); await refresh(); })}>Pause protection</Button>
        )}
      </Card>
      <Card>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-xl font-semibold">Security log</h2>
          {log && <Badge tone={log.chain.ok ? 'ok' : 'danger'}>{log.chain.ok ? `Verified · ${log.chain.count} records` : 'Log integrity check FAILED'}</Badge>}
        </div>
        <p className="mt-2 text-sm text-muted">Each record is linked to the one before it with a keyed fingerprint. A changed or removed record makes the check fail. Records cannot be edited or deleted here.</p>
        <ul className="mt-4 max-h-96 divide-y divide-line overflow-y-auto text-sm">
          {log?.events.map((e: any) => (
            <li key={e.seq} className="flex flex-wrap items-baseline justify-between gap-x-4 py-2.5">
              <span className={`font-mono text-[13px] ${e.type.includes('blocked') || e.type.includes('tamper') || e.type.includes('failed') ? 'text-warn' : ''}`}>{e.type}{e.type === 'vaultlock.blocked_attempt' ? ` · ${JSON.parse(e.detail).action}` : ''}</span>
              <span className="text-muted">{e.actor} · {fmtDate(e.created_at)}</span>
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
