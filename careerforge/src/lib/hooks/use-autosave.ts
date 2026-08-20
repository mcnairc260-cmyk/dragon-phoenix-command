"use client";

import * as React from "react";

import type { ActionResult } from "@/lib/server/actions/result";

export type SaveStatus = "idle" | "saving" | "saved" | "error";

/**
 * Debounced autosave for a single text value.
 *
 * Two behaviours matter more than they look:
 *
 * - Saves are serialised. A save in flight blocks the next one and the pending
 *   value is retried afterwards, so a fast typist cannot land an older write
 *   after a newer one.
 * - The value that was actually sent is remembered, so an edit made *during* a
 *   save is not mistaken for "already saved".
 */
export function useAutosave({
  value,
  initialValue,
  save,
  delay = 900,
}: {
  value: string;
  initialValue: string;
  save: (value: string) => Promise<ActionResult>;
  delay?: number;
}) {
  const [status, setStatus] = React.useState<SaveStatus>("idle");
  const [error, setError] = React.useState<string | null>(null);

  const savedValue = React.useRef(initialValue);
  const inFlight = React.useRef(false);
  const pending = React.useRef<string | null>(null);

  const run = React.useCallback(
    async (next: string) => {
      // A save already in flight takes the new value as its follow-up rather
      // than racing it, so an older write can never land after a newer one.
      if (inFlight.current) {
        pending.current = next;
        return;
      }

      inFlight.current = true;
      let attempt = next;

      // Loops rather than recurses: the queued value is drained here, so there
      // is exactly one place that decides what gets written next.
      for (;;) {
        setStatus("saving");
        setError(null);

        const result = await save(attempt);

        if (!result.ok) {
          setStatus("error");
          setError(result.error);
          break;
        }

        savedValue.current = attempt;
        setStatus("saved");

        const queued = pending.current;
        pending.current = null;
        if (queued === null || queued === savedValue.current) break;
        attempt = queued;
      }

      inFlight.current = false;
    },
    [save],
  );

  React.useEffect(() => {
    if (value === savedValue.current) {
      setStatus((s) => (s === "error" ? s : s === "saved" ? "saved" : "idle"));
      return;
    }

    const timer = window.setTimeout(() => void run(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay, run]);

  // A tab closed mid-debounce would otherwise lose the last edit.
  React.useEffect(() => {
    function flush() {
      if (value !== savedValue.current) void run(value);
    }
    window.addEventListener("pagehide", flush);
    return () => window.removeEventListener("pagehide", flush);
  }, [value, run]);

  return { status, error };
}
