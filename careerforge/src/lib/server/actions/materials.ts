"use server";

import type { MaterialKind } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { AiProviderError, getAiProvider } from "@/lib/ai";
import { analysisResultSchema, type AnalysisResult } from "@/lib/ai/schemas";
import { MATERIAL_LABEL } from "@/lib/domain/constants";
import { buildCandidateContext, toJobContext } from "@/lib/server/ai-context";
import { prisma } from "@/lib/server/prisma";
import { checkRateLimit, describeRetryAfter } from "@/lib/server/rate-limit";
import { requireUserOrThrow } from "@/lib/server/session";
import { cleanText } from "@/lib/validation/profile";

import { fail, guarded, ok, type ActionResult } from "./result";

const MATERIAL_KINDS: MaterialKind[] = [
  "SUMMARY",
  "RESUME_BULLETS",
  "COVER_LETTER",
  "RECRUITER_OUTREACH",
  "HIRING_MANAGER_OUTREACH",
  "INTERVIEW_QUESTIONS",
  "STAR_PROMPTS",
  "COMPANY_RESEARCH",
];

function isMaterialKind(value: string): value is MaterialKind {
  return (MATERIAL_KINDS as string[]).includes(value);
}

/**
 * Reconstructs the stored analysis for material generation. Returns null when
 * the row is absent or fails validation — a material generated without an
 * analysis is weaker, but a material generated from a malformed one would be
 * wrong, and wrong is worse.
 */
function storedAnalysis(row: unknown): AnalysisResult | null {
  if (!row || typeof row !== "object") return null;
  const parsed = analysisResultSchema.safeParse(row);
  return parsed.success ? parsed.data : null;
}

export async function generateMaterialAction(
  jobId: string,
  kind: string,
): Promise<ActionResult<{ kind: MaterialKind; content: string }>> {
  // The generated text is returned, not just persisted: the editor holds the
  // draft in local state, and handing it the content directly is what keeps
  // the textarea in step with what was just written.
  return guarded<{ kind: MaterialKind; content: string }>(
    "generateMaterial",
    async () => {
      const user = await requireUserOrThrow();
      if (!isMaterialKind(kind))
        return fail("That material type is not valid.");

      const job = await prisma.jobOpportunity.findFirst({
        where: { id: jobId, userId: user.id },
        include: { analysis: true },
      });
      if (!job) return fail("That opportunity no longer exists.");

      const candidate = await buildCandidateContext(user.id);
      if (!candidate) {
        return fail(
          "Create your profile first — generated material is assembled from it and nothing else.",
        );
      }

      const limit = checkRateLimit(`material:${user.id}`);
      if (!limit.allowed) {
        return fail(
          `You have hit the generation limit. Try again in ${describeRetryAfter(limit.retryAfterSeconds)}.`,
        );
      }

      const provider = getAiProvider();
      const analysis = job.analysis
        ? storedAnalysis({
            fitScore: job.analysis.fitScore,
            recommendedPriority: job.analysis.recommendedPriority,
            explanation: job.analysis.explanation,
            requiredSkills: job.analysis.requiredSkills,
            preferredSkills: job.analysis.preferredSkills,
            matchedSkills: job.analysis.matchedSkills,
            missingQualifications: job.analysis.missingQualifications,
            strengths: job.analysis.strengths,
            concerns: job.analysis.concerns,
          })
        : null;

      let result;
      try {
        result = await provider.generateMaterial({
          candidate,
          job: toJobContext(job),
          kind,
          analysis,
        });
      } catch (error) {
        if (error instanceof AiProviderError) return fail(error.message);
        console.error("[generateMaterial] provider failed");
        return fail("The draft could not be generated. Try again.");
      }

      // A provider — mock or model — can only claim provenance for the user's
      // own accomplishments. Anything else is dropped rather than displayed.
      const ownIds = new Set(candidate.accomplishments.map((a) => a.id));
      const sourceAccomplishmentIds = result.sourceAccomplishmentIds.filter(
        (id) => ownIds.has(id),
      );

      const existing = await prisma.applicationMaterial.findUnique({
        where: { jobId_kind: { jobId: job.id, kind } },
        select: { id: true, isEdited: true },
      });

      await prisma.$transaction(async (tx) => {
        await tx.applicationMaterial.upsert({
          where: { jobId_kind: { jobId: job.id, kind } },
          create: {
            jobId: job.id,
            kind,
            generatedContent: result.content,
            content: result.content,
            sourceAccomplishmentIds,
            provider: provider.name,
            model: provider.model,
          },
          update: {
            generatedContent: result.content,
            content: result.content,
            isEdited: false,
            sourceAccomplishmentIds,
            provider: provider.name,
            model: provider.model,
          },
        });

        await tx.activity.create({
          data: {
            userId: user.id,
            jobId: job.id,
            type: "MATERIAL_GENERATED",
            message: `${existing ? "Regenerated" : "Generated"} ${MATERIAL_LABEL[kind].toLowerCase()}`,
          },
        });

        await tx.jobOpportunity.update({
          where: { id: job.id },
          data: {
            lastActivityAt: new Date(),
            status:
              job.status === "DISCOVERED" || job.status === "EVALUATING"
                ? "PREPARING"
                : job.status,
          },
        });
      });

      revalidatePath(`/jobs/${job.id}`);
      revalidatePath("/today");
      revalidatePath("/jobs");

      return ok({ kind, content: result.content });
    },
  );
}

export async function saveMaterialAction(
  jobId: string,
  kind: string,
  content: string,
): Promise<ActionResult> {
  return guarded("saveMaterial", async () => {
    const user = await requireUserOrThrow();
    if (!isMaterialKind(kind)) return fail("That material type is not valid.");

    const parsed = cleanText(20_000).safeParse(content);
    if (!parsed.success) {
      return fail(parsed.error.issues[0]?.message ?? "That draft is too long.");
    }

    const material = await prisma.applicationMaterial.findFirst({
      where: { jobId, kind, job: { userId: user.id } },
      select: { id: true, generatedContent: true },
    });
    if (!material) return fail("That draft no longer exists.");

    await prisma.applicationMaterial.update({
      where: { id: material.id },
      data: {
        content: parsed.data,
        isEdited: parsed.data !== material.generatedContent,
      },
    });

    revalidatePath(`/jobs/${jobId}`);
    return ok();
  });
}

export async function revertMaterialAction(
  jobId: string,
  kind: string,
): Promise<ActionResult<{ content: string }>> {
  return guarded("revertMaterial", async () => {
    const user = await requireUserOrThrow();
    if (!isMaterialKind(kind)) return fail("That material type is not valid.");

    const material = await prisma.applicationMaterial.findFirst({
      where: { jobId, kind, job: { userId: user.id } },
      select: { id: true, generatedContent: true },
    });
    if (!material) return fail("That draft no longer exists.");

    await prisma.applicationMaterial.update({
      where: { id: material.id },
      data: { content: material.generatedContent, isEdited: false },
    });

    revalidatePath(`/jobs/${jobId}`);
    return ok({ content: material.generatedContent });
  });
}

export async function deleteMaterialAction(
  jobId: string,
  kind: string,
): Promise<ActionResult> {
  return guarded("deleteMaterial", async () => {
    const user = await requireUserOrThrow();
    if (!isMaterialKind(kind)) return fail("That material type is not valid.");

    await prisma.applicationMaterial.deleteMany({
      where: { jobId, kind, job: { userId: user.id } },
    });

    revalidatePath(`/jobs/${jobId}`);
    return ok();
  });
}
