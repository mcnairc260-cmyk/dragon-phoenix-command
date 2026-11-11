// The protection state machine. Pure: no database, no clock. The engine and the
// API both ask this module whether a transition is allowed.
//
//   setup ──ARM──▶ active ──DEADLINE_PASSED──▶ grace ──GRACE_EXPIRED──▶ escalating
//                    ▲  ▲                        │                          │
//                    │  └────────CHECK_IN────────┘                          │
//                    └──────────────────CHECK_IN────────────────────────────┘
//   active|grace ──PAUSE──▶ paused ──RESUME──▶ active      (never while VaultLock is active)
export type Status = 'setup' | 'active' | 'grace' | 'escalating' | 'paused';
export type Event = 'ARM' | 'CHECK_IN' | 'DEADLINE_PASSED' | 'GRACE_EXPIRED' | 'PAUSE' | 'RESUME';

const TABLE: Record<Status, Partial<Record<Event, Status>>> = {
  setup: { ARM: 'active' },
  active: { CHECK_IN: 'active', DEADLINE_PASSED: 'grace', PAUSE: 'paused' },
  grace: { CHECK_IN: 'active', GRACE_EXPIRED: 'escalating', PAUSE: 'paused' },
  escalating: { CHECK_IN: 'active' },
  paused: { RESUME: 'active' },
};

/** Returns the next status, or null when the transition is not allowed. */
export function transition(status: Status, event: Event, ctx: { vaultlock: boolean } = { vaultlock: false }): Status | null {
  if (ctx.vaultlock && event === 'PAUSE') return null;
  return TABLE[status]?.[event] ?? null;
}

export interface Timing { status: Status; deadlineAt: Date | null; graceSeconds: number }

/** Which timer event (if any) is due at `at`. The time always comes from the server. */
export function dueEvent(p: Timing, at: Date): Event | null {
  if (!p.deadlineAt) return null;
  const deadline = p.deadlineAt.getTime();
  if (p.status === 'active' && at.getTime() >= deadline) return 'DEADLINE_PASSED';
  if (p.status === 'grace' && at.getTime() >= deadline + p.graceSeconds * 1000) return 'GRACE_EXPIRED';
  return null;
}

/** Splits recipients into ordered stages. Same stage number = notified together. */
export function stagesOf<T extends { stage: number; priority: number }>(recipients: T[], mode: string): T[][] {
  const sorted = [...recipients].sort((a, b) => a.stage - b.stage || a.priority - b.priority);
  if (mode === 'simultaneous') return sorted.length ? [sorted] : [];
  if (mode === 'sequential') return sorted.map((r) => [r]);
  const groups = new Map<number, T[]>();
  for (const r of sorted) groups.set(r.stage, [...(groups.get(r.stage) ?? []), r]);
  return [...groups.values()];
}
