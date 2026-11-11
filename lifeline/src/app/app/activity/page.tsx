'use client';
import { useEffect, useState } from 'react';
import { useApp } from '@/components/app-context';
import { PageTitle } from '@/components/app-shell';
import { Badge, Card } from '@/components/ui';
import { api, fmtDate } from '@/lib/client';

const KIND: Record<string, string> = {
  alert: 'Missed check-in alert', reminder: 'Reminder', final_warning: 'Final warning', escalation_notice: 'Escalation notice', all_clear: 'Check-in completed notice',
  consent_request: 'Lifeline request', verify_email: 'Email confirmation', password_reset: 'Password reset', security_notice: 'Security notice', recovery_notice: 'VaultLock recovery notice', no_recipients: 'Nobody could be notified',
};
const TONE: Record<string, 'ok' | 'warn' | 'danger' | 'muted'> = { accepted: 'ok', delivered: 'ok', queued: 'warn', sending: 'warn', failed: 'danger', cancelled: 'muted', suppressed: 'muted' };
const STATUS: Record<string, string> = { accepted: 'Accepted by provider', delivered: 'Delivered', queued: 'Waiting to send', sending: 'Sending', failed: 'Failed', cancelled: 'Cancelled before sending', suppressed: 'Not sent' };

export default function Activity() {
  const { me } = useApp();
  const [items, setItems] = useState<any[] | null>(null);
  useEffect(() => { api('GET', '/history').then((h) => setItems(h.notifications), () => setItems([])); }, [me.serverTime]);
  return (
    <div className="mx-auto max-w-3xl">
      <PageTitle title="Activity" lead="Every message Lifeline created for your account. “Accepted by provider” means the email, text or call service took the message. It is not proof that a person read it." />
      <ul className="space-y-3">
        {items?.length === 0 && <Card>No messages yet.</Card>}
        {items?.map((n) => (
          <li key={n.id}>
            <Card className="space-y-2 p-4 sm:p-5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold">{KIND[n.kind] ?? n.kind}{n.stage ? <span className="font-normal text-muted"> · stage {n.stage}</span> : null}</p>
                <div className="flex gap-2">
                  {n.simulated && n.status !== 'suppressed' && n.status !== 'cancelled' && <Badge tone="warn">Simulated</Badge>}
                  <Badge tone={TONE[n.status] ?? 'muted'}>{STATUS[n.status] ?? n.status}</Badge>
                  {n.acknowledged_at && <Badge tone="ok">Receipt confirmed</Badge>}
                </div>
              </div>
              <p className="text-sm text-muted">{n.channel} → {n.contact_name ? `${n.contact_name} (${n.recipient})` : n.recipient} · {fmtDate(n.created_at)}{n.attempts > 1 ? ` · ${n.attempts} attempts` : ''}</p>
              {n.last_error && <p className="text-sm text-warn">{n.last_error}</p>}
            </Card>
          </li>
        ))}
      </ul>
    </div>
  );
}
