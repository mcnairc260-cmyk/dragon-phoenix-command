import "server-only";

import { createHash } from "node:crypto";

import { prisma } from "@/lib/server/prisma";
import type { CandidateContext, JobContext } from "@/lib/ai/types";

/**
 * Assembles the bounded fact set a provider is allowed to see.
 *
 * Nothing reaches a provider except what this function selects, which is what
 * makes "generated material cannot invent an employer" checkable rather than
 * aspirational: there is exactly one place to audit.
 */
export async function buildCandidateContext(
  userId: string,
): Promise<CandidateContext | null> {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    include: {
      skills: { orderBy: { name: "asc" } },
      employments: { orderBy: { startDate: "desc" } },
      educations: { orderBy: { endDate: "desc" } },
      accomplishments: {
        orderBy: { createdAt: "desc" },
        include: { employment: { select: { company: true } } },
      },
    },
  });

  if (!profile) return null;

  const links: { label: string; url: string }[] = [];
  if (profile.linkedIn)
    links.push({ label: "LinkedIn", url: profile.linkedIn });
  if (profile.github) links.push({ label: "GitHub", url: profile.github });
  if (profile.portfolio)
    links.push({ label: "Portfolio", url: profile.portfolio });

  return {
    fullName: profile.fullName,
    headline: profile.headline,
    email: profile.email,
    phone: profile.phone,
    location: profile.location,
    links,
    targetRoles: profile.targetRoles,
    preferredLocations: profile.preferredLocations,
    workMode: profile.workMode,
    desiredSalaryMin: profile.desiredSalaryMin,
    desiredSalaryMax: profile.desiredSalaryMax,
    salaryCurrency: profile.salaryCurrency,
    masterResume: profile.masterResume,
    skills: profile.skills.map((s) => ({
      name: s.name,
      category: s.category,
      level: s.level,
      yearsExperience: s.yearsExperience,
    })),
    employments: profile.employments.map((e) => ({
      company: e.company,
      title: e.title,
      location: e.location,
      startDate: e.startDate.toISOString().slice(0, 10),
      endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : null,
      isCurrent: e.isCurrent,
      summary: e.summary,
    })),
    educations: profile.educations.map((e) => ({
      institution: e.institution,
      credential: e.credential,
      field: e.field,
      endDate: e.endDate ? e.endDate.toISOString().slice(0, 10) : null,
      notes: e.notes,
    })),
    accomplishments: profile.accomplishments.map((a) => ({
      id: a.id,
      title: a.title,
      situation: a.situation,
      task: a.task,
      action: a.action,
      result: a.result,
      metric: a.metric,
      skillTags: a.skillTags,
      categories: a.categories,
      company: a.employment?.company ?? null,
    })),
  };
}

export function toJobContext(job: {
  title: string;
  company: string;
  location: string | null;
  workMode: string | null;
  salaryText: string | null;
  salaryMin: number | null;
  salaryMax: number | null;
  description: string;
}): JobContext {
  return {
    title: job.title,
    company: job.company,
    location: job.location,
    workMode: job.workMode,
    salaryText: job.salaryText,
    salaryMin: job.salaryMin,
    salaryMax: job.salaryMax,
    description: job.description,
  };
}

/**
 * Fingerprints the inputs an analysis depends on. A stored analysis whose hash
 * still matches is current, so re-opening a job costs nothing — the user pays
 * for a model call only when the posting or their profile actually changed, or
 * when they ask for one explicitly.
 */
export function analysisInputHash(
  candidate: CandidateContext,
  job: JobContext,
  providerName: string,
  model: string,
): string {
  const material = JSON.stringify({
    provider: providerName,
    model,
    job: {
      title: job.title,
      company: job.company,
      location: job.location,
      workMode: job.workMode,
      salaryMin: job.salaryMin,
      salaryMax: job.salaryMax,
      description: job.description,
    },
    candidate: {
      targetRoles: candidate.targetRoles,
      preferredLocations: candidate.preferredLocations,
      workMode: candidate.workMode,
      desiredSalaryMin: candidate.desiredSalaryMin,
      desiredSalaryMax: candidate.desiredSalaryMax,
      skills: candidate.skills,
      employments: candidate.employments,
      educations: candidate.educations,
      accomplishments: candidate.accomplishments.map((a) => ({
        id: a.id,
        title: a.title,
        skillTags: a.skillTags,
        result: a.result,
        metric: a.metric,
      })),
      masterResume: candidate.masterResume,
    },
  });

  return createHash("sha256").update(material).digest("hex");
}
