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
        <p className="mb-1 font-mono text-[10px] tracking-[0.24em] text-ember uppercase">
          // {isLogin ? 'Access' : 'Enlist'}
        </p>
        <h1 className="font-display text-2xl font-extrabold">
          {isLogin ? 'Log in' : 'Create your account'}
        </h1>
      </header>

      {!auth.isConfigured() && (
        <p className="mb-5 rounded-lg border border-cyan/25 bg-cyan/5 p-3 text-xs leading-relaxed text-muted">
          <strong className="text-cyan">Demo build:</strong> accounts aren't live yet. This screen
          is the real {isLogin ? 'login' : 'signup'} flow, wired to an auth adapter awaiting a
          provider. You can explore the full radar without an account.
        </p>
      )}

      <form onSubmit={handleSubmit} noValidate className="space-y-4">
        <label className="block">
          <span className="mb-1.5 block text-sm text-ash">Email</span>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
            required
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ash placeholder:text-smoke focus:border-gold focus:outline-none"
            placeholder="you@example.com"
          />
        </label>
        <label className="block">
          <span className="mb-1.5 block text-sm text-ash">Password</span>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete={isLogin ? 'current-password' : 'new-password'}
            required
            minLength={8}
            className="w-full rounded-lg border border-line bg-surface px-3 py-2.5 text-sm text-ash focus:border-gold focus:outline-none"
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
          className="w-full rounded-lg bg-gradient-to-r from-ember to-gold px-4 py-2.5 text-sm font-bold text-void transition-opacity hover:opacity-90 disabled:opacity-50"
        >
          {submitting ? 'One moment…' : isLogin ? 'Log in' : 'Sign up'}
        </button>
      </form>

      <p className="mt-5 text-center text-sm text-muted">
        {isLogin ? (
          <>
            No account?{' '}
            <Link to="/signup" className="text-gold hover:underline">
              Sign up
            </Link>
          </>
        ) : (
          <>
            Already have an account?{' '}
            <Link to="/login" className="text-gold hover:underline">
              Log in
            </Link>
          </>
        )}
        {' · '}
        <Link to="/dashboard" className="text-gold hover:underline">
          Explore without one
        </Link>
      </p>
    </div>
  );
}
