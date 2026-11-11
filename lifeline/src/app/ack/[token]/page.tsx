'use client';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, Notice } from '@/components/ui';
import { api } from '@/lib/client';

export default function Ack() {
  const { token } = useParams<{ token: string }>();
  const [info, setInfo] = useState<any>(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { api('GET', `/ack/${token}`).then(setInfo, (e) => setError(e.message)); }, [token]);
  if (error) return <AuthShell title="Lifeline alert"><Notice tone="danger">{error}</Notice></AuthShell>;
  if (!info) return <AuthShell title="Lifeline alert"><Notice>Loading…</Notice></AuthShell>;
  return (
    <AuthShell title={`${info.requestedBy} missed a scheduled check-in`}
      lead="This means only that the check-in was missed. Lifeline does not know why.">
      {info.resolved && <Notice tone="ok">Update: a verified check-in was completed on their account after this alert. Lifeline cannot confirm their wellbeing.</Notice>}
      <Notice>
        <strong>What you can do:</strong> try to reach {info.requestedBy} directly. If you believe they are in danger, contact your local emergency services. Lifeline does not contact emergency services.
      </Notice>
      {info.acknowledged ? (
        <Notice tone="ok">Thank you. Your confirmation was recorded. This tells Lifeline that you received the alert — it does not mark {info.requestedBy} as safe.</Notice>
      ) : (
        <Button busy={busy} className="w-full" onClick={async () => {
          setBusy(true);
          try { await api('POST', `/ack/${token}`, {}); setInfo({ ...info, acknowledged: true }); } catch (e: any) { setError(e.message); }
          setBusy(false);
        }}>I received this alert</Button>
      )}
      <p className="text-sm text-muted">Confirming stops Lifeline from alerting the next people on their list. It does not stop or recall messages already sent.</p>
    </AuthShell>
  );
}
