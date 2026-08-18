"use client";

import { useEffect } from "react";
import { RotateCcw, TriangleAlert } from "lucide-react";

import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Only the digest — never the message, which may quote user content.
    console.error("Unhandled UI error", error.digest ?? "(no digest)");
  }, [error]);

  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <div className="bg-critical-soft text-critical mx-auto mb-5 grid size-11 place-items-center rounded-full">
          <TriangleAlert className="size-5" />
        </div>
        <h1 className="text-ink text-xl font-semibold tracking-tight">
          Something broke on this screen
        </h1>
        <p className="text-ink-muted mt-2 text-sm leading-relaxed">
          Your data is safe — this is a display problem, not a save problem. Try
          again, and if it keeps happening go back to Today and take another
          route in.
        </p>
        {error.digest ? (
          <p className="text-ink-subtle mt-3 font-mono text-xs">
            Reference: {error.digest}
          </p>
        ) : null}
        <div className="mt-6 flex justify-center gap-2">
          <Button onClick={reset}>
            <RotateCcw />
            Try again
          </Button>
          <Button variant="secondary" asChild>
            <a href="/today">Go to Today</a>
          </Button>
        </div>
      </div>
    </main>
  );
}
