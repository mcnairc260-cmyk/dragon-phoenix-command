// Runtime configuration. Read lazily so tests can change the environment.
const env = (k: string) => process.env[k]?.trim() || undefined;

let originStore: { getStore(): string | undefined } | undefined;
export const setOriginStore = (s: { getStore(): string | undefined }) => {
  originStore = s;
};

let clockFn: () => Date = () => new Date();
/** Trusted server time. Client-supplied timestamps are never used for deadlines. */
export const now = () => clockFn();
export const setClock = (fn: (() => Date) | null) => {
  clockFn = fn ?? (() => new Date());
};

let scryptCost = 1 << 17;
export const getScryptCost = () => scryptCost;
/** Tests lower the cost. Production keeps the OWASP-recommended N=2^17. */
export const setScryptCost = (n: number) => {
  scryptCost = n;
};

export const config = {
  /** Demo mode is ON unless explicitly set to "0". In demo mode nothing is sent to real recipients. */
  get demoMode() {
    return env('LIFELINE_DEMO_MODE') !== '0';
  },
  get appUrl() {
    // Without APP_URL (local demo) the origin of the current request is used, so any localhost port works.
    return (env('APP_URL') ?? originStore?.getStore() ?? 'http://localhost:3000').replace(/\/$/, '');
  },
  get rpId() {
    return new URL(this.appUrl).hostname;
  },
  get secret() {
    const s = env('LIFELINE_SECRET');
    if (s && s.length >= 32) return s;
    if (!this.demoMode) throw new Error('LIFELINE_SECRET (32+ chars) is required when demo mode is off');
    return 'demo-only-insecure-secret-do-not-use-in-production';
  },
  get databaseUrl() {
    return env('DATABASE_URL');
  },
  get cronSecret() {
    return env('CRON_SECRET');
  },
  get recoveryDelaySeconds() {
    return Number(env('RECOVERY_DELAY_SECONDS') ?? 72 * 3600);
  },
  live(channel: 'email' | 'sms' | 'voice') {
    if (this.demoMode) return false;
    return env(`LIFELINE_LIVE_${channel.toUpperCase()}`) === '1';
  },
  get resendKey() {
    return env('RESEND_API_KEY');
  },
  get emailFrom() {
    return env('EMAIL_FROM') ?? 'Lifeline <alerts@example.invalid>';
  },
  get twilio() {
    const sid = env('TWILIO_ACCOUNT_SID');
    const token = env('TWILIO_AUTH_TOKEN');
    const from = env('TWILIO_FROM');
    return sid && token && from ? { sid, token, from } : undefined;
  },
  get stripe() {
    const key = env('STRIPE_SECRET_KEY');
    if (!key) return undefined;
    if (!key.startsWith('sk_test_') && env('LIFELINE_ALLOW_LIVE_BILLING') !== '1') {
      throw new Error('A live Stripe key is configured but LIFELINE_ALLOW_LIVE_BILLING is not "1". Refusing to charge real cards.');
    }
    return {
      key,
      webhookSecret: env('STRIPE_WEBHOOK_SECRET'),
      prices: { basic: env('STRIPE_PRICE_BASIC'), premium: env('STRIPE_PRICE_PREMIUM') } as Record<string, string | undefined>,
    };
  },
};

export const LIMITS = {
  minIntervalSeconds: 3600,
  maxIntervalSeconds: 60 * 86400,
  maxGraceSeconds: 7 * 86400,
  sessionIdleSeconds: 30 * 60,
  sessionAbsoluteSeconds: 12 * 3600,
  pendingMfaSeconds: 5 * 60,
  stepUpSeconds: 10 * 60,
  challengeSeconds: 5 * 60,
  maxSendAttempts: 4,
  sendingLockSeconds: 300,
};
