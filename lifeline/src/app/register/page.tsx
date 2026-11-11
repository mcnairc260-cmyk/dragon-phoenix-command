'use client';
import Link from 'next/link';
import { useState } from 'react';
import { AuthShell } from '@/components/auth-shell';
import { Button, Field, Notice } from '@/components/ui';
import { api } from '@/lib/client';

export default function Register() {
  const [f, setF] = useState({ name: '', email: '', password: '' });
  const [agree, setAgree] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const set = (k: keyof typeof f) => (e: React.ChangeEvent<HTMLInputElement>) => setF({ ...f, [k]: e.target.value });
  return (
    <AuthShell title="Create your account" lead="Set-up takes about three minutes. This is a demonstration build: no real messages are sent and nothing is charged."
      footer={<>Already have an account? <Link className="font-medium text-accent" href="/login">Sign in</Link></>}>
      <form className="space-y-5" onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true); setError('');
        try { await api('POST', '/auth/register', f); window.location.assign('/onboarding'); } catch (err: any) { setError(err.message); setBusy(false); }
      }}>
        <Field label="Your name" name="name" autoComplete="name" required value={f.name} onChange={set('name')} hint="Your Lifelines see this name in messages." />
        <Field label="Email" type="email" name="email" autoComplete="username" required value={f.email} onChange={set('email')} />
        <Field label="Password" type="password" name="password" autoComplete="new-password" required minLength={10} value={f.password} onChange={set('password')} hint="At least 10 characters. This is for signing in only." />
        <label className="flex gap-3 text-sm leading-relaxed text-muted">
          <input type="checkbox" required checked={agree} onChange={(e) => setAgree(e.target.checked)} className="mt-1 size-5 shrink-0 accent-(--accent)" />
          <span>I understand that Lifeline is not an emergency service, that a missed check-in is not proof of harm, and I accept the <Link className="text-accent" href="/terms">terms</Link> and <Link className="text-accent" href="/privacy">privacy policy</Link> (drafts).</span>
        </label>
        {error && <Notice tone="danger">{error}</Notice>}
        <Button type="submit" busy={busy} className="w-full">Create account</Button>
      </form>
    </AuthShell>
  );
}
