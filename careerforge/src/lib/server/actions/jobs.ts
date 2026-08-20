"use server";

import type { ActivityType, JobStatus, Prisma } from "@prisma/client";
import { revalidatePath } from "next/cache";

import { JOB_STATUS_LABEL } from "@/lib/domain/constants";
import { prisma } from "@/lib/server/prisma";
import { requireUserOrThrow } from "@/lib/server/session";
import {
  followUpSchema,
  jobNotesSchema,
  jobSchema,
  jobStatusUpdateSchema,
} from "@/lib/validation/job";

import {
  fail,
  formToObject,
  guarded,
  ok,
  parseOrFail,
  type ActionResult,
} from "./result";

function refresh(jobId?: string) {
  revalidatePath("/jobs");
  revalidatePath("/today");
  revalidatePath("/analytics");
  if (jobId) revalidatePath(`/jobs/${jobId}`);
}

/**
 * Records what happened and stamps `lastActivityAt` in the same transaction as
 * the change itself, so the "gone quiet" signals the Today page relies on can
 * never drift from reality.
 */
async function logActivity(
  tx: Prisma.TransactionClient,
  args: { userId: string; jobId: string; type: ActivityType; message: string },
) {
  await tx.activity.create({ data: args });
  await tx.jobOpportunity.update({
    where: { id: args.jobId },
    data: { lastActivityAt: new Date() },
  });
}

/** Confirms the job belongs to the caller. Returns null when it does not. */
async function ownedJobId(userId: string, jobId: string) {
  const job = await prisma.jobOpportunity.findFirst({
    where: { id: jobId, userId },
    select: { id: true },
  });
  return job?.id ?? null;
}

// -------------------------------------------------------------- create/edit

export async function saveJobAction(
  _prev: ActionResult<{ jobId: string }> | null,
  formData: FormData,
): Promise<ActionResult<{ jobId: string }>> {
  return guarded("saveJob", async () => {
    const user = await requireUserOrThrow();
    const parsed = parseOrFail(jobSchema, formToObject(formData));
    if (!parsed.ok) return parsed.result;

    const d = parsed.data;
    if (
      d.salaryMin !== null &&
      d.salaryMax !== null &&
      d.salaryMin > d.salaryMax
    ) {
      return fail("Minimum salary cannot exceed the maximum.", {
        salaryMin: "Minimum cannot exceed the maximum",
      });
    }

    const rawId = formData.get("id");
    const id = typeof rawId === "string" && rawId.length > 0 ? rawId : null;

    const data = {
      title: d.title,
      company: d.company,
      url: d.url,
      location: d.location || null,
      workMode: d.workMode,
      salaryText: d.salaryText || null,
      salaryMin: d.salaryMin,
      salaryMax: d.salaryMax,
      description: d.description,
      source: d.source || null,
      status: d.status,
      priority: d.priority,
      deadline: d.deadline,
      notes: d.notes,
    };

    if (id) {
      const existing = await prisma.jobOpportunity.findFirst({
        where: { id, userId: user.id },
        select: { id: true, status: true },
      });
      if (!existing) return fail("That opportunity no longer exists.");

      await prisma.$transaction(async (tx) => {
        await tx.jobOpportunity.update({
          where: { id: existing.id },
          data: {
            ...data,
            appliedAt: statusAppliedAt(existing.status, data.status),
            archivedAt: data.status === "ARCHIVED" ? new Date() : null,
          },
        });
        await logActivity(tx, {
          userId: user.id,
          jobId: existing.id,
          type:
            existing.status === data.status ? "JOB_UPDATED" : "STATUS_CHANGED",
          message:
            existing.status === data.status
              ? `Updated ${data.title} at ${data.company}`
              : `Moved to ${JOB_STATUS_LABEL[data.status]}`,
        });
      });

      refresh(existing.id);
      return ok({ jobId: existing.id });
    }

    const created = await prisma.$transaction(async (tx) => {
      const job = await tx.jobOpportunity.create({
        data: {
          ...data,
          userId: user.id,
          appliedAt: statusAppliedAt(null, data.status),
        },
      });
      await logActivity(tx, {
        userId: user.id,
        jobId: job.id,
        type: "JOB_CREATED",
        message: `Added ${job.title} at ${job.company}`,
      });
      return job;
    });

    refresh(created.id);
    return ok({ jobId: created.id });
  });
}

/**
 * `appliedAt` is set the first time a job reaches a submitted status and never
 * moved afterwards — response-rate maths depends on the original submission
 * date, not the most recent status change.
 */
function statusAppliedAt(
  previous: JobStatus | null,
  next: JobStatus,
): Date | undefined {
  const submitted: JobStatus[] = [
    "APPLIED",
    "INTERVIEWING",
    "OFFER",
    "REJECTED",
  ];
  const wasSubmitted = previous !== null && submitted.includes(previous);
  const isSubmitted = submitted.includes(next);
  if (isSubmitted && !wasSubmitted) return new Date();
  return undefined; // leave whatever is already stored
}

// ------------------------------------------------------------------- status

