'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/client';

const LABEL: Record<string, string> = { email: 'Email', sms: 'Text message (SMS)', voice: 'Automated phone call' };

export default function Consent() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<any>(null);
  const [chosen, setChosen] = useState<string[]>([]);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState('');
  const load = () => api('GET', `/consent/${token}`).then((i) => { setInfo(i); setChosen(i.status === 'granted' ? i.consentChannels : i.channels); }, (e) => setError(e.message));
  useEffect(() => { load(); }, [token]); // eslint-disable-line react-hooks/exhaustive-deps
  const decide = async (decision: string) => {
    setBusy(decision); setError('');
    try { await api('POST', `/consent/${token}`, { decision, channels: chosen }); await load(); } catch (e: any) { setError(e.message); }
    setBusy('');
  };
  if (error && !info) return <AuthShell title="Lifeline request"><Notice tone="danger">{error}</Notice></AuthShell>;
  if (!info) return <AuthShell title="Lifeline request"><Notice>Loading…</Notice></AuthShell>;
  const granted = info.status === 'granted';
  return (
    <AuthShell title={`${info.requestedBy} asked you to be their Lifeline`}
      lead={`Hello ${info.name}. Lifeline is a check-in service. If ${info.requestedBy} misses a scheduled check-in, Lifeline would send you an automated message. It would say only that the check-in was missed.`}>
      {granted && <Notice tone="ok">You accepted. You can change your answer at any time on this page.</Notice>}
      {info.status === 'declined' && <Notice>You declined. Lifeline will not contact you.</Notice>}
      {info.status === 'revoked' && <Notice>You opted out. Lifeline will not contact you.</Notice>}
      <fieldset className="space-y-3">
        <legend className="mb-2 text-sm font-medium">I agree to receive automated Lifeline messages by:</legend>
        {info.channels.map((ch: string) => (
          <label key={ch} className="flex min-h-12 items-center gap-3 rounded-xl border border-line bg-surface px-4">
            <input type="checkbox" className="size-5 accent-(--accent)" checked={chosen.includes(ch)} onChange={(e) => setChosen(e.target.checked ? [...chosen, ch] : chosen.filter((c) => c !== ch))} />
            {LABEL[ch] ?? ch}
          </label>
        ))}
      </fieldset>
      <p className="text-sm leading-relaxed text-muted">
        Message frequency depends on missed check-ins. Message and data rates may apply for text messages and calls. Lifeline is not an emergency service. Consent text version {info.textVersion}.
      </p>
      {error && <Notice tone="danger">{error}</Notice>}
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <Button busy={busy === 'grant'} onClick={() => decide('grant')}>{granted ? 'Update my choices' : 'Accept'}</Button>
        <Button variant="secondary" busy={busy === 'decline' || busy === 'revoke'} onClick={() => decide(granted ? 'revoke' : 'decline')}>{granted ? 'Opt out' : 'Decline'}</Button>
      </div>
    </AuthShell>
  );
}
