import type { Metadata } from "next";
import Link from "next/link";
import {
  ArrowRight,
  ClipboardList,
  FileText,
  Gauge,
  ShieldCheck,
  Target,
} from "lucide-react";

import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { getSessionUser } from "@/lib/server/session";

export const metadata: Metadata = {
  title: "CareerForge — a job-search operating system",
};

const CAPABILITIES = [
  {
    icon: Target,
    title: "Honest fit scoring",
    body: "Every job gets a 0–100 score with its reasoning shown. Matches are labelled confirmed, inferred, or missing evidence — so you know which claims you can actually defend in an interview.",
  },
  {
    icon: FileText,
    title: "Materials from your real record",
    body: "Cover letters, outreach, and resume bullets are generated only from accomplishments you entered. The workspace shows which ones each draft drew on.",
  },
  {
    icon: ClipboardList,
    title: "A pipeline you can see",
    body: "Kanban or table, search and filters, follow-up dates, and an activity trail that fills itself in as you work.",
  },
  {
    icon: Gauge,
    title: "Three things, then stop",
    body: "Today shows at most three actions, each sized 5 to 60 minutes, with a focus timer. Everything else waits until those are done.",
  },
];

export default async function LandingPage() {
  const user = await getSessionUser();
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <div className="min-h-dvh">
      <header className="mx-auto flex max-w-5xl items-center justify-between px-6 py-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {user ? (
            <Button asChild size="sm">
              <Link href="/today">Open CareerForge</Link>
            </Button>
          ) : (
            <>
              <Button asChild variant="ghost" size="sm">
                <Link href="/sign-in">Sign in</Link>
              </Button>
              <Button asChild size="sm">
                <Link href="/sign-up">Get started</Link>
              </Button>
            </>
          )}
        </nav>
      </header>

      <main id="main" className="mx-auto max-w-5xl px-6 pb-24">
        <section className="pt-14 pb-16 sm:pt-24">
          <p className="text-accent font-mono text-xs tracking-widest uppercase">
            Job-search operating system
          </p>
          <h1 className="text-ink mt-4 max-w-2xl text-4xl leading-[1.1] font-semibold tracking-tight text-balance sm:text-5xl">
            Stop re-deciding what to work on.
          </h1>
          <p className="text-ink-muted mt-5 max-w-xl text-base leading-relaxed">
            CareerForge holds the whole search — opportunities, fit, materials,
            follow-ups — and hands back three concrete actions at a time. Built
            for people who lose the thread when a job hunt becomes forty open
            tabs.
          </p>

          <div className="mt-8 flex flex-wrap gap-3">
            <Button asChild size="lg">
              <Link href={user ? "/today" : "/sign-up"}>
                {user ? "Open CareerForge" : "Create your account"}
                <ArrowRight />
              </Link>
            </Button>
            {!user && demoMode ? (
              <Button asChild variant="secondary" size="lg">
                <Link href="/sign-in">See the demo pipeline</Link>
              </Button>
            ) : null}
          </div>
        </section>

        <section className="grid gap-px overflow-hidden rounded-lg border sm:grid-cols-2">
          {CAPABILITIES.map(({ icon: Icon, title, body }) => (
            <div key={title} className="bg-surface p-6">
              <Icon className="text-accent size-5" />
              <h2 className="text-ink mt-4 text-sm font-semibold">{title}</h2>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                {body}
              </p>
            </div>
          ))}
        </section>

        <section className="border-line mt-16 rounded-lg border border-dashed p-6">
          <div className="flex items-start gap-3">
            <ShieldCheck className="text-ink-subtle mt-0.5 size-5 shrink-0" />
            <div>
              <h2 className="text-ink text-sm font-semibold">
                What it will not do
              </h2>
              <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                It will not invent an employer, a date, a metric, a
                certification, or a skill you did not enter. Generated text is a
                first draft assembled from your own record, and every draft
                names the accomplishments behind it so you can check the work.
                You stay the author.
              </p>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-line border-t">
        <div className="text-ink-subtle mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-2 px-6 py-6 text-xs">
          <span>CareerForge — part of the Dragon Phoenix Ascension ecosystem.</span>
          <span>Your data stays in your own database.</span>
        </div>
      </footer>
    </div>
  );
}
