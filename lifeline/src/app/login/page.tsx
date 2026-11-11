'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, Field, Notice } from '@/components/ui';
import { api, passkeyAssertion } from '@/lib/client';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [step, setStep] = useState<'password' | 'passkey'>('password');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const passkey = async () => {
    setBusy(true); setError('');
    try {
      const assertion = await passkeyAssertion('/auth/login/passkey/options');
      await api('POST', '/auth/login/passkey/verify', { assertion });
      window.location.assign('/app');
    } catch (e: any) { setError(e.message); setBusy(false); }
  };
  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true); setError('');
    try {
      const out = await api('POST', '/auth/login', { email, password });
      if (out.mfaRequired) { setStep('passkey'); setBusy(false); await passkey(); } else window.location.assign('/app');
    } catch (e: any) { setError(e.message); setBusy(false); }
  };

  return (
    <AuthShell title="Sign in" footer={<>New here? <Link className="font-medium text-accent" href="/register">Create an account</Link></>}>
      {step === 'password' ? (
        <form onSubmit={submit} className="space-y-5">
          <Field label="Email" type="email" name="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
          <Field label="Password" type="password" name="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
          {error && <Notice tone="danger">{error}</Notice>}
          <Button type="submit" busy={busy} className="w-full">Sign in</Button>
          <div className="flex justify-between text-sm">
            <Link className="text-muted hover:text-text" href="/reset">Forgot password?</Link>
            <Link className="text-muted hover:text-text" href="/recover">VaultLock recovery</Link>
          </div>
        </form>
      ) : (
        <div className="space-y-5">
          <Notice tone="accent">Password accepted. Now confirm with the passkey on your device.</Notice>
          {error && <Notice tone="danger">{error}</Notice>}
          <Button onClick={passkey} busy={busy} className="w-full">Use my passkey</Button>
          <p className="text-sm text-muted">Lost every enrolled device? If VaultLock is on, use <Link className="text-accent" href="/recover">VaultLock recovery</Link>.</p>
        </div>
      )}
    </AuthShell>
  );
}
