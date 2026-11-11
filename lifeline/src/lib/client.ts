'use client';
import { startAuthentication, startRegistration } from '@simplewebauthn/browser';

export class ApiError extends Error {
  constructor(public code: string, message: string, public status: number) {
    super(message);
  }
}

export async function api<T = any>(method: string, path: string, body?: unknown): Promise<T> {
  const res = await fetch(`/api${path}`, {
    method, credentials: 'same-origin', cache: 'no-store',
    headers: body === undefined ? undefined : { 'content-type': 'application/json' },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new ApiError(data?.error?.code ?? 'ERROR', data?.error?.message ?? 'Something went wrong.', res.status);
  return data as T;
}

/** Runs the passkey ceremony if the server asks for one. Returns undefined when no passkey is enrolled (demo mode). */
export async function passkeyAssertion(optionsPath: string) {
  const { options } = await api<{ options: any }>('POST', optionsPath, {});
  if (!options) return undefined;
  try {
    return await startAuthentication({ optionsJSON: options });
  } catch {
    throw new ApiError('PASSKEY_CANCELLED', 'Device verification was cancelled or is not available on this device.', 0);
  }
}

export async function enrollPasskey(label: string) {
  const { options } = await api<{ options: any }>('POST', '/passkeys/options', {});
  let response;
  try {
    response = await startRegistration({ optionsJSON: options });
  } catch {
    throw new ApiError('PASSKEY_CANCELLED', 'This device did not create a passkey. You can try again.', 0);
  }
  await api('POST', '/passkeys', { response, label });
}

export const passkeysSupported = () => typeof window !== 'undefined' && !!window.PublicKeyCredential;

export function fmtDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s % 86400 === 0 && s >= 86400) return `${s / 86400} day${s === 86400 ? '' : 's'}`;
  if (s % 3600 === 0 && s >= 3600) return `${s / 3600} hour${s === 3600 ? '' : 's'}`;
  if (s >= 86400) return `${Math.floor(s / 86400)}d ${Math.round((s % 86400) / 3600)}h`;
  if (s >= 3600) return `${Math.floor(s / 3600)}h ${Math.round((s % 3600) / 60)}m`;
  return `${Math.max(1, Math.round(s / 60))} min`;
}

export function fmtCountdown(ms: number): { days: number; clock: string } {
  const s = Math.max(0, Math.floor(ms / 1000));
  const p = (n: number) => String(n).padStart(2, '0');
  return { days: Math.floor(s / 86400), clock: `${p(Math.floor((s % 86400) / 3600))}:${p(Math.floor((s % 3600) / 60))}:${p(s % 60)}` };
}

export const fmtDate = (d: string | Date | null | undefined) =>
  d ? new Date(d).toLocaleString(undefined, { weekday: 'short', month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }) : '—';

export const INTERVALS: [string, number][] = [
  ['12 hours', 43200], ['24 hours', 86400], ['3 days', 259200], ['7 days', 604800], ['10 days', 864000], ['14 days', 1209600], ['30 days', 2592000],
];
