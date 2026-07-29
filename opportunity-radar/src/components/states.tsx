import { Icon, type IconName } from './Icon';
import type { ReactNode } from 'react';

export function EmptyState({
  icon = 'radar',
  title,
  description,
  action,
}: {
  icon?: IconName;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center rounded-2xl bg-surface px-6 py-12 shadow-card text-center">
      <Icon name={icon} size={30} className="mb-3 text-muted" />
      <h3 className="mb-1 text-base font-bold tracking-tight text-ash">{title}</h3>
      <p className="mb-4 max-w-sm text-sm text-body">{description}</p>
      {action}
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div
      role="alert"
      className="flex flex-col items-center rounded-xl border border-danger/30 bg-danger/5 px-6 py-12 text-center"
    >
      <Icon name="alert" size={30} className="mb-3 text-danger" />
      <h3 className="mb-1 text-base font-bold tracking-tight text-ash">Something went wrong</h3>
      <p className="mb-4 max-w-sm text-sm text-body">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="rounded-lg border border-line-strong px-4 py-2 text-sm font-bold text-ash hover:border-gold hover:text-gold"
        >
          Try again
        </button>
      )}
    </div>
  );
}

export function CardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl bg-surface p-4 shadow-card" aria-hidden="true">
      <div className="mb-3 flex justify-between gap-3">
        <div className="flex-1 space-y-2">
          <div className="h-2.5 w-24 rounded bg-surface3" />
          <div className="h-4 w-3/4 rounded bg-surface3" />
        </div>
        <div className="h-12 w-14 rounded-lg bg-surface3" />
      </div>
      <div className="mb-4 space-y-2">
        <div className="h-3 w-full rounded bg-surface3" />
        <div className="h-3 w-5/6 rounded bg-surface3" />
      </div>
      <div className="h-8 w-28 rounded-lg bg-surface3" />
    </div>
  );
}

export function FeedSkeleton({ count = 6 }: { count?: number }) {
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3" role="status" aria-label="Loading opportunities">
      {Array.from({ length: count }, (_, i) => (
        <CardSkeleton key={i} />
      ))}
      <span className="sr-only">Loading…</span>
    </div>
  );
}
