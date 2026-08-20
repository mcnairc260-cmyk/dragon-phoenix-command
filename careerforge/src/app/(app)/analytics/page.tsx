import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { CircleAlert, Info, TriangleAlert } from "lucide-react";

import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  applicationsByWeek,
  diagnose,
  formatRate,
  summarise,
  type AnalyticsJob,
  type Insight,
} from "@/lib/domain/analytics";
import { JOB_STATUS_LABEL, KANBAN_STATUSES } from "@/lib/domain/constants";
import { prisma } from "@/lib/server/prisma";
import { requireUser } from "@/lib/server/session";
import { cn } from "@/lib/utils";

import { ApplicationsChart, PipelineChart } from "./charts";

export const metadata: Metadata = { title: "Analytics" };
export const dynamic = "force-dynamic";

async function AnalyticsContent() {
  const user = await requireUser();

  const rows = await prisma.jobOpportunity.findMany({
    where: { userId: user.id },
    select: {
      id: true,
      company: true,
      status: true,
      createdAt: true,
      appliedAt: true,
      lastActivityAt: true,
      analysis: { select: { fitScore: true } },
      _count: { select: { materials: true } },
      followUps: { where: { completedAt: null }, select: { id: true } },
    },
  });

  const jobs: AnalyticsJob[] = rows.map((row) => ({
    id: row.id,
    company: row.company,
    status: row.status,
    createdAt: row.createdAt,
    appliedAt: row.appliedAt,
    lastActivityAt: row.lastActivityAt,
    fitScore: row.analysis?.fitScore ?? null,
    hasMaterials: row._count.materials > 0,
    openFollowUps: row.followUps.length,
  }));

  if (jobs.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          title="Nothing to measure yet"
          description="Analytics start meaning something once a few opportunities are in the pipeline. Add some jobs and come back."
          action={
            <Button asChild>
              <Link href="/jobs">Go to opportunities</Link>
            </Button>
          }
        />
      </div>
    );
  }

  const summary = summarise(jobs);
  const insights = diagnose(jobs, summary);
  const weeks = applicationsByWeek(jobs, 12);

  const pipeline = KANBAN_STATUSES.map((status) => ({
    stage: JOB_STATUS_LABEL[status],
    count: jobs.filter((j) => j.status === status).length,
  }));

  return (
    <>
      <section aria-label="Pipeline diagnosis" className="mt-6 space-y-3">
        {insights.map((insight) => (
          <InsightCard key={insight.id} insight={insight} />
        ))}
      </section>

      <section
        aria-label="Headline metrics"
        className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4"
      >
        <Metric
          label="Applications submitted"
          value={String(summary.submitted)}
          note={`${summary.total} opportunities tracked`}
        />
        <Metric
          label="Response rate"
          value={formatRate(summary.responseRate)}
          note={
            summary.responseRate.denominator === 0
              ? "No applications yet"
              : `${summary.responseRate.numerator} of ${summary.responseRate.denominator}${
                  summary.responseRate.reliable ? "" : " — too few to read"
                }`
          }
          muted={!summary.responseRate.reliable}
        />
        <Metric
          label="Interview rate"
          value={formatRate(summary.interviewRate)}
          note={
            summary.interviewRate.denominator === 0
              ? "No applications yet"
              : `${summary.interviewRate.numerator} of ${summary.interviewRate.denominator}${
                  summary.interviewRate.reliable ? "" : " — too few to read"
                }`
          }
          muted={!summary.interviewRate.reliable}
        />
        <Metric
          label="Offer rate"
          value={formatRate(summary.offerRate)}
          note={
            summary.offerRate.denominator === 0
              ? "No applications yet"
              : `${summary.offerRate.numerator} of ${summary.offerRate.denominator}${
                  summary.offerRate.reliable ? "" : " — too few to read"
                }`
          }
          muted={!summary.offerRate.reliable}
        />
      </section>

      <section className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Metric
          label="Average fit score"
          value={
            summary.averageFitScore === null
              ? "—"
              : String(summary.averageFitScore)
          }
          note={
            summary.analysedCount === 0
              ? "Nothing analysed yet"
              : `Across ${summary.analysedCount} analysed`
          }
        />
        <Metric
          label="Median days since activity"
          value={
            summary.medianDaysSinceActivity === null
              ? "—"
              : String(summary.medianDaysSinceActivity)
          }
          note="Across everything still live"
        />
        <Metric
          label="Longest silence"
          value={summary.stalest ? `${summary.stalest.days}d` : "—"}
          note={summary.stalest ? summary.stalest.company : "Nothing live"}
        />
        <Metric
          label="Currently interviewing"
          value={String(summary.interviewing)}
          note={`${summary.offers} offer${summary.offers === 1 ? "" : "s"}`}
        />
      </section>

      <div className="mt-6 grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Applications submitted per week</CardTitle>
            <CardDescription>
              The last twelve weeks. Consistency matters more than any single
              week&apos;s height.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ApplicationsChart data={weeks} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Where everything is sitting</CardTitle>
            <CardDescription>
              A stage holding far more than the ones on either side of it is
              usually where the work is stuck.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <PipelineChart data={pipeline} />
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function InsightCard({ insight }: { insight: Insight }) {
  const Icon =
    insight.severity === "act"
      ? TriangleAlert
      : insight.severity === "watch"
        ? CircleAlert
        : Info;

  return (
    <div
      className={cn(
        "flex items-start gap-3 rounded-lg border px-4 py-3.5",
        insight.severity === "act" && "border-accent/40 bg-accent-soft",
        insight.severity === "watch" && "border-caution/40 bg-caution-soft",
        insight.severity === "info" && "border-line bg-surface",
      )}
    >
      <Icon
        aria-hidden
        className={cn(
          "mt-0.5 size-4 shrink-0",
          insight.severity === "act" && "text-accent",
          insight.severity === "watch" && "text-caution",
          insight.severity === "info" && "text-ink-subtle",
        )}
      />
      <div className="min-w-0">
        <p className="text-ink text-sm font-medium">{insight.headline}</p>
        <p className="text-ink-muted mt-1 text-sm leading-relaxed">
          {insight.detail}
        </p>
      </div>
    </div>
  );
}

function Metric({
  label,
  value,
  note,
  muted,
}: {
  label: string;
  value: string;
  note: string;
  muted?: boolean;
}) {
  return (
    <div className="bg-surface border-line rounded-lg border p-4">
      <p className="text-ink-muted text-xs">{label}</p>
      <p
        className={cn(
          "mt-1.5 font-mono text-2xl tabular-nums",
          muted ? "text-ink-subtle" : "text-ink",
        )}
      >
        {value}
      </p>
      <p className="text-ink-subtle mt-1 text-xs">{note}</p>
    </div>
  );
}

function AnalyticsSkeleton() {
  return (
    <div className="mt-6 space-y-5">
      <Skeleton className="h-20" />
      <div className="grid gap-4 sm:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="h-24" />
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-72" />
        <Skeleton className="h-72" />
      </div>
    </div>
  );
}

export default function AnalyticsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Analytics"
        description="Whether the pipeline is improving, and where it is stuck. Rates over small numbers are labelled as such rather than dressed up."
      />
      <Suspense fallback={<AnalyticsSkeleton />}>
        <AnalyticsContent />
      </Suspense>
    </PageShell>
  );
}
