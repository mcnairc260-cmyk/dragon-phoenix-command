import { useEffect, useState } from 'react';
import type { Opportunity } from '../types/opportunity';
import { repository } from '../data/repository';

export type AsyncState<T> =
  | { status: 'loading' }
  | { status: 'error'; message: string }
  | { status: 'ready'; data: T };

export function useOpportunities(): AsyncState<Opportunity[]> & { retry: () => void } {
  const [state, setState] = useState<AsyncState<Opportunity[]>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let cancelled = false;
    setState({ status: 'loading' });
    repository
      .listAll()
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load opportunities.',
          });
      });
    return () => {
      cancelled = true;
    };
  }, [attempt]);

  return { ...state, retry: () => setAttempt((a) => a + 1) };
}

export function useOpportunity(slug: string | undefined): AsyncState<Opportunity | null> {
  const [state, setState] = useState<AsyncState<Opportunity | null>>({ status: 'loading' });

  useEffect(() => {
    if (!slug) {
      setState({ status: 'ready', data: null });
      return;
    }
    let cancelled = false;
    setState({ status: 'loading' });
    repository
      .getBySlug(slug)
      .then((data) => {
        if (!cancelled) setState({ status: 'ready', data });
      })
      .catch((err: unknown) => {
        if (!cancelled)
          setState({
            status: 'error',
            message: err instanceof Error ? err.message : 'Could not load this opportunity.',
          });
      });
    return () => {
      cancelled = true;
    };
  }, [slug]);

  return state;
}
