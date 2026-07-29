import { Link } from 'react-router-dom';
import { useMemo } from 'react';
import { useOpportunities } from '../state/useOpportunities';
import { useSaved } from '../state/AppState';
import { OpportunityCard } from '../components/OpportunityCard';
import { EmptyState, ErrorState, FeedSkeleton } from '../components/states';

export default function SavedPage() {
  const state = useOpportunities();
  const { savedIds } = useSaved();

  const saved = useMemo(() => {
    if (state.status !== 'ready') return [];
    return savedIds.flatMap((id) => state.data.find((o) => o.id === id) ?? []);
  }, [state, savedIds]);

  return (
    <div>
      <header className="mb-6">
        <p className="text-[11px] font-semibold tracking-[0.1em] text-muted uppercase">Watchlist</p>
        <h1 className="font-display text-2xl font-bold text-ash">Saved opportunities</h1>
        <p className="mt-1 text-sm text-body">
          Saved locally in this browser for the MVP — accounts will sync them across devices later.
        </p>
      </header>

      {state.status === 'loading' && <FeedSkeleton count={3} />}
      {state.status === 'error' && <ErrorState message={state.message} onRetry={state.retry} />}
      {state.status === 'ready' &&
        (saved.length === 0 ? (
          <EmptyState
            icon="bookmark"
            title="No saved opportunities yet"
            description="When something on the radar fits your plans, save it here so it doesn't get lost in the noise."
            action={
              <Link
                to="/dashboard"
                className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-void"
              >
                Browse the radar
              </Link>
            }
          />
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {saved.map((o) => (
              <OpportunityCard key={o.id} opportunity={o} />
            ))}
          </div>
        ))}
    </div>
  );
}
