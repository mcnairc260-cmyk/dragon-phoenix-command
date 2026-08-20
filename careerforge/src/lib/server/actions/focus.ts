"use server";

import type { FocusTask } from "@prisma/client";
import { revalidatePath } from "next/cache";

import {
  MAX_FOCUS_TASKS,
  recommendFocusTasks,
  type FocusJob,
} from "@/lib/domain/focus";
import { profileChecklist } from "@/lib/domain/profile-completeness";
import { prisma } from "@/lib/server/prisma";
import { requireUserOrThrow } from "@/lib/server/session";

import { fail, guarded, ok, type ActionResult } from "./result";

/**
 * Rebuilds today's focus list.
 *
 * Recommendations are recomputed from live pipeline state on every load, but
 * persisted by `recipeKey` so that completing or snoozing one sticks. Without
 * that, finishing a task and refreshing would hand it straight back — the
 * exact failure that makes a "what to do next" feature untrustworthy.
 */
export async function refreshFocusTasks(userId: string): Promise<FocusTask[]> {
  const [profile, jobs] = await Promise.all([
    prisma.candidateProfile.findUnique({
      where: { userId },
      select: {
        fullName: true,
        targetRoles: true,
        masterResume: true,
        _count: {
          select: { employments: true, skills: true, accomplishments: true },
        },
      },
    }),
    prisma.jobOpportunity.findMany({
      where: { userId, archivedAt: null },
      select: {
        id: true,
        title: true,
        company: true,
        status: true,
        priority: true,
        deadline: true,
        lastActivityAt: true,
        appliedAt: true,
        analysis: { select: { fitScore: true } },
        materials: { select: { kind: true } },
        followUps: { select: { id: true, dueAt: true, completedAt: true } },
      },
    }),
  ]);

  const focusJobs: FocusJob[] = jobs.map((job) => ({
    id: job.id,
    title: job.title,
    company: job.company,
    status: job.status,
    priority: job.priority,
    deadline: job.deadline,
    lastActivityAt: job.lastActivityAt,
    appliedAt: job.appliedAt,
    fitScore: job.analysis?.fitScore ?? null,
    hasAnalysis: Boolean(job.analysis),
    materialKinds: job.materials.map((m) => m.kind),
    followUps: job.followUps,
  }));

  const profileComplete = profile
    ? profileChecklist({
        fullName: profile.fullName,
        targetRoles: profile.targetRoles,
        masterResume: profile.masterResume,
        employmentCount: profile._count.employments,
        skillCount: profile._count.skills,
        accomplishmentCount: profile._count.accomplishments,
      }).every((item) => item.done)
    : false;

  const now = new Date();

  const recommendations = recommendFocusTasks({
    jobs: focusJobs,
    now,
    profileComplete,
    accomplishmentCount: profile?._count.accomplishments ?? 0,
  });

  const existing = await prisma.focusTask.findMany({ where: { userId } });
  const byKey = new Map(existing.map((task) => [task.recipeKey, task]));

  // A task the user finished today, or snoozed until later, is not offered
  // again — even though the pipeline state that produced it has not changed.
  const suppressed = (task: FocusTask | undefined): boolean => {
    if (!task) return false;
    if (task.status === "COMPLETED") return isSameDay(task.completedAt, now);
    if (task.status === "DISMISSED") return isSameDay(task.updatedAt, now);
    if (task.status === "SNOOZED") {
      return task.snoozedUntil !== null && task.snoozedUntil > now;
    }
    return false;
  };

  const live = recommendations.filter(
    (r) => !suppressed(byKey.get(r.recipeKey)),
  );

  await prisma.$transaction(async (tx) => {
    for (const recommendation of live) {
      const data = {
        jobId: recommendation.jobId,
        title: recommendation.title,
        rationale: recommendation.rationale,
        estimatedMinutes: recommendation.estimatedMinutes,
        score: recommendation.score,
        href: recommendation.href,
        status: "PENDING" as const,
        snoozedUntil: null,
        completedAt: null,
      };

      await tx.focusTask.upsert({
        where: {
          userId_recipeKey: { userId, recipeKey: recommendation.recipeKey },
        },
        create: { userId, recipeKey: recommendation.recipeKey, ...data },
        update: data,
      });
    }

    // Drop stale pending rows whose underlying reason has gone away, so the
    // list never shows an action the pipeline no longer justifies.
    const liveKeys = live.map((r) => r.recipeKey);
    await tx.focusTask.deleteMany({
      where: {
        userId,
        status: "PENDING",
        ...(liveKeys.length ? { recipeKey: { notIn: liveKeys } } : {}),
      },
    });
  });

  return prisma.focusTask.findMany({
    where: { userId, status: "PENDING" },
    orderBy: { score: "desc" },
    take: MAX_FOCUS_TASKS,
  });
}

function isSameDay(date: Date | null, now: Date): boolean {
  if (!date) return false;
  return (
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate()
  );
}

async function ownedTask(userId: string, taskId: string) {
  return prisma.focusTask.findFirst({
    where: { id: taskId, userId },
    select: { id: true, jobId: true, title: true },
  });
}

function refresh() {
  revalidatePath("/today");
  revalidatePath("/analytics");
}

export async function completeFocusTaskAction(
  taskId: string,
): Promise<ActionResult> {
  return guarded("completeFocusTask", async () => {
    const user = await requireUserOrThrow();
    const task = await ownedTask(user.id, taskId);
    if (!task) return fail("That task is no longer on your list.");

    await prisma.$transaction(async (tx) => {
      await tx.focusTask.update({
        where: { id: task.id },
        data: { status: "COMPLETED", completedAt: new Date() },
      });
      await tx.activity.create({
        data: {
          userId: user.id,
          jobId: task.jobId,
          type: "FOCUS_TASK_COMPLETED",
          message: `Completed: ${task.title}`,
        },
      });
    });

    refresh();
    return ok();
  });
}

export async function snoozeFocusTaskAction(
  taskId: string,
  hours = 24,
): Promise<ActionResult> {
  return guarded("snoozeFocusTask", async () => {
    const user = await requireUserOrThrow();
    const task = await ownedTask(user.id, taskId);
    if (!task) return fail("That task is no longer on your list.");

    const until = new Date();
    until.setHours(until.getHours() + Math.min(Math.max(hours, 1), 24 * 14));

    await prisma.focusTask.update({
      where: { id: task.id },
      data: { status: "SNOOZED", snoozedUntil: until },
    });

    refresh();
    return ok();
  });
}

export async function dismissFocusTaskAction(
  taskId: string,
): Promise<ActionResult> {
  return guarded("dismissFocusTask", async () => {
    const user = await requireUserOrThrow();
    const task = await ownedTask(user.id, taskId);
    if (!task) return fail("That task is no longer on your list.");

    await prisma.focusTask.update({
      where: { id: task.id },
      data: { status: "DISMISSED" },
    });

    refresh();
    return ok();
  });
}
