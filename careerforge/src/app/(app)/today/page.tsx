import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { ArrowRight, BellRing, TrendingUp } from "lucide-react";

import { FitScore, StatusBadge } from "@/components/jobs/job-badges";
import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ACTIVE_STATUSES, SUBMITTED_STATUSES } from "@/lib/domain/constants";
import { daysSince, daysUntil } from "@/lib/domain/job-filters";
import { refreshFocusTasks } from "@/lib/server/actions/focus";
import { prisma } from "@/lib/server/prisma";
import { requireUser } from "@/lib/server/session";

import { FocusList } from "./focus-list";

export const metadata: Metadata = { title: "Today" };

// Recommendations depend on the current time, so this page is never cached.
export const dynamic = "force-dynamic";

function greeting(now: Date): string {
  const hour = now.getHours();
  if (hour < 12) return "Good morning";
  if (hour < 18) return "Good afternoon";
  return "Good evening";
}

async function TodayContent() {
  const user = await requireUser();
  const tasks = await refreshFocusTasks(user.id);

  const [jobs, dueFollowUps, completedToday] = await Promise.all([
    prisma.jobOpportunity.findMany({
      where: { userId: user.id, archivedAt: null },
      select: {
        id: true,
        title: true,
        company: true,
        status: true,
        lastActivityAt: true,
        deadline: true,
        analysis: { select: { fitScore: true } },
      },
    }),
    prisma.followUp.findMany({
      where: {
        job: { userId: user.id },
        completedAt: null,
        dueAt: { lte: followUpHorizon() },
      },
      orderBy: { dueAt: "asc" },
      take: 5,
      include: { job: { select: { id: true, company: true } } },
    }),
    prisma.focusTask.count({
      where: {
        userId: user.id,
        status: "COMPLETED",
        completedAt: { gte: startOfToday() },
      },
    }),
  ]);

  const active = jobs.filter((j) => ACTIVE_STATUSES.includes(j.status));
  const submitted = jobs.filter((j) => SUBMITTED_STATUSES.includes(j.status));
  const interviewing = jobs.filter((j) => j.status === "INTERVIEWING");

  const strongest = jobs
    .filter((j) => j.analysis && ACTIVE_STATUSES.includes(j.status))
    .sort((a, b) => (b.analysis?.fitScore ?? 0) - (a.analysis?.fitScore ?? 0))
    .slice(0, 4);

  const quiet = active
    .filter((j) => daysSince(j.lastActivityAt) >= 10)
    .sort((a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime())
    .slice(0, 4);

  return (
    <>
      <FocusList tasks={tasks} completedToday={completedToday} />

      <section className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Stat label="Active opportunities" value={active.length} />
        <Stat label="Applications submitted" value={submitted.length} />
        <Stat label="Interviewing" value={interviewing.length} />
        <Stat
          label="Needs follow-up"
          value={dueFollowUps.length}
          tone={dueFollowUps.length > 0 ? "caution" : "neutral"}
        />
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="text-accent size-4" aria-hidden />
              Strongest opportunities
            </CardTitle>
            <CardDescription>
              Highest fit scores among everything still live.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {strongest.length === 0 ? (
              <p className="text-ink-muted text-sm leading-relaxed">
                Nothing analysed yet. Run a fit analysis on a job and it will
                rank here.
              </p>
            ) : (
              <ul className="space-y-2.5">
                {strongest.map((job) => (
                  <li key={job.id} className="flex items-center gap-3">
                    <Link
                      href={`/jobs/${job.id}`}
                      className="min-w-0 flex-1 rounded-sm hover:underline"
                    >
                      <span className="text-ink block truncate text-sm">
                        {job.title}
                      </span>
                      <span className="text-ink-subtle block truncate text-xs">
                        {job.company}
                      </span>
                    </Link>
                    <FitScore score={job.analysis?.fitScore ?? null} />
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BellRing className="text-caution size-4" aria-hidden />
              Needs attention
            </CardTitle>
            <CardDescription>
              Follow-ups coming due, and opportunities that have gone quiet.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {dueFollowUps.length > 0 ? (
              <ul className="space-y-2">
                {dueFollowUps.map((followUp) => {
                  const days = daysUntil(followUp.dueAt) ?? 0;
                  return (
                    <li key={followUp.id} className="flex items-center gap-2.5">
                      <Badge tone={days < 0 ? "critical" : "caution"}>
                        {days < 0
                          ? `${Math.abs(days)}d late`
                          : days === 0
                            ? "Today"
                            : `${days}d`}
                      </Badge>
                      <Link
                        href={`/jobs/${followUp.job.id}?tab=notes`}
                        className="min-w-0 flex-1 truncate rounded-sm text-sm hover:underline"
                      >
                        {followUp.note ||
                          `Follow up with ${followUp.job.company}`}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            ) : null}

            {quiet.length > 0 ? (
              <div>
                <p className="text-ink-subtle mb-2 font-mono text-xs tracking-wide uppercase">
                  Gone quiet
                </p>
                <ul className="space-y-2">
                  {quiet.map((job) => (
                    <li key={job.id} className="flex items-center gap-2.5">
                      <Badge tone="neutral">
                        {daysSince(job.lastActivityAt)}d
                      </Badge>
                      <Link
                        href={`/jobs/${job.id}`}
                        className="min-w-0 flex-1 truncate rounded-sm text-sm hover:underline"
                      >
                        {job.company}
                      </Link>
                      <StatusBadge status={job.status} />
                    </li>
                  ))}
                </ul>
              </div>
            ) : null}

            {dueFollowUps.length === 0 && quiet.length === 0 ? (
              <p className="text-ink-muted text-sm leading-relaxed">
                Nothing is overdue and nothing has gone quiet. That is the
                pipeline working.
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="mt-6 flex justify-center">
        <Button variant="ghost" asChild>
          <Link href="/analytics">
            See whether the pipeline is improving
            <ArrowRight />
          </Link>
        </Button>
      </div>
    </>
  );
}

/** Follow-ups within the next three days are close enough to surface today. */
function followUpHorizon(): Date {
  const d = new Date();
  d.setDate(d.getDate() + 3);
  return d;
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function Stat({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "caution";
}) {
  return (
    <div className="bg-surface border-line rounded-lg border p-4">
      <p
        className={
          tone === "caution"
            ? "text-caution font-mono text-2xl tabular-nums"
            : "text-ink font-mono text-2xl tabular-nums"
        }
      >
        {value}
      </p>
      <p className="text-ink-muted mt-0.5 text-xs">{label}</p>
    </div>
  );
}

function TodaySkeleton() {
  return (
    <div className="mt-6 space-y-4">
      {Array.from({ length: 3 }).map((_, i) => (
        <Skeleton key={i} className="h-24" />
      ))}
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-20" />
        ))}
      </div>
    </div>
  );
}

export default async function TodayPage() {
  const user = await requireUser();
  const firstName = (user.name ?? "").trim().split(/\s+/)[0];

  return (
    <PageShell>
      <PageHeader
        title={`${greeting(new Date())}${firstName ? `, ${firstName}` : ""}`}
        description="Three things, in order. Everything else can wait until these are done."
      />
      <Suspense fallback={<TodaySkeleton />}>
        <TodayContent />
      </Suspense>
    </PageShell>
  );
}
