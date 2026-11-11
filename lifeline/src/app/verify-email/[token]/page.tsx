'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Notice } from '@/components/ui';
import { api } from '@/lib/client';

export default function VerifyEmail() {
  const { token } = useParams<{ token: string }>();
  const [state, setState] = useState<'busy' | 'done' | string>('busy');
  useEffect(() => {
    api('POST', '/auth/verify-email', { token }).then(() => setState('done'), (e) => setState(e.message));
  }, [token]);
  return (
    <AuthShell title="Confirm your email">
      {state === 'busy' ? <Notice>Confirming…</Notice> : state === 'done'
        ? <Notice tone="ok">Email confirmed. <Link className="font-medium text-accent" href="/onboarding">Continue set-up</Link></Notice>
        : <Notice tone="danger">{state}</Notice>}
    </AuthShell>
  );
}
