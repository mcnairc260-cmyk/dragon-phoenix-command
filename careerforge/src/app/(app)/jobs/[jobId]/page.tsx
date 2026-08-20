import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ExternalLink, MapPin } from "lucide-react";

import {
  DeadlineBadge,
  PriorityBadge,
  formatSalary,
} from "@/components/jobs/job-badges";
import { PageShell } from "@/components/layout/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { WORK_MODE_LABEL } from "@/lib/domain/constants";
import { prisma } from "@/lib/server/prisma";
import { requireUser } from "@/lib/server/session";

import { StatusMover } from "../status-mover";
import { ActivityTimeline } from "./activity-timeline";
import { AnalysisPanel } from "./analysis-panel";
import { EditJobButton } from "./edit-job-button";
import { FollowUpsPanel } from "./follow-ups-panel";
import { JobDangerZone } from "./danger-zone";
import { MaterialsPanel } from "./materials-panel";
import { NotesEditor } from "./notes-editor";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ jobId: string }>;
}): Promise<Metadata> {
  const { jobId } = await params;
  const user = await requireUser();
  const job = await prisma.jobOpportunity.findFirst({
    where: { id: jobId, userId: user.id },
    select: { title: true, company: true },
  });
  return { title: job ? `${job.title} · ${job.company}` : "Opportunity" };
}

export default async function JobDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ jobId: string }>;
  searchParams: Promise<{ tab?: string }>;
}) {
  const [{ jobId }, { tab }, user] = await Promise.all([
    params,
    searchParams,
    requireUser(),
  ]);

  const job = await prisma.jobOpportunity.findFirst({
    where: { id: jobId, userId: user.id },
    include: {
      analysis: true,
      materials: { orderBy: { kind: "asc" } },
      followUps: { orderBy: { dueAt: "asc" } },
      activities: { orderBy: { createdAt: "desc" }, take: 25 },
    },
  });

  // A job belonging to another user is indistinguishable from one that does
  // not exist. That is deliberate: 404 leaks nothing about what else is here.
  if (!job) notFound();

  const profile = await prisma.candidateProfile.findUnique({
    where: { userId: user.id },
    select: {
      id: true,
      _count: { select: { accomplishments: true, skills: true } },
    },
  });

  const accomplishments = profile
    ? await prisma.accomplishment.findMany({
        where: { profileId: profile.id },
        select: { id: true, title: true, metric: true },
      })
    : [];

  return (
    <PageShell>
      <Button variant="ghost" size="sm" asChild className="mb-3 -ml-2">
        <Link href="/jobs">
          <ArrowLeft />
          All opportunities
        </Link>
      </Button>

      <header className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
        <div className="min-w-0">
          <h1 className="text-ink text-xl font-semibold tracking-tight sm:text-2xl">
            {job.title}
          </h1>
          <p className="text-ink-muted mt-1 text-sm">
            {job.company}
            {job.location ? (
              <span className="text-ink-subtle inline-flex items-center gap-1">
                {" · "}
                <MapPin className="size-3" aria-hidden />
                {job.location}
              </span>
            ) : null}
          </p>

          <div className="mt-3 flex flex-wrap items-center gap-1.5">
            <PriorityBadge priority={job.priority} />
            {job.workMode ? (
              <Badge tone="neutral">{WORK_MODE_LABEL[job.workMode]}</Badge>
            ) : null}
            <Badge tone="neutral">
              {formatSalary(job.salaryMin, job.salaryMax, job.salaryText)}
            </Badge>
            <DeadlineBadge deadline={job.deadline} />
            {job.source ? <Badge tone="neutral">via {job.source}</Badge> : null}
            {job.url ? (
              <Button variant="link" size="sm" asChild className="h-auto px-1">
                <a href={job.url} target="_blank" rel="noopener noreferrer">
                  Posting
                  <ExternalLink />
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap gap-2">
          <StatusMover jobId={job.id} status={job.status} variant="full" />
          <EditJobButton job={job} />
        </div>
      </header>

      <Tabs defaultValue={tab ?? "analysis"} className="mt-7">
        <TabsList>
          <TabsTrigger value="analysis">Fit analysis</TabsTrigger>
          <TabsTrigger value="materials">
            Materials
            {job.materials.length ? ` (${job.materials.length})` : ""}
          </TabsTrigger>
          <TabsTrigger value="posting">Posting</TabsTrigger>
          <TabsTrigger value="notes">Notes &amp; follow-ups</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="analysis">
          <AnalysisPanel
            jobId={job.id}
            hasDescription={job.description.trim().length > 0}
            hasProfile={Boolean(profile)}
            skillCount={profile?._count.skills ?? 0}
            analysis={
              job.analysis
                ? {
                    fitScore: job.analysis.fitScore,
                    explanation: job.analysis.explanation,
                    recommendedPriority: job.analysis.recommendedPriority,
                    requiredSkills: job.analysis.requiredSkills,
                    preferredSkills: job.analysis.preferredSkills,
                    matchedSkills: job.analysis.matchedSkills,
                    missingQualifications: job.analysis.missingQualifications,
                    strengths: job.analysis.strengths,
                    concerns: job.analysis.concerns,
                    provider: job.analysis.provider,
                    model: job.analysis.model,
                    updatedAt: job.analysis.updatedAt,
                  }
                : null
            }
          />
        </TabsContent>

        <TabsContent value="materials">
          <MaterialsPanel
            jobId={job.id}
            materials={job.materials}
            accomplishments={accomplishments}
            hasAnalysis={Boolean(job.analysis)}
            accomplishmentCount={profile?._count.accomplishments ?? 0}
          />
        </TabsContent>

        <TabsContent value="posting">
          {job.description.trim() ? (
            <article className="bg-surface border-line rounded-lg border p-5">
              <h2 className="text-ink-subtle font-mono text-xs tracking-wide uppercase">
                Job description as pasted
              </h2>
              <pre className="text-ink-muted mt-3 font-sans text-sm leading-relaxed whitespace-pre-wrap">
                {job.description}
              </pre>
            </article>
          ) : (
            <div className="border-line rounded-lg border border-dashed px-6 py-12 text-center">
              <p className="text-ink text-sm font-medium">
                No description saved
              </p>
              <p className="text-ink-muted mx-auto mt-1.5 max-w-sm text-sm leading-relaxed">
                Paste the posting into this opportunity and analysis becomes
                possible. Without it there is nothing to compare your profile
                against.
              </p>
              <div className="mt-5 flex justify-center">
                <EditJobButton job={job} label="Add the description" />
              </div>
            </div>
          )}
        </TabsContent>

        <TabsContent value="notes">
          <div className="grid gap-5 lg:grid-cols-2">
            <NotesEditor jobId={job.id} initialNotes={job.notes} />
            <FollowUpsPanel jobId={job.id} followUps={job.followUps} />
          </div>
          <JobDangerZone jobId={job.id} status={job.status} className="mt-6" />
        </TabsContent>

        <TabsContent value="activity">
          <ActivityTimeline activities={job.activities} />
        </TabsContent>
      </Tabs>
    </PageShell>
  );
}
