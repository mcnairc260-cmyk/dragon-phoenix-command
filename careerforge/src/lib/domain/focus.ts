import type { JobStatus, Priority } from "@prisma/client";

import { PRIORITY_WEIGHT } from "./constants";
import { daysSince, daysUntil } from "./job-filters";

/**
 * The recommendation engine behind the Today page.
 *
 * Design constraints, in priority order:
 *
 * 1. **At most three.** The list is capped before it reaches the UI, not
 *    scrolled. Four things to choose between is a decision; three things in
 *    order is a plan.
 * 2. **One per job.** Six actions across two companies reads as busywork.
 *    Whichever action scores highest for a job is the only one shown for it.
 * 3. **Concrete.** Every recommendation names a company and a verb. "Finish
 *    the cover letter for Acme", never "work on applications".
 * 4. **Sized.** Each carries a real time estimate so a fifteen-minute gap can
 *    be used deliberately.
 *
 * The whole thing is a pure function of the pipeline so it can be tested
 * without a database and produces the same answer for the same state.
 */

export type FocusInput = {
  jobs: FocusJob[];
  now: Date;
  profileComplete: boolean;
  accomplishmentCount: number;
};

export type FocusJob = {
  id: string;
  title: string;
  company: string;
  status: JobStatus;
  priority: Priority;
  deadline: Date | null;
  lastActivityAt: Date;
  appliedAt: Date | null;
  fitScore: number | null;
  hasAnalysis: boolean;
  materialKinds: string[];
  followUps: { id: string; dueAt: Date; completedAt: Date | null }[];
};

export type Recommendation = {
  /** Stable across regenerations so a completed task does not reappear. */
  recipeKey: string;
  jobId: string | null;
  title: string;
  rationale: string;
  estimatedMinutes: 5 | 15 | 30 | 60;
  score: number;
  href: string;
};

/** Urgency multiplier from priority, deadline, and how long a job has been quiet. */
function urgency(job: FocusJob, now: Date): number {
  let score = PRIORITY_WEIGHT[job.priority] * 8;

  const untilDeadline = daysUntil(job.deadline, now);
  if (untilDeadline !== null) {
    if (untilDeadline < 0)
      score += 10; // passed, but maybe still worth a shot
    else if (untilDeadline <= 2) score += 45;
    else if (untilDeadline <= 5) score += 28;
    else if (untilDeadline <= 10) score += 12;
  }

  // A high-scoring job that has gone quiet is the most common way an
  // opportunity is lost, so silence earns urgency rather than losing it.
  const quiet = daysSince(job.lastActivityAt, now);
  if (quiet >= 21) score += 20;
  else if (quiet >= 10) score += 12;
  else if (quiet >= 5) score += 5;

  if (job.fitScore !== null) score += Math.round(job.fitScore / 5);

  return score;
}

const CORE_MATERIALS = ["COVER_LETTER", "RESUME_BULLETS", "SUMMARY"];

