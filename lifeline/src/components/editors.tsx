'use client';
import { useState } from 'react';
import { INTERVALS, api, enrollPasskey, fmtDate, fmtDuration, passkeysSupported } from '@/lib/client';
import { useAction, useApp } from './app-context';
import { Badge, Button, Card, Field, LockIcon, Notice, Select } from './ui';

const CONSENT: Record<string, { tone: 'ok' | 'warn' | 'danger'; label: string }> = {
  granted: { tone: 'ok', label: 'Accepted' }, pending: { tone: 'warn', label: 'Waiting for their answer' },
  declined: { tone: 'danger', label: 'Declined' }, revoked: { tone: 'danger', label: 'Opted out' },
};
const EMPTY = { name: '', relationship: '', email: '', phone: '', channels: ['email'], stage: 1, priority: 1, message: '' };

export function SealedNote({ what }: { what: string }) {
  return <Notice tone="accent"><span className="inline-flex items-center gap-2 font-medium"><LockIcon /> Sealed by VaultLock</span><br />You can view {what}, but it cannot be changed from a normal session. To change it, use VaultLock recovery (Security).</Notice>;
}

export function LifelineEditor() {
  const { me, refresh, guarded } = useApp();
  const sealed = me.vaultlock.active;
  const [editing, setEditing] = useState<string | null>(null); // contact id, 'new', or null
  const [f, setF] = useState<any>(EMPTY);
  const a = useAction();
  const premium = me.plan.channels.length > 1;
  const custom = me.protection.escalationMode === 'custom';
  const open = (c?: any) => { setEditing(c ? c.id : 'new'); setF(c ? { ...c, phone: c.phone ?? '' } : { ...EMPTY, priority: me.contacts.length + 1, stage: custom ? 1 : me.contacts.length + 1 }); a.setError(''); };
  const save = () => a.run('save', async () => {
    const body = { name: f.name, relationship: f.relationship, email: f.email, phone: f.phone || null, channels: f.channels, stage: Number(f.stage), priority: Number(f.priority), message: f.message };
    await guarded(() => (editing === 'new' ? api('POST', '/contacts', body) : api('PUT', `/contacts/${editing}`, body)));
    setEditing(null); await refresh();
  });
  const toggle = (ch: string) => setF({ ...f, channels: f.channels.includes(ch) ? f.channels.filter((c: string) => c !== ch) : [...f.channels, ch] });

  return (
    <div className="space-y-4">
      {sealed && <SealedNote what="your Lifelines" />}
      {me.contacts.length === 0 && <Notice>You have no Lifelines yet. Add a person you trust.</Notice>}
      <ul className="space-y-3">
        {me.contacts.map((c: any, i: number) => (
          <li key={c.id}>
            <Card className="space-y-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="text-lg font-semibold">{c.name} {c.relationship && <span className="text-base font-normal text-muted">· {c.relationship}</span>}</p>
                  <p className="text-sm text-muted">{c.email}{c.phone ? ` · ${c.phone}` : ''}</p>
                </div>
                <Badge tone={CONSENT[c.consent_status].tone}>{CONSENT[c.consent_status].label}</Badge>
              </div>
              <p className="text-sm text-muted">
                Notified by {c.channels.join(', ')} · {me.protection.escalationMode === 'simultaneous' ? 'with everyone else' : me.protection.escalationMode === 'sequential' ? `number ${i + 1} in order` : `stage ${c.stage}`}
                {c.consent_status === 'granted' && c.consent_channels.length < c.channels.length && ` · accepted only: ${c.consent_channels.join(', ')}`}
              </p>
              {c.message && <p className="rounded-lg bg-bg px-3 py-2 text-sm text-muted">“{c.message}”</p>}
              {!sealed && editing !== c.id && (
                <div className="flex gap-2">
                  <Button variant="secondary" className="min-h-10 px-4 text-sm" onClick={() => open(c)}>Edit</Button>
                  <Button variant="ghost" className="min-h-10 px-3 text-sm" busy={a.busy === c.id} onClick={() => a.run(c.id, async () => { await guarded(() => api('DELETE', `/contacts/${c.id}`)); await refresh(); })}>Remove</Button>
                </div>
              )}
            </Card>
          </li>
        ))}
      </ul>
      {a.error && !editing && <Notice tone="danger">{a.error}</Notice>}
      {editing ? (
        <Card>
          <form className="space-y-4" onSubmit={(e) => { e.preventDefault(); save(); }}>
            <h3 className="text-lg font-semibold">{editing === 'new' ? 'Add a Lifeline' : 'Edit Lifeline'}</h3>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <Field label="Name" required value={f.name} onChange={(e) => setF({ ...f, name: e.target.value })} />
              <Field label="Relationship" placeholder="Sister, friend…" value={f.relationship} onChange={(e) => setF({ ...f, relationship: e.target.value })} />
              <Field label="Email" type="email" required value={f.email} onChange={(e) => setF({ ...f, email: e.target.value })} />
              <Field label="Mobile number (optional)" type="tel" placeholder="+12055550123" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} hint="International format. Needed for texts and calls." />
            </div>
            <fieldset>
              <legend className="mb-2 text-sm font-medium">How should Lifeline notify them?</legend>
              <div className="flex flex-wrap gap-2">
                {['email', 'sms', 'voice'].map((ch) => (
                  <label key={ch} className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm ${f.channels.includes(ch) ? 'border-accent bg-accent/10' : 'border-line'} ${ch !== 'email' && !premium ? 'opacity-50' : ''}`}>
                    <input type="checkbox" className="size-4 accent-(--accent)" disabled={ch !== 'email' && !premium} checked={f.channels.includes(ch)} onChange={() => toggle(ch)} />
                    {{ email: 'Email', sms: 'Text message', voice: 'Phone call' }[ch]}{ch !== 'email' && !premium && ' (Premium)'}
                  </label>
                ))}
              </div>
            </fieldset>
            {custom && <Field label="Escalation stage" type="number" min={1} max={10} value={f.stage} onChange={(e) => setF({ ...f, stage: e.target.value })} hint="People in the same stage are notified together. Stage 1 is first." />}
            {me.protection.escalationMode === 'sequential' && <Field label="Order" type="number" min={1} max={99} value={f.priority} onChange={(e) => setF({ ...f, priority: e.target.value, stage: e.target.value })} hint="1 is notified first." />}
            <div className="space-y-1.5">
              <label htmlFor="ll-msg" className="block text-sm font-medium">Your message to them (optional)</label>
              <textarea id="ll-msg" rows={3} maxLength={500} value={f.message} onChange={(e) => setF({ ...f, message: e.target.value })} placeholder="For example: where a spare key is, or who else to call."
                className="block w-full rounded-xl border border-line bg-bg px-4 py-3 text-base placeholder:text-muted/60" />
            </div>
            <p className="text-sm text-muted">They get a request first and must accept. If you later change their email, number or channels, they are asked again.</p>
            {a.error && <Notice tone="danger">{a.error}</Notice>}
            <div className="flex gap-3">
              <Button type="submit" busy={a.busy === 'save'}>{editing === 'new' ? 'Add and send request' : 'Save'}</Button>
              <Button type="button" variant="secondary" onClick={() => setEditing(null)}>Cancel</Button>
            </div>
          </form>
        </Card>
      ) : !sealed && (
        <Button variant="secondary" onClick={() => open()} disabled={me.contacts.length >= me.plan.maxContacts}>
          {me.contacts.length >= me.plan.maxContacts ? `${me.plan.name} plan limit reached (${me.plan.maxContacts})` : 'Add a Lifeline'}
        </Button>
      )}
    </div>
  );
}

const GRACE: [string, number][] = [['No grace period', 0], ['30 minutes', 1800], ['1 hour', 3600], ['3 hours', 10800], ['6 hours', 21600], ['12 hours', 43200], ['24 hours', 86400]];
const WAITS: [string, number][] = [['15 minutes', 900], ['30 minutes', 1800], ['1 hour', 3600], ['3 hours', 10800], ['12 hours', 43200]];
const REMINDERS: [string, number][] = [['30 minutes before', 1800], ['1 hour before', 3600], ['3 hours before', 10800], ['12 hours before', 43200], ['1 day before', 86400], ['2 days before', 172800], ['3 days before', 259200]];

export function ScheduleEditor({ onSaved }: { onSaved?: () => void }) {
  const { me, refresh, guarded } = useApp();
  const p = me.protection;
  const sealed = me.vaultlock.active;
  const [f, setF] = useState({ intervalSeconds: p.intervalSeconds, graceSeconds: p.graceSeconds, reminderOffsets: p.reminderOffsets as number[], escalationMode: p.escalationMode, stageWaitSeconds: p.stageWaitSeconds });
  const [customDays, setCustomDays] = useState(INTERVALS.some(([, s]) => s === p.intervalSeconds) ? '' : String(p.intervalSeconds / 86400));
  const a = useAction();
  const options = REMINDERS.filter(([, s]) => s < f.intervalSeconds);
  const toggle = (s: number) => setF({ ...f, reminderOffsets: f.reminderOffsets.includes(s) ? f.reminderOffsets.filter((x) => x !== s) : [...f.reminderOffsets, s] });
  return (
    <form className="space-y-6" onSubmit={(e) => {
      e.preventDefault();
      a.run('save', async () => {
        await guarded(() => api('PUT', '/protection/settings', { ...f, reminderOffsets: f.reminderOffsets.filter((s) => s < f.intervalSeconds), graceSeconds: Math.min(f.graceSeconds, f.intervalSeconds) }));
        await refresh(); onSaved?.();
      }, 'Saved.');
    }}>
      {sealed && <SealedNote what="your schedule" />}
      <fieldset disabled={sealed} className="space-y-6 disabled:opacity-70">
        <div>
          <p className="mb-2 text-sm font-medium">Check in at least every</p>
          <div className="flex flex-wrap gap-2">
            {INTERVALS.map(([label, s]) => (
              <button type="button" key={s} aria-pressed={f.intervalSeconds === s && !customDays} onClick={() => { setF({ ...f, intervalSeconds: s }); setCustomDays(''); }}
                className={`min-h-11 rounded-xl border px-4 text-sm font-medium ${f.intervalSeconds === s && !customDays ? 'border-accent bg-accent/10 text-accent' : 'border-line text-text hover:border-muted'}`}>{label}</button>
            ))}
          </div>
          <div className="mt-3 max-w-56">
            <Field label="Or a custom number of days" type="number" min={1} max={60} step="0.5" value={customDays} placeholder="e.g. 5"
              onChange={(e) => { setCustomDays(e.target.value); const d = Number(e.target.value); if (d > 0) setF({ ...f, intervalSeconds: Math.round(d * 86400) }); }} />
          </div>
        </div>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Select label="Grace period after a missed deadline" value={f.graceSeconds} onChange={(e) => setF({ ...f, graceSeconds: Number(e.target.value) })}>
            {GRACE.filter(([, s]) => s <= f.intervalSeconds).map(([l, s]) => <option key={s} value={s}>{l}</option>)}
          </Select>
          <Select label="Who is notified, and when" value={f.escalationMode} onChange={(e) => setF({ ...f, escalationMode: e.target.value })}>
            <option value="simultaneous">Everyone at the same time</option>
            <option value="sequential">One at a time, in order</option>
            <option value="custom" disabled={!me.plan.customEscalation}>Custom stages{me.plan.customEscalation ? '' : ' (Premium)'}</option>
          </Select>
          {f.escalationMode !== 'simultaneous' && (
            <Select label="Wait before notifying the next" value={f.stageWaitSeconds} onChange={(e) => setF({ ...f, stageWaitSeconds: Number(e.target.value) })}>
              {WAITS.map(([l, s]) => <option key={s} value={s}>{l}</option>)}
            </Select>
          )}
        </div>
        <fieldset>
          <legend className="mb-2 text-sm font-medium">Remind me (up to {me.plan.maxReminders})</legend>
          <div className="flex flex-wrap gap-2">
            {options.map(([label, s]) => (
              <label key={s} className={`flex min-h-11 items-center gap-2 rounded-xl border px-4 text-sm ${f.reminderOffsets.includes(s) ? 'border-accent bg-accent/10' : 'border-line'}`}>
                <input type="checkbox" className="size-4 accent-(--accent)" checked={f.reminderOffsets.includes(s)} onChange={() => toggle(s)} />{label}
              </label>
            ))}
          </div>
          <p className="mt-2 text-sm text-muted">Reminders go only to you. You also get a final warning when the deadline passes.</p>
        </fieldset>
      </fieldset>
      {p.status !== 'setup' && !sealed && <p className="text-sm text-muted">A new interval starts with your next check-in. Your current deadline does not move.</p>}
      {a.error && <Notice tone="danger">{a.error}</Notice>}
      {a.ok && <Notice tone="ok">{a.ok}</Notice>}
      {!sealed && <Button type="submit" busy={a.busy === 'save'}>Save schedule</Button>}
    </form>
  );
}

export function PassphraseForm({ onSaved }: { onSaved?: () => void }) {
  const { me, refresh, guarded } = useApp();
  const [v, setV] = useState('');
  const [again, setAgain] = useState('');
  const a = useAction();
  if (me.vaultlock.active) return <SealedNote what="that a passphrase is set" />;
  return (
    <form className="space-y-4" onSubmit={(e) => {
      e.preventDefault();
      if (v !== again) return a.setError('The two entries do not match.');
      a.run('save', async () => { await guarded(() => api('POST', '/auth/passphrase', { passphrase: v })); setV(''); setAgain(''); await refresh(); onSaved?.(); }, 'Passphrase saved.');
    }}>
      <Field label={me.user.hasPassphrase ? 'New check-in passphrase' : 'Check-in passphrase'} type="password" autoComplete="off" minLength={8} required value={v} onChange={(e) => setV(e.target.value)}
        hint="At least 8 characters. It must be different from your sign-in password. A short sentence you can remember works well." />
      <Field label="Type it again" type="password" autoComplete="off" required value={again} onChange={(e) => setAgain(e.target.value)} />
      {a.error && <Notice tone="danger">{a.error}</Notice>}
      {a.ok && <Notice tone="ok">{a.ok}</Notice>}
      <Button type="submit" busy={a.busy === 'save'}>Save passphrase</Button>
    </form>
  );
}

export function PasskeyPanel({ onAdded }: { onAdded?: () => void }) {
  const { me, refresh, guarded } = useApp();
  const a = useAction();
  const sealed = me.vaultlock.active;
  return (
    <div className="space-y-4">
      {sealed && <SealedNote what="your enrolled devices" />}
      {me.passkeys.length > 0 && (
        <ul className="divide-y divide-line rounded-xl border border-line">
          {me.passkeys.map((k: any) => (
            <li key={k.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div><p className="font-medium">{k.label}</p><p className="text-sm text-muted">Added {fmtDate(k.created_at)}{k.last_used_at ? ` · last used ${fmtDate(k.last_used_at)}` : ''}</p></div>
              {!sealed && <Button variant="ghost" className="min-h-10 px-3 text-sm" busy={a.busy === k.id} onClick={() => a.run(k.id, async () => { await guarded(() => api('DELETE', `/passkeys/${k.id}`)); await refresh(); })}>Remove</Button>}
            </li>
          ))}
        </ul>
      )}
      {a.error && <Notice tone="danger">{a.error}</Notice>}
      {!sealed && (passkeysSupported() ? (
        <Button variant={me.passkeys.length ? 'secondary' : 'primary'} busy={a.busy === 'add'} onClick={() => a.run('add', async () => {
          await guarded(() => enrollPasskey(/iPhone|iPad/.test(navigator.userAgent) ? 'iPhone or iPad' : /Android/.test(navigator.userAgent) ? 'Android device' : /Mac/.test(navigator.userAgent) ? 'Mac' : 'This device'));
          await refresh(); onAdded?.();
        })}>{me.passkeys.length ? 'Add another device' : 'Add this device'}</Button>
      ) : <Notice tone="warn">This browser does not support passkeys.</Notice>)}
      <p className="text-sm leading-relaxed text-muted">Your device asks for Face ID, a fingerprint or your device PIN. Lifeline never receives your face or fingerprint. Add a second device if you can, so a lost phone does not lock you out.</p>
    </div>
  );
}

export { fmtDuration };
