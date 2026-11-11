'use client';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, Field, Notice } from '@/components/ui';
import { api } from '@/lib/client';

export default function ResetConfirm() {
  const { token } = useParams<{ token: string }>();
  const [password, setPassword] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | string>('idle');
  return (
    <AuthShell title="Choose a new password">
      {state === 'done' ? <Notice tone="ok">Password changed. All other sessions were signed out. <Link className="font-medium text-accent" href="/login">Sign in</Link></Notice> : (
        <form className="space-y-5" onSubmit={async (e) => {
          e.preventDefault(); setState('busy');
          try { await api('POST', '/auth/password/reset', { token, password }); setState('done'); } catch (err: any) { setState(err.message); }
        }}>
          <Field label="New password" type="password" autoComplete="new-password" minLength={10} required value={password} onChange={(e) => setPassword(e.target.value)} />
          {state !== 'idle' && state !== 'busy' && <Notice tone="danger">{state}</Notice>}
          <Button type="submit" busy={state === 'busy'} className="w-full">Set new password</Button>
        </form>
      )}
    </AuthShell>
  );
}
