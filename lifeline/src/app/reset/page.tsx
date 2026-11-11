'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, Field, Notice } from '@/components/ui';
import { api } from '@/lib/client';

export default function ResetRequest() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done'>('idle');
  return (
    <AuthShell title="Reset your password" lead="We will email a link that sets a new sign-in password. It does not change your Lifelines, schedule, check-in passphrase or VaultLock."
      footer={<Link className="text-accent" href="/login">Back to sign in</Link>}>
      {state === 'done' ? <Notice tone="ok">If an account exists for that address, a reset link is on its way.</Notice> : (
        <form className="space-y-5" onSubmit={async (e) => { e.preventDefault(); setState('busy'); await api('POST', '/auth/password/forgot', { email }).catch(() => {}); setState('done'); }}>
          <Field label="Email" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Button type="submit" busy={state === 'busy'} className="w-full">Send reset link</Button>
        </form>
      )}
    </AuthShell>
  );
}
