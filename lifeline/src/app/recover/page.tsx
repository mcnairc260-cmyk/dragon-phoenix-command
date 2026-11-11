'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, Field, Notice } from '@/components/ui';
import { api, fmtDate } from '@/lib/client';

export default function Recover() {
  const [f, setF] = useState({ email: '', password: '', recoveryKey: '' });
  const [busy, setBusy] = useState('');
  const [msg, setMsg] = useState<{ tone: 'ok' | 'danger' | 'accent'; text: string } | null>(null);
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  const run = async (action: 'start' | 'complete') => {
    setBusy(action); setMsg(null);
    try {
      const out = await api('POST', `/vaultlock/recovery/${action}`, f);
      if (action === 'start') setMsg({ tone: 'accent', text: `${out.alreadyPending ? 'A release request is already waiting.' : 'Release requested.'} Nothing has changed and your protection is still active. You can complete the release after ${fmtDate(out.effectiveAt)}. You and your Lifelines were sent a notice.` });
      else if (out.released) window.location.assign('/app/security');
      else setMsg({ tone: 'danger', text: 'That request expired. Start a new one.' });
    } catch (e: any) { setMsg({ tone: 'danger', text: e.message }); }
    setBusy('');
  };
  return (
    <AuthShell title="VaultLock recovery" lead="Use this only if you must change sealed settings — for example a Lifeline is no longer safe to notify, or you lost every enrolled device."
      footer={<Link className="text-accent" href="/login">Back to sign in</Link>}>
      <Notice>
        Release needs your password <strong>and</strong> your recovery key, then a waiting period. During the wait your protection keeps running, and you and your Lifelines are told a release was requested. A password reset email cannot do this.
      </Notice>
      <form className="space-y-5" onSubmit={(e) => { e.preventDefault(); run('start'); }}>
        <Field label="Email" type="email" autoComplete="username" required value={f.email} onChange={set('email')} />
        <Field label="Password" type="password" autoComplete="current-password" required value={f.password} onChange={set('password')} />
        <Field label="Recovery key" autoComplete="off" required value={f.recoveryKey} onChange={set('recoveryKey')} placeholder="XXXXX-XXXXX-XXXXX-…" className="font-mono" />
        {msg && <Notice tone={msg.tone}>{msg.text}</Notice>}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <Button type="submit" busy={busy === 'start'}>1. Request release</Button>
          <Button type="button" variant="secondary" busy={busy === 'complete'} onClick={() => run('complete')}>2. Complete after the wait</Button>
        </div>
      </form>
    </AuthShell>
  );
}
