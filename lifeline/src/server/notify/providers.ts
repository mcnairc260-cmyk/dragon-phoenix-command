import { config } from '../config';

export type Channel = 'email' | 'sms' | 'voice';
export interface OutMessage { channel: Channel; to: string; subject: string; body: string; idempotencyKey: string }
export interface SendResult { provider: string; ref: string; simulated: boolean }
export interface Provider { send(m: OutMessage): Promise<SendResult> }

/** Records the message and contacts nobody. The default for every channel. */
export const simulatedProvider: Provider = {
  async send(m) {
    return { provider: 'simulated', ref: `sim_${m.idempotencyKey.slice(0, 24)}`, simulated: true };
  },
};

const post = async (url: string, init: RequestInit) => {
  const res = await fetch(url, { ...init, signal: AbortSignal.timeout(15000) });
  const text = await res.text();
  if (!res.ok) throw new Error(`provider HTTP ${res.status}: ${text.slice(0, 200)}`);
  return JSON.parse(text);
};

/** Resend transactional email. IMPLEMENTED, NOT TESTED against the live API. */
export const resendProvider: Provider = {
  async send(m) {
    const out = await post('https://api.resend.com/emails', {
      method: 'POST',
      headers: { authorization: `Bearer ${config.resendKey}`, 'content-type': 'application/json', 'idempotency-key': m.idempotencyKey },
      body: JSON.stringify({ from: config.emailFrom, to: [m.to], subject: m.subject, text: m.body }),
    });
    return { provider: 'resend', ref: String(out.id), simulated: false };
  },
};

const xml = (s: string) => s.replace(/[<>&'"]/g, (c) => `&#${c.charCodeAt(0)};`);

/** Twilio SMS and voice. IMPLEMENTED, NOT TESTED against the live API. */
export const twilioProvider: Provider = {
  async send(m) {
    const t = config.twilio!;
    const form = new URLSearchParams({ To: m.to, From: t.from, StatusCallback: `${config.appUrl}/api/webhooks/twilio` });
    if (m.channel === 'sms') form.set('Body', m.body);
    else form.set('Twiml', `<Response><Say>${xml(m.body)}</Say><Pause length="1"/><Say>${xml(m.body)}</Say></Response>`);
    const kind = m.channel === 'sms' ? 'Messages' : 'Calls';
    const out = await post(`https://api.twilio.com/2010-04-01/Accounts/${t.sid}/${kind}.json`, {
      method: 'POST',
      headers: { authorization: `Basic ${Buffer.from(`${t.sid}:${t.token}`).toString('base64')}`, 'content-type': 'application/x-www-form-urlencoded' },
      body: form,
    });
    return { provider: 'twilio', ref: String(out.sid), simulated: false };
  },
};

let override: Partial<Record<Channel, Provider>> | null = null;
/** Tests inject failing or recording providers. */
export const setProviders = (p: Partial<Record<Channel, Provider>> | null) => {
  override = p;
};

/** A live provider is used only when demo mode is off AND the channel flag is on AND credentials exist. */
export function providerFor(channel: Channel): Provider {
  if (override?.[channel]) return override[channel]!;
  if (!config.live(channel)) return simulatedProvider;
  if (channel === 'email') return config.resendKey ? resendProvider : simulatedProvider;
  return config.twilio ? twilioProvider : simulatedProvider;
}
