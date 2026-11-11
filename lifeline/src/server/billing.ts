import { createHmac } from 'node:crypto';
import { config, now } from './config';
import { audit } from './audit';
import type { Session } from './auth';
import { safeEqual } from './crypto';
import type { Db } from './db';
import { AppError } from './errors';

export type PlanId = 'basic' | 'premium';
export interface Plan {
  id: PlanId; name: string; priceCents: number; maxContacts: number; channels: string[];
  maxReminders: number; customEscalation: boolean; smsPerMonth: number; voicePerMonth: number; features: string[];
}

const price = (k: string, d: number) => Number(process.env[k] ?? d);

/** Provisional pricing. Change with LIFELINE_PRICE_BASIC_CENTS / LIFELINE_PRICE_PREMIUM_CENTS. VaultLock and core security are in every plan. */
export const plans = (): Record<PlanId, Plan> => ({
  basic: {
    id: 'basic', name: 'Basic', priceCents: price('LIFELINE_PRICE_BASIC_CENTS', 499), maxContacts: 2, channels: ['email'],
    maxReminders: 2, customEscalation: false, smsPerMonth: 0, voicePerMonth: 0,
    features: ['One protected person', 'Your own check-in schedule', 'Up to 2 Lifelines', 'Email notifications', 'Reminders before each deadline', 'Passkey + passphrase check-ins', 'VaultLock sealed protection'],
  },
  premium: {
    id: 'premium', name: 'Premium', priceCents: price('LIFELINE_PRICE_PREMIUM_CENTS', 999), maxContacts: 10, channels: ['email', 'sms', 'voice'],
    maxReminders: 5, customEscalation: true, smsPerMonth: 60, voicePerMonth: 20,
    features: ['Everything in Basic', 'Up to 10 Lifelines', 'Text message notifications', 'Automated phone calls', 'Custom escalation stages', 'More reminders', 'Full notification history'],
  },
});

export const planFor = (id: string): Plan => plans()[id === 'premium' ? 'premium' : 'basic'];

/**
 * Billing never touches the protection engine. A failed payment or a cancelled
 * subscription changes `sub_status` only; an armed countdown keeps running and
 * alerts are still sent. See docs/ARCHITECTURE.md "Billing and safety".
 */
async function setSubscription(db: Db, userId: string, patch: { plan?: PlanId; status: string; customer?: string; subscription?: string }, source: string) {
  await db.tx(async (q) => {
    await q.query(
      `update users set plan = coalesce($2, plan), sub_status = $3, stripe_customer_id = coalesce($4, stripe_customer_id),
         stripe_subscription_id = coalesce($5, stripe_subscription_id) where id = $1`,
      [userId, patch.plan ?? null, patch.status, patch.customer ?? null, patch.subscription ?? null]);
    await audit(q, { userId, actor: source, type: 'billing.subscription_changed', detail: { plan: patch.plan, status: patch.status } });
  });
}

export async function startCheckout(db: Db, s: Session, planId: PlanId): Promise<{ url?: string; simulated: boolean }> {
  if (!plans()[planId]) throw new AppError('BAD_REQUEST', 'Unknown plan.');
  const stripe = config.stripe;
  if (!stripe) {
    if (!config.demoMode) throw new AppError('NOT_READY', 'Billing is not configured.');
    await setSubscription(db, s.userId, { plan: planId, status: 'active_simulated' }, 'demo');
    return { simulated: true };
  }
  const priceId = stripe.prices[planId];
  if (!priceId) throw new AppError('NOT_READY', `STRIPE_PRICE_${planId.toUpperCase()} is not set.`);
  const form = new URLSearchParams({
    mode: 'subscription', 'line_items[0][price]': priceId, 'line_items[0][quantity]': '1', customer_email: s.email,
    client_reference_id: s.userId, 'metadata[plan]': planId, 'subscription_data[metadata][user_id]': s.userId,
    'subscription_data[metadata][plan]': planId,
    success_url: `${config.appUrl}/app/account?billing=success`, cancel_url: `${config.appUrl}/app/account?billing=cancelled`,
  });
  const res = await fetch('https://api.stripe.com/v1/checkout/sessions', {
    method: 'POST', headers: { authorization: `Bearer ${stripe.key}`, 'content-type': 'application/x-www-form-urlencoded' }, body: form,
  });
  const out = await res.json();
  if (!res.ok) throw new AppError('BAD_REQUEST', `Stripe: ${out?.error?.message ?? res.status}`);
  return { url: out.url, simulated: false };
}

/** Demo control: pretend a payment failed, to show that protection continues. */
export async function simulateBillingEvent(db: Db, s: Session, event: 'payment_failed' | 'cancelled' | 'recovered') {
  if (!config.demoMode) throw new AppError('DEMO_ONLY', 'Only available in demonstration mode.');
  const status = { payment_failed: 'past_due', cancelled: 'canceled', recovered: 'active_simulated' }[event];
  await setSubscription(db, s.userId, { status }, 'demo');
}

export function verifyStripeSignature(payload: string, header: string | null, secret: string, toleranceSeconds = 300): boolean {
  const parts = Object.fromEntries((header ?? '').split(',').map((p) => p.split('=') as [string, string]));
  if (!parts.t || !parts.v1) return false;
  if (Math.abs(now().getTime() / 1000 - Number(parts.t)) > toleranceSeconds) return false;
  return safeEqual(createHmac('sha256', secret).update(`${parts.t}.${payload}`).digest('hex'), parts.v1);
}

export async function handleStripeWebhook(db: Db, payload: string, signature: string | null) {
  const stripe = config.stripe;
  if (!stripe?.webhookSecret) throw new AppError('NOT_READY', 'Stripe webhook secret is not configured.');
  if (!verifyStripeSignature(payload, signature, stripe.webhookSecret)) throw new AppError('FORBIDDEN', 'Bad signature.');
  const event = JSON.parse(payload);
  const fresh = await db.query(`insert into stripe_events (id, received_at) values ($1,$2) on conflict do nothing returning id`, [event.id, now()]);
  if (!fresh.length) return { duplicate: true };
  const o = event.data?.object ?? {};
  const findUser = async () => {
    const id = o.client_reference_id ?? o.metadata?.user_id ?? o.subscription_details?.metadata?.user_id;
    if (id) return id as string;
    const [u] = await db.query(`select id from users where stripe_customer_id = $1`, [o.customer]);
    return u?.id as string | undefined;
  };
  const userId = await findUser();
  if (!userId) return { ignored: true };
  if (event.type === 'checkout.session.completed') {
    await setSubscription(db, userId, { plan: o.metadata?.plan === 'premium' ? 'premium' : 'basic', status: 'active', customer: o.customer, subscription: o.subscription }, 'stripe');
  } else if (event.type === 'invoice.payment_failed') {
    await setSubscription(db, userId, { status: 'past_due' }, 'stripe');
  } else if (event.type === 'invoice.paid') {
    await setSubscription(db, userId, { status: 'active' }, 'stripe');
  } else if (event.type === 'customer.subscription.deleted') {
    await setSubscription(db, userId, { status: 'canceled' }, 'stripe');
  }
  return { ok: true };
}
