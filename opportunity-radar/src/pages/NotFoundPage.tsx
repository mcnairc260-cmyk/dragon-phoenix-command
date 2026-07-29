import { Link } from 'react-router-dom';

export default function NotFoundPage() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-4 text-center">
      <p className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">
        Signal lost
      </p>
      <h1 className="font-display text-5xl font-bold text-ash">404</h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-body">
        This page isn't on the radar. The link may be old, or the coordinates mistyped.
      </p>
      <div className="mt-6 flex gap-3">
        <Link
          to="/"
          className="rounded-lg border border-line-strong px-4 py-2 text-sm font-bold text-ash hover:border-gold hover:text-gold"
        >
          Home
        </Link>
        <Link
          to="/dashboard"
          className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-void"
        >
          Back to the radar
        </Link>
      </div>
    </div>
  );
}
