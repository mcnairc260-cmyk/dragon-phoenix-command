"use server";

import type { Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { AiProviderError, getAiProvider } from "@/lib/ai";
import { prisma } from "@/lib/server/prisma";
import {
  analysisInputHash,
  buildCandidateContext,
  toJobContext,
} from "@/lib/server/ai-context";
import { checkRateLimit, describeRetryAfter } from "@/lib/server/rate-limit";
import { requireUserOrThrow } from "@/lib/server/session";

import { fail, guarded, ok, type ActionResult } from "./result";

export type AnalysisSummary = {
  fitScore: number;
  cached: boolean;
  provider: string;
};

/**
 * Runs (or reuses) the fit analysis for one job.
 *
 * Caching is by input hash rather than by timestamp: a stored analysis is
 * reused whenever the posting, the profile, and the provider are unchanged.
 * That makes revisiting a job free and makes "Re-analyse" mean something
 * specific — force a fresh call because you changed something the hash does
 * not cover, or you simply want a second opinion.
 */
export async function analyzeJobAction(
  jobId: string,
  options: { force?: boolean } = {},
): Promise<ActionResult<AnalysisSummary>> {
  return guarded<AnalysisSummary>("analyzeJob", async () => {
    const user = await requireUserOrThrow();

    const job = await prisma.jobOpportunity.findFirst({
      where: { id: jobId, userId: user.id },
    });
    if (!job) return fail("That opportunity no longer exists.");

    if (!job.description.trim()) {
      return fail(
        "Paste the job description first — there is nothing to analyse without it.",
      );
    }

    const candidate = await buildCandidateContext(user.id);
    if (!candidate) {
      return fail(
        "Create your profile first. Fit scoring compares a posting against your own skills and history.",
      );
    }
    if (candidate.skills.length === 0 && !candidate.masterResume.trim()) {
      return fail(
        "Add some skills or your master resume first, or every requirement will come back as missing evidence.",
      );
    }

    const provider = getAiProvider();
    const jobContext = toJobContext(job);
    const inputHash = analysisInputHash(
      candidate,
      jobContext,
      provider.name,
      provider.model,
    );

    const existing = await prisma.jobAnalysis.findUnique({
      where: { jobId: job.id },
    });

    if (!options.force && existing && existing.inputHash === inputHash) {
      return ok({
        fitScore: existing.fitScore,
        cached: true,
        provider: existing.provider,
      });
    }

    // Only a real call is rate limited. Serving a cached analysis costs
    // nothing, so it should never consume the user's budget.
    const limit = checkRateLimit(`analyze:${user.id}`);
    if (!limit.allowed) {
      return fail(
        `You have hit the analysis limit. Try again in ${describeRetryAfter(limit.retryAfterSeconds)}.`,
      );
    }

    let result;
    try {
      result = await provider.analyzeJob({ candidate, job: jobContext });
    } catch (error) {
      if (error instanceof AiProviderError) return fail(error.message);
      // Never surface a raw provider error: it can echo the prompt, which
      // contains the user's resume.
      console.error("[analyzeJob] provider failed");
      return fail("The analysis could not be completed. Try again.");
    }

    const data = {
      fitScore: result.fitScore,
      recommendedPriority: result.recommendedPriority,
      explanation: result.explanation,
      requiredSkills: result.requiredSkills as unknown as Prisma.InputJsonValue,
      preferredSkills:
        result.preferredSkills as unknown as Prisma.InputJsonValue,
      matchedSkills: result.matchedSkills as unknown as Prisma.InputJsonValue,
      missingQualifications:
        result.missingQualifications as unknown as Prisma.InputJsonValue,
      strengths: result.strengths as unknown as Prisma.InputJsonValue,
      concerns: result.concerns as unknown as Prisma.InputJsonValue,
      provider: provider.name,
      model: provider.model,
      inputHash,
    };

    await prisma.$transaction(async (tx) => {
      await tx.jobAnalysis.upsert({
        where: { jobId: job.id },
        create: { jobId: job.id, ...data },
        update: data,
      });

      await tx.activity.create({
        data: {
          userId: user.id,
          jobId: job.id,
          type: "ANALYSIS_RUN",
          message: `Fit analysed: ${result.fitScore}/100`,
        },
      });

      await tx.jobOpportunity.update({
        where: { id: job.id },
        data: {
          lastActivityAt: new Date(),
          // Move a freshly discovered job forward: it has now been evaluated.
          status: job.status === "DISCOVERED" ? "EVALUATING" : job.status,
        },
      });
    });

    revalidatePath(`/jobs/${job.id}`);
    revalidatePath("/jobs");
    revalidatePath("/today");
    revalidatePath("/analytics");

    return ok({
      fitScore: result.fitScore,
      cached: false,
      provider: provider.name,
    });
  });
}
