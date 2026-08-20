"use client";

import * as React from "react";

/**
 * A small preference persisted to localStorage and shared across every
 * component that reads it.
 *
 * Implemented as an external store rather than "read storage in an effect,
 * then setState": that pattern renders the default first and corrects itself a
 * frame later, which shows up as a visible flicker on exactly the settings a
 * user picked deliberately. `useSyncExternalStore` also gives React a distinct
 * server snapshot, so SSR and hydration agree.
 */
const listeners = new Set<() => void>();
const cache = new Map<string, string | null>();

function read(key: string): string | null {
  if (cache.has(key)) return cache.get(key) ?? null;
  let value: string | null = null;
  try {
    value = window.localStorage.getItem(key);
  } catch {
    // Private browsing or a blocked origin: the default is fine.
  }
  cache.set(key, value);
  return value;
}

function write(key: string, value: string) {
  cache.set(key, value);
  try {
    window.localStorage.setItem(key, value);
  } catch {
    // Non-fatal: the choice still applies for this session.
  }
  for (const listener of listeners) listener();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  // Another tab changing the same key should be reflected here too.
  const onStorage = (event: StorageEvent) => {
    if (event.key) cache.delete(event.key);
    listener();
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function useLocalPreference<T extends string>(
  key: string,
  allowed: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const value = React.useSyncExternalStore(
    subscribe,
    () => {
      const stored = read(key);
      return stored !== null && (allowed as readonly string[]).includes(stored)
        ? (stored as T)
        : fallback;
    },
    () => fallback,
  );

  const set = React.useCallback((next: T) => write(key, next), [key]);

  return [value, set];
}
