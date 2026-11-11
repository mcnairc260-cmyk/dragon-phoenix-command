export type ErrorCode =
  | 'BAD_REQUEST' | 'UNAUTHENTICATED' | 'FORBIDDEN' | 'NOT_FOUND' | 'CONFLICT'
  | 'RATE_LIMITED' | 'VAULTLOCKED' | 'STEP_UP_REQUIRED' | 'INVALID_CREDENTIALS'
  | 'VERIFICATION_FAILED' | 'PLAN_LIMIT' | 'NOT_READY' | 'DEMO_ONLY';

const STATUS: Record<ErrorCode, number> = {
  BAD_REQUEST: 400, UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409,
  RATE_LIMITED: 429, VAULTLOCKED: 423, STEP_UP_REQUIRED: 403, INVALID_CREDENTIALS: 401,
  VERIFICATION_FAILED: 401, PLAN_LIMIT: 402, NOT_READY: 409, DEMO_ONLY: 403,
};

export class AppError extends Error {
  status: number;
  constructor(public code: ErrorCode, message: string) {
    super(message);
    this.status = STATUS[code];
  }
}

/** Maps a database guard exception (see schema.ts) to an AppError, or returns null. */
export function fromDbError(e: unknown): AppError | null {
  const msg = e instanceof Error ? e.message : String(e);
  if (msg.includes('LL_VAULTLOCK')) return new AppError('VAULTLOCKED', 'This setting is sealed by VaultLock.');
  if (msg.includes('LL_IMMUTABLE')) return new AppError('FORBIDDEN', 'This record cannot be changed.');
  return null;
}
