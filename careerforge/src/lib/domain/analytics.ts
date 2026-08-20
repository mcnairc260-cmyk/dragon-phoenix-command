import type { JobStatus } from "@prisma/client";

import { daysSince } from "./job-filters";

/**
 * Pipeline analytics.
 *
 * Two rules run through all of it:
 *
 * - **A rate over a tiny denominator is noise.** Six applications and one
 *   reply is not a "17% response rate"; it is one reply. Every rate carries
 *   the counts it came from, and the UI is told when the sample is too small
 *   to read.
 * - **A diagnosis has to name a next action.** "Your pipeline has a bottleneck
 *   at the application stage" is a description. "Eleven jobs are sitting in
 *   Preparing — pick the two highest-scoring and send them" is usable.
 */

export type AnalyticsJob = {
  id: string;
  company: string;
  status: JobStatus;
  createdAt: Date;
  appliedAt: Date | null;
  lastActivityAt: Date;
  fitScore: number | null;
  hasMaterials: boolean;
  openFollowUps: number;
};

export type Rate = {
  /** Null when the denominator is zero — not zero, which would read as a result. */
  value: number | null;
  numerator: number;
  denominator: number;
  /** False when the denominator is too small for the rate to mean anything. */
  reliable: boolean;
};

const MIN_SAMPLE = 8;

export function rate(numerator: number, denominator: number): Rate {
  return {
    value: denominator === 0 ? null : numerator / denominator,
    numerator,
    denominator,
    reliable: denominator >= MIN_SAMPLE,
  };
}

export function formatRate(r: Rate): string {
  if (r.value === null) return "—";
  return `${Math.round(r.value * 100)}%`;
}

export type WeekBucket = {
  /** ISO date of the Monday starting the week. */
  weekStart: string;
  label: string;
  applications: number;
};

/** Applications per week over the trailing `weeks` weeks, oldest first. */
export function applicationsByWeek(
  jobs: AnalyticsJob[],
  weeks = 12,
  now: Date = new Date(),
): WeekBucket[] {
  const buckets: WeekBucket[] = [];
  const thisMonday = startOfWeek(now);

  for (let i = weeks - 1; i >= 0; i--) {
    const start = new Date(thisMonday);
    start.setDate(start.getDate() - i * 7);
    buckets.push({
      weekStart: start.toISOString().slice(0, 10),
      label: start.toLocaleDateString(undefined, {
        month: "short",
        day: "numeric",
      }),
      applications: 0,
    });
  }

  const index = new Map(buckets.map((b, i) => [b.weekStart, i]));

  for (const job of jobs) {
    if (!job.appliedAt) continue;
    const key = startOfWeek(job.appliedAt).toISOString().slice(0, 10);
    const i = index.get(key);
    if (i !== undefined) {
      const bucket = buckets[i];
      if (bucket) bucket.applications += 1;
    }
  }

  return buckets;
}

function startOfWeek(date: Date): Date {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  // Monday-start: getDay() is 0 for Sunday, which should belong to the prior week.
  const offset = (d.getDay() + 6) % 7;
  d.setDate(d.getDate() - offset);
  return d;
}

export type FunnelStage = { status: JobStatus; label: string; count: number };

export type AnalyticsSummary = {
  total: number;
  active: number;
  submitted: number;
  responded: number;
  interviewing: number;
  offers: number;
  rejected: number;
  responseRate: Rate;
  interviewRate: Rate;
  offerRate: Rate;
  averageFitScore: number | null;
  analysedCount: number;
  medianDaysSinceActivity: number | null;
  stalest: { company: string; days: number; jobId: string } | null;
};

const SUBMITTED: JobStatus[] = ["APPLIED", "INTERVIEWING", "OFFER", "REJECTED"];
/** A rejection is a response. Silence is the thing that is not. */
const RESPONDED: JobStatus[] = ["INTERVIEWING", "OFFER", "REJECTED"];
const REACHED_INTERVIEW: JobStatus[] = ["INTERVIEWING", "OFFER"];

export function summarise(
  jobs: AnalyticsJob[],
  now: Date = new Date(),
): AnalyticsSummary {
  const live = jobs.filter((j) => j.status !== "ARCHIVED");

  const submitted = live.filter((j) => SUBMITTED.includes(j.status));
  const responded = live.filter((j) => RESPONDED.includes(j.status));
  const interviewed = live.filter((j) => REACHED_INTERVIEW.includes(j.status));
  const offers = live.filter((j) => j.status === "OFFER");
  const rejected = live.filter((j) => j.status === "REJECTED");
  const active = live.filter(
    (j) => j.status !== "REJECTED" && j.status !== "ARCHIVED",
  );

  const analysed = live.filter((j) => j.fitScore !== null);
  const averageFitScore =
    analysed.length === 0
      ? null
      : Math.round(
          analysed.reduce((sum, j) => sum + (j.fitScore ?? 0), 0) /
            analysed.length,
        );

  const gaps = active
    .map((j) => daysSince(j.lastActivityAt, now))
    .sort((a, b) => a - b);

  const medianDaysSinceActivity =
    gaps.length === 0
      ? null
      : (gaps[Math.floor((gaps.length - 1) / 2)] ?? null);

  const stalestJob = [...active].sort(
    (a, b) => a.lastActivityAt.getTime() - b.lastActivityAt.getTime(),
  )[0];

  return {
    total: live.length,
    active: active.length,
    submitted: submitted.length,
    responded: responded.length,
    interviewing: live.filter((j) => j.status === "INTERVIEWING").length,
    offers: offers.length,
    rejected: rejected.length,
    responseRate: rate(responded.length, submitted.length),
    interviewRate: rate(interviewed.length, submitted.length),
    offerRate: rate(offers.length, submitted.length),
    averageFitScore,
    analysedCount: analysed.length,
    medianDaysSinceActivity,
    stalest: stalestJob
      ? {
          company: stalestJob.company,
          days: daysSince(stalestJob.lastActivityAt, now),
          jobId: stalestJob.id,
        }
      : null,
  };
}

