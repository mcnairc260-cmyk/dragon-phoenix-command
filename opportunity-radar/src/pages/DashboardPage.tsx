import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { CATEGORIES, type Category, type Opportunity } from '../types/opportunity';
import { applyFilters, EMPTY_FILTERS, fitScore, sortOpportunities, type FilterState, type SortKey } from '../lib/filters';
import { useOpportunities } from '../state/useOpportunities';
import { usePreferences, useRecent, useSaved } from '../state/AppState';
import { SearchInput, SortControl } from '../components/SearchAndSort';
import { FilterPanel } from '../components/FilterPanel';
import { OpportunityCard } from '../components/OpportunityCard';
import { EmptyState, ErrorState, FeedSkeleton } from '../components/states';
import { DemoBadge, SignalStrengthIndicator } from '../components/badges';

function greeting(name: string): string {
  const hour = new Date().getHours();
  const base = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';
  return name ? `${base}, ${name}` : base;
}

function MiniCardRow({ title, items }: { title: string; items: Opportunity[] }) {
  if (items.length === 0) return null;
  return (
    <section aria-label={title} className="mb-6">
      <h2 className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-soft uppercase">{title}</h2>
      <div className="flex gap-3 overflow-x-auto pb-1">
        {items.map((o) => (
          <Link
            key={o.id}
            to={`/opportunities/${o.slug}`}
            className="min-w-52 flex-shrink-0 rounded-xl bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover"
          >
            <p className="mb-1 text-[10px] font-semibold tracking-[0.08em] text-soft uppercase">
              {o.category}
            </p>
            <p className="mb-1.5 line-clamp-2 text-xs leading-snug font-bold text-ink">{o.title}</p>
            <p className="text-xs font-semibold text-gold-ink">{o.score} · {o.growthVelocity}</p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export default function DashboardPage() {
  const opportunities = useOpportunities();
  const { preferences } = usePreferences();
  const { recentIds } = useRecent();
  const { savedIds } = useSaved();

  const [filters, setFilters] = useState<FilterState>(EMPTY_FILTERS);
  const [sortKey, setSortKey] = useState<SortKey>('score');

  const all = useMemo(
    () => (opportunities.status === 'ready' ? opportunities.data : []),
    [opportunities],
  );

  const visible = useMemo(
    () => sortOpportunities(applyFilters(all, filters), sortKey, preferences),
    [all, filters, sortKey, preferences],
  );

  const emergingSignals = useMemo(() => {
    return all
      .flatMap((o) =>
        o.signals.filter((s) => s.strength === 'Strong').map((signal) => ({ opportunity: o, signal })),
      )
      .slice(0, 4);
  }, [all]);

  const recentlyViewed = useMemo(
    () => recentIds.flatMap((id) => all.find((o) => o.id === id) ?? []),
    [recentIds, all],
  );

  const recommended = useMemo(() => {
    return [...all]
      .filter((o) => !savedIds.includes(o.id))
      .sort((a, b) => fitScore(b, preferences) - fitScore(a, preferences) || b.score - a.score)
      .slice(0, 4);
  }, [all, preferences, savedIds]);

  const toggleCategory = (category: Category) => {
    setFilters((f) => ({
      ...f,
      categories: f.categories.includes(category)
        ? f.categories.filter((c) => c !== category)
        : [...f.categories, category],
    }));
  };

  return (
    <div>
      <header className="mb-5">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
          <h1 className="text-2xl font-bold tracking-tight text-ink">
            {greeting(preferences.displayName)}
          </h1>
          <DemoBadge />
        </div>
        <p className="mt-1 text-sm text-body">
          {all.length > 0
            ? `${all.length} demo opportunities on the radar · scores are illustrative`
            : 'Scanning the radar…'}
        </p>
      </header>

      {/* Stat tiles — Stitch dashboard pattern, computed from real demo data */}
      {all.length > 0 && (
        <dl className="mb-6 grid grid-cols-1 gap-3 sm:grid-cols-3">
          {[
            {
              label: 'Opportunities tracked',
              value: all.length,
              accent: 'border-t-ink',
              icon: '📡',
            },
            {
              label: 'Strong signals',
              value: all.flatMap((o) => o.signals).filter((s) => s.strength === 'Strong').length,
              accent: 'border-t-gold',
              icon: '✨',
            },
            {
              label: 'Windows open now',
              value: all.filter((o) => o.timeWindow === 'Open now').length,
              accent: 'border-t-emerald',
              icon: '📈',
            },
          ].map((tile) => (
            <div
              key={tile.label}
              className={`flex items-center justify-between rounded-xl border-t-2 bg-card px-4 py-3.5 shadow-card ${tile.accent}`}
            >
              <div>
                <dt className="text-[10px] font-semibold tracking-[0.1em] text-soft uppercase">
                  {tile.label}
                </dt>
                <dd className="text-2xl font-bold tracking-tight text-ink">{tile.value}</dd>
              </div>
              <span aria-hidden="true" className="text-xl">
                {tile.icon}
              </span>
            </div>
          ))}
        </dl>
      )}

      {/* Search / sort */}
      <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-center">
        <SearchInput
          value={filters.search}
          onChange={(search) => setFilters((f) => ({ ...f, search }))}
        />
        <SortControl value={sortKey} onChange={setSortKey} />
      </div>

      {/* Category quick nav */}
      <nav aria-label="Categories" className="mb-4 flex gap-1.5 overflow-x-auto pb-1">
        {CATEGORIES.map((category) => {
          const active = filters.categories.includes(category);
          return (
            <button
              key={category}
              type="button"
              aria-pressed={active}
              onClick={() => toggleCategory(category)}
              className={`rounded-full border px-3 py-1.5 text-xs whitespace-nowrap transition-colors ${
                active
                  ? 'border-gold bg-gold/25 text-ink'
                  : 'border-line text-body hover:border-line-strong hover:text-ink'
              }`}
            >
              {category}
            </button>
          );
        })}
      </nav>

      <div className="mb-6">
        <FilterPanel filters={filters} onChange={setFilters} />
      </div>

      {opportunities.status === 'loading' && <FeedSkeleton />}
      {opportunities.status === 'error' && (
        <ErrorState message={opportunities.message} onRetry={opportunities.retry} />
      )}

      {opportunities.status === 'ready' && (
        <>
          {/* Emerging signals */}
          {emergingSignals.length > 0 && (
            <section aria-label="Emerging signals" className="mb-6">
              <h2 className="mb-2 text-[11px] font-semibold tracking-[0.1em] text-soft uppercase">
                Emerging signals
              </h2>
              <div className="grid gap-2 sm:grid-cols-2">
                {emergingSignals.map(({ opportunity, signal }) => (
                  <Link
                    key={`${opportunity.id}-${signal.headline}`}
                    to={`/opportunities/${opportunity.slug}`}
                    className="rounded-xl bg-card p-3 shadow-card transition-shadow hover:shadow-card-hover"
                  >
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span className="inline-flex items-center rounded-full bg-emerald/10 px-2 py-0.5 text-[9px] font-semibold tracking-[0.08em] text-emerald-ink uppercase">
                        {signal.category}
                      </span>
                      <SignalStrengthIndicator strength={signal.strength} />
                    </div>
                    <p className="text-xs leading-snug text-ink">{signal.headline}</p>
                    <p className="mt-1 text-[10px] font-medium text-soft">→ {opportunity.title}</p>
                  </Link>
                ))}
              </div>
            </section>
          )}

          <MiniCardRow title="Recently viewed" items={recentlyViewed} />
          <MiniCardRow title="Recommended for you" items={recommended} />

          {/* Main feed */}
          <section aria-label="All opportunities">
            <div className="mb-2 flex items-baseline justify-between">
              <h2 className="text-[11px] font-semibold tracking-[0.1em] text-soft uppercase">
                Opportunity feed
              </h2>
              <p className="text-[10px] font-medium text-soft">
                {visible.length} of {all.length} shown
              </p>
            </div>
            {visible.length === 0 ? (
              <EmptyState
                title="Nothing matches the current filters"
                description="Try clearing a filter or broadening your search — the radar only shows what fits every active criterion."
                action={
                  <button
                    type="button"
                    onClick={() => setFilters(EMPTY_FILTERS)}
                    className="rounded-lg bg-gold px-4 py-2 text-sm font-bold text-ink"
                  >
                    Reset search & filters
                  </button>
                }
              />
            ) : (
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {visible.map((o) => (
                  <OpportunityCard key={o.id} opportunity={o} />
                ))}
              </div>
            )}
          </section>
        </>
      )}
    </div>
  );
}
