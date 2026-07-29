import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';
import { auth } from '../auth/authAdapter';

/**
 * Shared login/signup form. Auth is not configured in the MVP, so submissions
 * surface the adapter's honest "not available yet" message rather than
 * pretending to create a session.
 */
export function AuthForm({ mode }: { mode: 'login' | 'signup' }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isLogin = mode === 'login';

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Enter a valid email address.');
      return;
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    setSubmitting(true);
    const result = isLogin ? await auth.signIn(email, password) : await auth.signUp(email, password);
    setSubmitting(false);
    if (!result.ok) setError(result.error);
  };

  return (
    <div className="mx-auto max-w-sm px-4 py-16">
      <header className="mb-6 text-center">
        <p className="mb-1 text-[11px] font-semibold tracking-[0.1em] text-soft uppercase">
          {isLogin ? 'Access' : 'Enlist'}
        </p>
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {isLogin ? 'Log in' : 'Create your account'}
        </h1>
      </header>

      {!auth.isConfigured() && (
        <p className="mb-5 rounded-lg border border-emerald/25 bg-emerald/5 p-3 text-xs leading-relaxed text-body">
          <strong className="text-emerald-ink">Demo build:</strong> accounts aren't live yet. This screen
          is the real {isLogin ? 'login' : 'signup'} flow, wired to an auth adapter awaiting a
          provider. You can explore the full radar without an account.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink placeholder:text-faint focus:border-ink focus:outline-none"
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ink">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            minLength={8}
            className="w-full rounded-lg border border-line bg-card px-3 py-2.5 text-sm text-ink focus:border-ink focus:outline-none"
            placeholder="At least 8 characters"
          />
        </label>

        {error && (
          <p role="alert" className="rounded-lg border border-danger/30 bg-danger/5 p-3 text-xs text-danger">
            {error}
          </p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-gold px-4 py-2.5 text-sm font-bold text-ink transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'One moment…' : isLogin ? 'Log in' : 'Sign up'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-body">
        {isLogin ? (
          <>
            No account?{' '}
            <Link to="/signup" className="text-gold-ink hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link to="/login" className="text-gold-ink hover:underline">
              Log in
            </Link>
          </>
        )}
        {' · '}
        <Link to="/dashboard" className="text-gold-ink hover:underline">
          Explore without one
        </Link>
      </p>
    </div>
  );
}
