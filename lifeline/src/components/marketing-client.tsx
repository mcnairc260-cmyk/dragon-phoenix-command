'use client';
import { useEffect, useState } from 'react';
import { api } from '@/lib/client';
import { Button, Notice } from './ui';
import { Ring } from './ring';

const STEPS = [
  { at: 0, label: 'Protected', tone: 'ok', text: 'You checked in. The countdown starts again.' },
  { at: 62, label: 'Reminder', tone: 'ok', text: 'A reminder goes to you — not to anyone else.' },
  { at: 100, label: 'Grace period', tone: 'warn', text: 'The deadline passed. You get a final warning and extra time.' },
  { at: 125, label: 'Lifelines notified', tone: 'danger', text: 'Your Lifelines are told that you missed a check-in.' },
] as const;

/** A marketing illustration only: a 20-second loop on this page. It does not call the server. */
export function CountdownDemo() {
  const [t, setT] = useState(0);
  const [running, setRunning] = useState(true);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => setT((x) => (x >= 150 ? 150 : x + 1)), 130);
    return () => clearInterval(id);
  }, [running]);
  const step = [...STEPS].reverse().find((s) => t >= s.at)!;
  const fraction = t < 100 ? 1 - t / 100 : t < 125 ? 1 - (t - 100) / 25 : 0;
  const daysLeft = Math.max(0, 10 - t / 10);
  return (
    <div className="rounded-3xl border border-line bg-surface p-6 sm:p-8">
      <div className="flex flex-col items-center gap-6 sm:flex-row sm:gap-10">
        <Ring fraction={fraction} tone={step.tone} size={200}>
          <span className="text-xs uppercase tracking-widest text-muted">{t < 100 ? 'Next check-in' : t < 125 ? 'Grace' : 'Missed'}</span>
          <span className="tnum text-3xl font-semibold">{t < 100 ? `${daysLeft.toFixed(1)}d` : t < 125 ? `${Math.ceil((125 - t) / 4)}h` : '—'}</span>
        </Ring>
        <div className="flex-1 space-y-4 text-center sm:text-left">
          <p aria-live="polite" className="min-h-20">
            <span className={`block text-sm font-semibold uppercase tracking-wider ${step.tone === 'ok' ? 'text-ok' : step.tone === 'warn' ? 'text-warn' : 'text-danger'}`}>{step.label}</span>
            <span className="mt-1 block text-lg">{step.text}</span>
          </p>
          <div className="flex flex-wrap justify-center gap-3 sm:justify-start">
            <Button onClick={() => { setT(0); setRunning(true); }}>Verify I’m OK</Button>
            <Button variant="secondary" onClick={() => setRunning((r) => !r)}>{running ? 'Pause' : 'Play'}</Button>
          </div>
          <p className="text-sm text-muted">Example: a 10-day schedule, shown in 20 seconds. Press “Verify I’m OK” at any time to reset it.</p>
        </div>
      </div>
    </div>
  );
}

export function WaitlistForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'busy' | 'done' | string>('idle');
  if (state === 'done') return <Notice tone="ok">You are on the list. We will email you once, when Lifeline opens.</Notice>;
  return (
    <form className="flex flex-col gap-3 sm:flex-row" onSubmit={async (e) => {
      e.preventDefault();
      setState('busy');
      try { await api('POST', '/waitlist', { email }); setState('done'); } catch (err: any) { setState(err.message); }
    }}>
      <label className="sr-only" htmlFor="waitlist-email">Email address</label>
      <input id="waitlist-email" type="email" required autoComplete="email" placeholder="you@example.com" value={email} onChange={(e) => setEmail(e.target.value)}
        className="min-h-12 flex-1 rounded-xl border border-line bg-bg px-4 text-base placeholder:text-muted/60" />
      <Button type="submit" busy={state === 'busy'}>Join the waitlist</Button>
      {state !== 'idle' && state !== 'busy' && <p role="alert" className="text-sm text-danger sm:basis-full">{state}</p>}
    </form>
  );
}
