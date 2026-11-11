import type { ReactNode } from 'react';

const COLOR = { ok: 'var(--accent)', warn: 'var(--warn)', danger: 'var(--danger)', muted: 'var(--line)' };

/** The countdown ring. `fraction` is the share of time left (1 = full). */
export function Ring({ fraction, tone, size = 260, children }: { fraction: number; tone: keyof typeof COLOR; size?: number; children: ReactNode }) {
  const r = 46, c = 2 * Math.PI * r;
  const f = Math.min(1, Math.max(0, fraction));
  return (
    <div className="relative shrink-0" style={{ width: size, height: size, maxWidth: '100%' }}>
      <svg viewBox="0 0 100 100" className="size-full -rotate-90" aria-hidden>
        <circle cx="50" cy="50" r={r} fill="none" stroke="var(--surface-2)" strokeWidth="5" />
        <circle cx="50" cy="50" r={r} fill="none" stroke={COLOR[tone]} strokeWidth="5" strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={c * (1 - f)} className={tone === 'danger' ? 'pulse' : ''} style={{ transition: 'stroke-dashoffset 0.6s linear, stroke 0.4s' }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-1 text-center">{children}</div>
    </div>
  );
}
