import type { Metadata } from "next";
import { Suspense } from "react";

import { PageHeader, PageShell } from "@/components/layout/page-header";
import { Skeleton } from "@/components/ui/skeleton";
import { prisma } from "@/lib/server/prisma";
import { requireUser } from "@/lib/server/session";
import type { JobListItem } from "@/lib/domain/job-filters";

import { JobsWorkspace } from "./jobs-workspace";
import { NewJobButton } from "./new-job-button";

export const metadata: Metadata = { title: "Opportunities" };

async function JobsData() {
  const user = await requireUser();

  const [jobs, hasProfile] = await Promise.all([
    prisma.jobOpportunity.findMany({
      where: { userId: user.id },
      orderBy: { lastActivityAt: "desc" },
      select: {
        id: true,
        title: true,
        company: true,
        location: true,
        status: true,
        priority: true,
        salaryMin: true,
        salaryMax: true,
        salaryText: true,
        deadline: true,
        lastActivityAt: true,
        createdAt: true,
        analysis: { select: { fitScore: true } },
      },
    }),
    prisma.candidateProfile
      .findUnique({ where: { userId: user.id }, select: { id: true } })
      .then(Boolean),
  ]);

  const items: (JobListItem & { salaryText: string | null })[] = jobs.map(
    (job) => ({
      id: job.id,
      title: job.title,
      company: job.company,
      location: job.location,
      status: job.status,
      priority: job.priority,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      salaryText: job.salaryText,
      deadline: job.deadline,
      lastActivityAt: job.lastActivityAt,
      createdAt: job.createdAt,
      fitScore: job.analysis?.fitScore ?? null,
    }),
  );

  return <JobsWorkspace jobs={items} hasProfile={hasProfile} />;
}

function JobsSkeleton() {
  return (
    <div className="mt-6 space-y-4">
      <div className="flex gap-2">
        <Skeleton className="h-9 flex-1" />
        <Skeleton className="h-9 w-32" />
        <Skeleton className="h-9 w-32" />
      </div>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 6 }).map((_, i) => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    </div>
  );
}

export default function JobsPage() {
  return (
    <PageShell>
      <PageHeader
        title="Opportunities"
        description="Everything you are tracking, in one place. Add a job by pasting the posting — the description is what analysis and materials are built from."
        actions={<NewJobButton />}
      />
      <Suspense fallback={<JobsSkeleton />}>
        <JobsData />
      </Suspense>
    </PageShell>
  );
}
