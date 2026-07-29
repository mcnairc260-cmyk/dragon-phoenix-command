/**
 * Authentication integration point.
 *
 * The MVP ships WITHOUT live authentication — no credentials or provider have
 * been configured, and faking a login would misrepresent the product state.
 * The Login/Signup pages render real forms wired to this adapter; today it
 * reports auth as unavailable, and the pages say so honestly.
 *
 * To go live, implement AuthAdapter with the chosen provider (Supabase, Clerk,
 * and Auth.js are the leading candidates — a founder decision) and swap the
 * export at the bottom. Keep provider SDK calls inside the adapter; components
 * must never import a provider directly.
 */

export interface AuthUser {
  id: string;
  email: string;
  displayName: string | null;
}

export type AuthResult =
  | { ok: true; user: AuthUser }
  | { ok: false; error: string };

export interface AuthAdapter {
  /** Whether a real provider is configured. UI uses this to label auth state honestly. */
  isConfigured(): boolean;
  getCurrentUser(): Promise<AuthUser | null>;
  signIn(email: string, password: string): Promise<AuthResult>;
  signUp(email: string, password: string): Promise<AuthResult>;
  signOut(): Promise<void>;
}

/** Placeholder adapter: honest about not being wired to a provider yet. */
export class UnconfiguredAuthAdapter implements AuthAdapter {
  isConfigured(): boolean {
    return false;
  }

  async getCurrentUser(): Promise<AuthUser | null> {
    return null;
  }

  async signIn(): Promise<AuthResult> {
    return {
      ok: false,
      error:
        'Authentication is not configured in this demo build. Accounts arrive with the first production release.',
    };
  }

  async signUp(): Promise<AuthResult> {
    return {
      ok: false,
      error:
        'Sign-up is not available in this demo build. Accounts arrive with the first production release.',
    };
  }

  async signOut(): Promise<void> {
    // Nothing to do without a provider.
  }
}

export const auth: AuthAdapter = new UnconfiguredAuthAdapter();