export type Insight = {
  id: string;
  severity: "info" | "watch" | "act";
  headline: string;
  detail: string;
};

/**
 * Plain-language pipeline diagnosis.
 *
 * Ordered so the most actionable finding comes first, and deliberately silent
 * when there is not enough data to say anything true.
 */
export function diagnose(
  jobs: AnalyticsJob[],
  summary: AnalyticsSummary,
  now: Date = new Date(),
): Insight[] {
  const insights: Insight[] = [];
  const live = jobs.filter((j) => j.status !== "ARCHIVED");

  const stuckPreparing = live.filter((j) => j.status === "PREPARING");
  const readyToSend = stuckPreparing.filter((j) => j.hasMaterials);

  if (readyToSend.length >= 2) {
    insights.push({
      id: "ready-to-send",
      severity: "act",
      headline: `${readyToSend.length} applications are drafted but not sent`,
      detail: `${readyToSend
        .slice(0, 3)
        .map((j) => j.company)
        .join(
          ", ",
        )}${readyToSend.length > 3 ? " and others" : ""} have materials ready. Sending is the whole remaining step. Pick the two with the highest fit scores and send them today.`,
    });
  }

  const unanalysed = live.filter(
    (j) => j.fitScore === null && j.status !== "REJECTED",
  );
  if (unanalysed.length >= 3) {
    insights.push({
      id: "unanalysed",
      severity: "act",
      headline: `${unanalysed.length} opportunities have never been analysed`,
      detail:
        "Five minutes each tells you which are worth real effort. Right now you are choosing what to work on without the information that decides it.",
    });
  }

  const goneQuiet = live.filter(
    (j) =>
      j.status !== "REJECTED" &&
      daysSince(j.lastActivityAt, now) >= 14 &&
      j.openFollowUps === 0,
  );
  if (goneQuiet.length >= 2) {
    insights.push({
      id: "gone-quiet",
      severity: "act",
      headline: `${goneQuiet.length} opportunities have gone quiet with no follow-up scheduled`,
      detail: `${goneQuiet
        .slice(0, 3)
        .map((j) => j.company)
        .join(
          ", ",
        )}${goneQuiet.length > 3 ? " and others" : ""} have had no activity in two weeks. Either schedule a follow-up or archive them — a pipeline full of maybes is what makes the whole thing feel heavy.`,
    });
  }

  if (
    summary.responseRate.reliable &&
    (summary.responseRate.value ?? 0) < 0.15
  ) {
    insights.push({
      id: "low-response",
      severity: "watch",
      headline: `Response rate is ${formatRate(summary.responseRate)} across ${summary.responseRate.denominator} applications`,
      detail:
        "Below roughly 15% usually points at targeting rather than materials. Check the fit scores on what you have been sending — if most sit under 65, the fix is applying to fewer, better-matched roles.",
    });
  }

  if (
    summary.interviewRate.reliable &&
    (summary.responseRate.value ?? 0) >= 0.25 &&
    (summary.interviewRate.value ?? 0) < 0.1
  ) {
    insights.push({
      id: "screen-dropoff",
      severity: "watch",
      headline: "People reply, but the conversations stop before an interview",
      detail:
        "That pattern usually sits with the screen rather than the resume. Worth preparing a tighter answer to 'walk me through your background' before the next one.",
    });
  }

  if (summary.averageFitScore !== null && summary.averageFitScore < 60) {
    insights.push({
      id: "low-average-fit",
      severity: "watch",
      headline: `Average fit score is ${summary.averageFitScore}`,
      detail:
        "Most of what is in the pipeline is a stretch. That is a fine strategy deliberately and an expensive one by accident — check whether your profile is under-describing you before concluding the roles are wrong.",
    });
  }

  if (
    summary.submitted > 0 &&
    summary.submitted < MIN_SAMPLE &&
    !summary.responseRate.reliable
  ) {
    insights.push({
      id: "small-sample",
      severity: "info",
      headline: `Too early to read the rates (${summary.submitted} application${summary.submitted === 1 ? "" : "s"} so far)`,
      detail: `Response and interview rates start meaning something around ${MIN_SAMPLE} applications. Until then the numbers below move a lot on single events.`,
    });
  }

  if (insights.length === 0 && summary.total > 0) {
    insights.push({
      id: "healthy",
      severity: "info",
      headline: "Nothing is obviously stuck",
      detail:
        "No stalled drafts, no long silences without a follow-up, and nothing unanalysed piling up. Keep adding opportunities.",
    });
  }

  const order = { act: 0, watch: 1, info: 2 } as const;
  return insights.sort((a, b) => order[a.severity] - order[b.severity]);
}
