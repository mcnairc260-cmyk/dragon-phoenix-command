'use client';
import { useEffect, useId, useRef, type ButtonHTMLAttributes, type InputHTMLAttributes, type ReactNode } from 'react';

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(' ');

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
const VARIANTS: Record<Variant, string> = {
  primary: 'bg-accent text-accent-ink hover:bg-accent-strong font-semibold',
  secondary: 'bg-surface-2 text-text border border-line hover:border-muted font-medium',
  ghost: 'text-muted hover:text-text font-medium',
  danger: 'bg-danger text-danger-ink hover:opacity-90 font-semibold',
};

export function Button({ variant = 'primary', busy, className, children, ...p }: ButtonHTMLAttributes<HTMLButtonElement> & { variant?: Variant; busy?: boolean }) {
  return (
    <button {...p} disabled={p.disabled || busy} aria-busy={busy || undefined}
      className={cx('inline-flex min-h-12 items-center justify-center gap-2 rounded-xl px-5 text-[15px] transition disabled:cursor-not-allowed disabled:opacity-50', VARIANTS[variant], className)}>
      {busy && <span className="size-4 animate-spin rounded-full border-2 border-current border-r-transparent" aria-hidden />}
      {children}
    </button>
  );
}

export function Card({ className, children, ...p }: React.HTMLAttributes<HTMLDivElement>) {
  return <div {...p} className={cx('rounded-2xl border border-line bg-surface p-5 sm:p-6', className)}>{children}</div>;
}

export function Field({ label, hint, error, ...p }: InputHTMLAttributes<HTMLInputElement> & { label: string; hint?: ReactNode; error?: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium text-text">{label}</label>
      <input id={id} {...p} aria-invalid={!!error || undefined} aria-describedby={hint || error ? `${id}-d` : undefined}
        className={cx('block min-h-12 w-full rounded-xl border bg-bg px-4 text-base text-text placeholder:text-muted/60 disabled:opacity-60', error ? 'border-danger' : 'border-line', p.className)} />
      {(hint || error) && <p id={`${id}-d`} className={cx('text-sm', error ? 'text-danger' : 'text-muted')}>{error ?? hint}</p>}
    </div>
  );
}

export function Select({ label, children, ...p }: React.SelectHTMLAttributes<HTMLSelectElement> & { label: string }) {
  const id = useId();
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-sm font-medium">{label}</label>
      <select id={id} {...p} className="block min-h-12 w-full rounded-xl border border-line bg-bg px-3 text-base text-text disabled:opacity-60">{children}</select>
    </div>
  );
}

const TONES = {
  ok: 'bg-ok/15 text-ok', warn: 'bg-warn/15 text-warn', danger: 'bg-danger/15 text-danger',
  muted: 'bg-surface-2 text-muted', accent: 'bg-accent/15 text-accent',
};
export function Badge({ tone = 'muted', children }: { tone?: keyof typeof TONES; children: ReactNode }) {
  return <span className={cx('inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium', TONES[tone])}>{children}</span>;
}

export function Notice({ tone = 'muted', children, role }: { tone?: 'ok' | 'warn' | 'danger' | 'muted' | 'accent'; children: ReactNode; role?: string }) {
  const border = { ok: 'border-ok/40', warn: 'border-warn/40', danger: 'border-danger/50', muted: 'border-line', accent: 'border-accent/40' }[tone];
  return <div role={role ?? (tone === 'danger' ? 'alert' : 'status')} className={cx('rounded-xl border bg-surface-2/60 px-4 py-3 text-sm leading-relaxed text-text', border)}>{children}</div>;
}

export function Modal({ open, onClose, title, children }: { open: boolean; onClose: () => void; title: string; children: ReactNode }) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);
  return (
    <dialog ref={ref} onClose={onClose} onCancel={onClose} aria-label={title}
      className="m-auto w-[min(100%-1.5rem,28rem)] rounded-2xl border border-line bg-surface p-0 text-text backdrop:bg-bg/80 backdrop:backdrop-blur-sm">
      {open && (
        <div className="rise p-6">
          <h2 className="mb-4 text-xl font-semibold">{title}</h2>
          {children}
        </div>
      )}
    </dialog>
  );
}

export function Logo({ className }: { className?: string }) {
  return (
    <span className={cx('inline-flex items-center gap-2 font-semibold tracking-tight', className)}>
      <svg viewBox="0 0 32 32" className="size-7" aria-hidden>
        <rect width="32" height="32" rx="9" fill="var(--surface-2)" stroke="var(--line)" />
        <path d="M5 17h6l2.5-6 4 11 2.5-5H27" fill="none" stroke="var(--accent)" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      Lifeline
    </span>
  );
}

export const LockIcon = ({ className = 'size-4' }: { className?: string }) => (
  <svg viewBox="0 0 20 20" className={className} fill="currentColor" aria-hidden><path d="M10 2a4 4 0 0 0-4 4v2H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-1V6a4 4 0 0 0-4-4Zm2 6H8V6a2 2 0 1 1 4 0v2Z" /></svg>
);

export { cx };
