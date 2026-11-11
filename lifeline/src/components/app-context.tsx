'use client';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';
import { ApiError, api, passkeyAssertion } from '@/lib/client';
import { Button, Field, Modal, Notice } from './ui';

export type Me = any;
interface AppCtx {
  me: Me; refresh: () => Promise<void>;
  /** Server time minus this device's time, in ms. The countdown uses server time, so a wrong phone clock does not matter. */
  skew: number;
  /** Runs an action; if the server asks for identity confirmation, shows the dialog and then runs it again. */
  guarded: <T>(fn: () => Promise<T>) => Promise<T>;
}
const Ctx = createContext<AppCtx | null>(null);
export const useApp = () => useContext(Ctx)!;

export function useNow(skew: number) {
  const [now, setNow] = useState(() => Date.now() + skew);
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now() + skew), 1000);
    return () => clearInterval(id);
  }, [skew]);
  return now;
}

export function MeProvider({ children }: { children: ReactNode }) {
  const [me, setMe] = useState<Me>(null);
  const [skew, setSkew] = useState(0);
  const [fatal, setFatal] = useState('');
  const pending = useRef<{ resolve: () => void; reject: (e: Error) => void } | null>(null);
  const [stepOpen, setStepOpen] = useState(false);
  const [form, setForm] = useState({ password: '', passphrase: '' });
  const [stepBusy, setStepBusy] = useState(false);
  const [stepError, setStepError] = useState('');

  const refresh = useCallback(async () => {
    try {
      const m = await api('GET', '/me');
      setSkew(new Date(m.serverTime).getTime() - Date.now());
      setMe(m);
    } catch (e) {
      if (e instanceof ApiError && e.status === 401) window.location.assign('/login');
      else setFatal('Cannot reach Lifeline. Your protection runs on the server and is not affected. Trying again…');
    }
  }, []);
  useEffect(() => {
    refresh();
    const id = setInterval(refresh, 10000);
    return () => clearInterval(id);
  }, [refresh]);

  const guarded = useCallback(async <T,>(fn: () => Promise<T>): Promise<T> => {
    try {
      return await fn();
    } catch (e) {
      if (!(e instanceof ApiError) || e.code !== 'STEP_UP_REQUIRED') throw e;
      await new Promise<void>((resolve, reject) => {
        pending.current = { resolve, reject };
        setForm({ password: '', passphrase: '' }); setStepError(''); setStepOpen(true);
      });
      return fn();
    }
  }, []);

  const closeStep = (ok: boolean) => {
    setStepOpen(false);
    if (ok) pending.current?.resolve(); else pending.current?.reject(new ApiError('CANCELLED', 'Cancelled. Nothing was changed.', 0));
    pending.current = null;
  };
  const submitStep = async (e: React.FormEvent) => {
    e.preventDefault();
    setStepBusy(true); setStepError('');
    try {
      const assertion = me?.user.hasPassphrase ? await passkeyAssertion('/auth/stepup/options') : undefined;
      await api('POST', '/auth/stepup', { ...form, assertion });
      await refresh();
      closeStep(true);
    } catch (err: any) { setStepError(err.message); }
    setStepBusy(false);
  };

  if (!me) return <main className="grid min-h-dvh place-items-center px-5 text-muted">{fatal || 'Loading…'}</main>;
  return (
    <Ctx.Provider value={{ me, refresh, skew, guarded }}>
      {children}
      <Modal open={stepOpen} onClose={() => stepOpen && closeStep(false)} title="Confirm it is you">
        <form onSubmit={submitStep} className="space-y-4">
          <p className="text-sm leading-relaxed text-muted">Changing protection settings needs your password{me.user.hasPassphrase ? ', your check-in passphrase' : ''}{me.readiness.passkeyEnrolled ? ' and your passkey' : ''}. This stays valid for 10 minutes.</p>
          <Field label="Sign-in password" type="password" autoComplete="current-password" required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} />
          {me.user.hasPassphrase && <Field label="Check-in passphrase" type="password" autoComplete="off" required value={form.passphrase} onChange={(e) => setForm({ ...form, passphrase: e.target.value })} />}
          {stepError && <Notice tone="danger">{stepError}</Notice>}
          <div className="flex gap-3">
            <Button type="submit" busy={stepBusy} className="flex-1">Confirm</Button>
            <Button type="button" variant="secondary" onClick={() => closeStep(false)}>Cancel</Button>
          </div>
        </form>
      </Modal>
    </Ctx.Provider>
  );
}

/** Small helper for forms: runs an action and keeps busy/error/ok state. */
export function useAction() {
  const [busy, setBusy] = useState('');
  const [error, setError] = useState('');
  const [ok, setOk] = useState('');
  const run = async (key: string, fn: () => Promise<unknown>, done = '') => {
    setBusy(key); setError(''); setOk('');
    try { await fn(); setOk(done); return true; } catch (e: any) { setError(e.message ?? 'Something went wrong.'); return false; } finally { setBusy(''); }
  };
  return { busy, error, ok, run, setError };
}
