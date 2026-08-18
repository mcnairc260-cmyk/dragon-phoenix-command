import Link from "next/link";

import { Button } from "@/components/ui/button";

export default function NotFound() {
  return (
    <main className="grid min-h-dvh place-items-center px-6">
      <div className="max-w-md text-center">
        <p className="text-accent font-mono text-sm">404</p>
        <h1 className="text-ink mt-2 text-xl font-semibold tracking-tight">
          That page does not exist
        </h1>
        <p className="text-ink-muted mt-2 text-sm leading-relaxed">
          The link may be stale, or the opportunity it pointed at was deleted.
        </p>
        <div className="mt-6 flex justify-center gap-2">
          <Button asChild>
            <Link href="/today">Go to Today</Link>
          </Button>
          <Button variant="secondary" asChild>
            <Link href="/jobs">All opportunities</Link>
          </Button>
        </div>
      </div>
    </main>
  );
}