/** Every action worth doing for one job, best first. */
function candidatesFor(job: FocusJob, now: Date): Recommendation[] {
  const out: Recommendation[] = [];
  const base = urgency(job, now);
  const href = `/jobs/${job.id}`;

  const overdue = job.followUps
    .filter((f) => !f.completedAt)
    .map((f) => ({ ...f, days: daysUntil(f.dueAt, now) ?? 0 }))
    .sort((a, b) => a.days - b.days)[0];

  if (overdue && overdue.days <= 0) {
    out.push({
      recipeKey: `followup:${overdue.id}`,
      jobId: job.id,
      title: `Follow up with ${job.company}`,
      rationale:
        overdue.days === 0
          ? "This follow-up is due today."
          : `This follow-up is ${Math.abs(overdue.days)} day${Math.abs(overdue.days) === 1 ? "" : "s"} overdue.`,
      estimatedMinutes: 15,
      score: base + 50,
      href: `${href}?tab=notes`,
    });
  }

  if (
    !job.hasAnalysis &&
    job.status !== "REJECTED" &&
    job.status !== "ARCHIVED"
  ) {
    out.push({
      recipeKey: `analyse:${job.id}`,
      jobId: job.id,
      title: `Check your fit for ${job.company}`,
      rationale:
        "Not analysed yet. Five minutes here tells you whether the rest is worth doing.",
      estimatedMinutes: 5,
      score: base + 30,
      href: `${href}?tab=analysis`,
    });
  }

  const missingCore = CORE_MATERIALS.filter(
    (kind) => !job.materialKinds.includes(kind),
  );

  if (
    job.hasAnalysis &&
    missingCore.includes("COVER_LETTER") &&
    (job.status === "EVALUATING" || job.status === "PREPARING")
  ) {
    out.push({
      recipeKey: `cover:${job.id}`,
      jobId: job.id,
      title: `Draft the cover letter for ${job.company}`,
      rationale: job.fitScore
        ? `Fit score ${job.fitScore}. The draft is generated from your accomplishments — you edit rather than start from blank.`
        : "Generated from your accomplishments, so you edit rather than start from blank.",
      estimatedMinutes: 30,
      score: base + 20,
      href: `${href}?tab=materials`,
    });
  }

  if (
    job.status === "PREPARING" &&
    missingCore.length === 0 &&
    job.materialKinds.length > 0
  ) {
    out.push({
      recipeKey: `submit:${job.id}`,
      jobId: job.id,
      title: `Submit your application to ${job.company}`,
      rationale:
        "Materials are drafted. The only thing left is sending it and moving the status.",
      estimatedMinutes: 30,
      score: base + 40,
      href: `${href}?tab=materials`,
    });
  }

  if (job.status === "INTERVIEWING") {
    if (!job.materialKinds.includes("INTERVIEW_QUESTIONS")) {
      out.push({
        recipeKey: `interview-prep:${job.id}`,
        jobId: job.id,
        title: `Review likely interview questions for ${job.company}`,
        rationale:
          "You are interviewing here. Generate the question set and read it once.",
        estimatedMinutes: 30,
        score: base + 45,
        href: `${href}?tab=materials`,
      });
    } else if (!job.materialKinds.includes("STAR_PROMPTS")) {
      out.push({
        recipeKey: `star-prep:${job.id}`,
        jobId: job.id,
        title: `Rehearse two STAR answers for ${job.company}`,
        rationale:
          "Built from your own accomplishments, so you are rehearsing things that actually happened.",
        estimatedMinutes: 30,
        score: base + 35,
        href: `${href}?tab=materials`,
      });
    }
  }

  if (
    job.status === "APPLIED" &&
    job.appliedAt &&
    daysSince(job.appliedAt, now) >= 7 &&
    !job.followUps.some((f) => !f.completedAt)
  ) {
    out.push({
      recipeKey: `chase:${job.id}`,
      jobId: job.id,
      title: `Chase your application to ${job.company}`,
      rationale: `Applied ${daysSince(job.appliedAt, now)} days ago with no follow-up scheduled.`,
      estimatedMinutes: 15,
      score: base + 25,
      href: `${href}?tab=notes`,
    });
  }

  if (job.status === "DISCOVERED" && daysSince(job.lastActivityAt, now) >= 5) {
    out.push({
      recipeKey: `triage:${job.id}`,
      jobId: job.id,
      title: `Decide whether ${job.company} is worth pursuing`,
      rationale:
        "It has sat untouched for a while. Either move it forward or archive it — leaving it is the expensive option.",
      estimatedMinutes: 5,
      score: base + 15,
      href,
    });
  }

  return out.sort((a, b) => b.score - a.score);
}

/** Setup work that is not tied to a job but blocks everything that is. */
function setupRecommendations(input: FocusInput): Recommendation[] {
  const out: Recommendation[] = [];

  if (!input.profileComplete) {
    out.push({
      recipeKey: "setup:profile",
      jobId: null,
      title: "Fill in the rest of your profile",
      rationale:
        "Fit scores and every generated draft read from your profile. Gaps here become gaps in the output.",
      estimatedMinutes: 30,
      score: 200,
      href: "/profile",
    });
  }

  if (input.accomplishmentCount < 3) {
    out.push({
      recipeKey: "setup:accomplishments",
      jobId: null,
      title: `Add ${3 - input.accomplishmentCount} more accomplishment${
        3 - input.accomplishmentCount === 1 ? "" : "s"
      }`,
      rationale:
        "This is the bank every cover letter and resume bullet draws from. Three is the point where drafts stop being generic.",
      estimatedMinutes: 30,
      score: 190,
      href: "/profile?tab=accomplishments",
    });
  }

  if (input.jobs.length === 0) {
    out.push({
      recipeKey: "setup:first-job",
      jobId: null,
      title: "Add your first opportunity",
      rationale:
        "Paste a posting you are considering. Everything else follows from it.",
      estimatedMinutes: 5,
      score: 210,
      href: "/jobs",
    });
  }

  return out;
}

export const MAX_FOCUS_TASKS = 3;

export function recommendFocusTasks(input: FocusInput): Recommendation[] {
  const setup = setupRecommendations(input);

  const perJob = input.jobs
    .filter((job) => job.status !== "ARCHIVED" && job.status !== "REJECTED")
    // One action per job: the highest-scoring thing that job needs.
    .map((job) => candidatesFor(job, input.now)[0])
    .filter((r): r is Recommendation => r !== undefined);

  return [...setup, ...perJob]
    .sort((a, b) => b.score - a.score)
    .slice(0, MAX_FOCUS_TASKS);
}

/** Human phrasing for an estimate. Used in the UI and in the focus timer. */
export function describeMinutes(minutes: number): string {
  if (minutes < 60) return `${minutes} min`;
  return minutes === 60 ? "1 hour" : `${minutes / 60} hours`;
}