export async function updateJobStatusAction(
  jobId: string,
  status: JobStatus,
): Promise<ActionResult> {
  return guarded("updateJobStatus", async () => {
    const user = await requireUserOrThrow();
    const parsed = jobStatusUpdateSchema.safeParse({ jobId, status });
    if (!parsed.success) return fail("That status is not valid.");

    const job = await prisma.jobOpportunity.findFirst({
      where: { id: parsed.data.jobId, userId: user.id },
      select: { id: true, status: true },
    });
    if (!job) return fail("That opportunity no longer exists.");
    if (job.status === parsed.data.status) return ok();

    await prisma.$transaction(async (tx) => {
      await tx.jobOpportunity.update({
        where: { id: job.id },
        data: {
          status: parsed.data.status,
          appliedAt: statusAppliedAt(job.status, parsed.data.status),
          archivedAt: parsed.data.status === "ARCHIVED" ? new Date() : null,
        },
      });
      await logActivity(tx, {
        userId: user.id,
        jobId: job.id,
        type: "STATUS_CHANGED",
        message: `Moved to ${JOB_STATUS_LABEL[parsed.data.status]}`,
      });
    });

    refresh(job.id);
    return ok();
  });
}

export async function archiveJobAction(jobId: string): Promise<ActionResult> {
  return updateJobStatusAction(jobId, "ARCHIVED");
}

export async function deleteJobAction(jobId: string): Promise<ActionResult> {
  return guarded("deleteJob", async () => {
    const user = await requireUserOrThrow();
    // deleteMany scoped by userId: a forged id deletes nothing.
    const { count } = await prisma.jobOpportunity.deleteMany({
      where: { id: jobId, userId: user.id },
    });
    if (count === 0) return fail("That opportunity no longer exists.");

    refresh();
    return ok();
  });
}

// -------------------------------------------------------------------- notes

export async function saveJobNotesAction(
  jobId: string,
  notes: string,
): Promise<ActionResult> {
  return guarded("saveJobNotes", async () => {
    const user = await requireUserOrThrow();
    const parsed = jobNotesSchema.safeParse({ jobId, notes });
    if (!parsed.success) return fail("Those notes could not be saved.");

    const owned = await ownedJobId(user.id, parsed.data.jobId);
    if (!owned) return fail("That opportunity no longer exists.");

    await prisma.$transaction(async (tx) => {
      await tx.jobOpportunity.update({
        where: { id: owned },
        data: { notes: parsed.data.notes },
      });
      await logActivity(tx, {
        userId: user.id,
        jobId: owned,
        type: "NOTE_ADDED",
        message: "Updated notes",
      });
    });

    refresh(owned);
    return ok();
  });
}

// --------------------------------------------------------------- follow-ups

export async function saveFollowUpAction(
  _prev: ActionResult | null,
  formData: FormData,
): Promise<ActionResult> {
  return guarded("saveFollowUp", async () => {
    const user = await requireUserOrThrow();
    const parsed = parseOrFail(followUpSchema, formToObject(formData));
    if (!parsed.ok) return parsed.result;

    const { id, jobId, ...data } = parsed.data;
    const owned = await ownedJobId(user.id, jobId);
    if (!owned) return fail("That opportunity no longer exists.");

    await prisma.$transaction(async (tx) => {
      if (id) {
        await tx.followUp.updateMany({ where: { id, jobId: owned }, data });
      } else {
        await tx.followUp.create({ data: { ...data, jobId: owned } });
      }
      await logActivity(tx, {
        userId: user.id,
        jobId: owned,
        type: "FOLLOW_UP_CREATED",
        message: `Follow-up set for ${data.dueAt.toLocaleDateString()}`,
      });
    });

    refresh(owned);
    return ok();
  });
}

export async function completeFollowUpAction(
  followUpId: string,
): Promise<ActionResult> {
  return guarded("completeFollowUp", async () => {
    const user = await requireUserOrThrow();

    // Reaching through `job.userId` is what scopes this to the caller.
    const followUp = await prisma.followUp.findFirst({
      where: { id: followUpId, job: { userId: user.id } },
      select: { id: true, jobId: true },
    });
    if (!followUp) return fail("That follow-up no longer exists.");

    await prisma.$transaction(async (tx) => {
      await tx.followUp.update({
        where: { id: followUp.id },
        data: { completedAt: new Date() },
      });
      await logActivity(tx, {
        userId: user.id,
        jobId: followUp.jobId,
        type: "FOLLOW_UP_COMPLETED",
        message: "Follow-up completed",
      });
    });

    refresh(followUp.jobId);
    return ok();
  });
}

export async function deleteFollowUpAction(
  followUpId: string,
): Promise<ActionResult> {
  return guarded("deleteFollowUp", async () => {
    const user = await requireUserOrThrow();
    const followUp = await prisma.followUp.findFirst({
      where: { id: followUpId, job: { userId: user.id } },
      select: { id: true, jobId: true },
    });
    if (!followUp) return fail("That follow-up no longer exists.");

    await prisma.followUp.delete({ where: { id: followUp.id } });
    refresh(followUp.jobId);
    return ok();
  });
}
