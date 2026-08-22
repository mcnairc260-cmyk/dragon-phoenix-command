import { describe, expect, it } from "vitest";

import {
  applicationsByWeek,
  diagnose,
  formatRate,
  rate,
  summarise,
  type AnalyticsJob,
} from "./analytics";

const NOW = new Date("2026-06-15T12:00:00Z");

function daysBefore(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

function analyticsJob(overrides: Partial<AnalyticsJob> = {}): AnalyticsJob {
  return {
    id: "1",
    company: "Acme",
    status: "APPLIED",
    createdAt: daysBefore(30),
    appliedAt: daysBefore(20),
    lastActivityAt: daysBefore(2),
    fitScore: 70,
    hasMaterials: true,
    openFollowUps: 0,
    ...overrides,
  };
}

describe("rate", () => {
  it("returns null rather than zero for an empty denominator", () => {
    // Zero would read as a measured result; null reads as "no data".
    expect(rate(0, 0).value).toBeNull();
    expect(formatRate(rate(0, 0))).toBe("—");
  });

  it("marks a small denominator unreliable", () => {
    expect(rate(1, 6).reliable).toBe(false);
    expect(rate(2, 12).reliable).toBe(true);
  });

  it("formats as a whole percentage", () => {
    expect(formatRate(rate(1, 4))).toBe("25%");
  });
});

describe("summarise", () => {
  it("counts a rejection as a response", () => {
    const jobs = [
      analyticsJob({ id: "a", status: "REJECTED" }),
      analyticsJob({ id: "b", status: "APPLIED" }),
    ];

    const summary = summarise(jobs, NOW);
    expect(summary.responseRate.numerator).toBe(1);
    expect(summary.responseRate.denominator).toBe(2);
  });

  it("excludes archived jobs from every total", () => {
    const jobs = [
      analyticsJob({ id: "a", status: "ARCHIVED" }),
      analyticsJob({ id: "b", status: "APPLIED" }),
    ];
    expect(summarise(jobs, NOW).total).toBe(1);
  });

  it("averages fit scores over analysed jobs only", () => {
    const jobs = [
      analyticsJob({ id: "a", fitScore: 80 }),
      analyticsJob({ id: "b", fitScore: 60 }),
      analyticsJob({ id: "c", fitScore: null }),
    ];

    const summary = summarise(jobs, NOW);
    expect(summary.averageFitScore).toBe(70);
    expect(summary.analysedCount).toBe(2);
  });

  it("reports no average when nothing has been analysed", () => {
    const summary = summarise([analyticsJob({ fitScore: null })], NOW);
    expect(summary.averageFitScore).toBeNull();
  });

  it("identifies the longest-silent live opportunity", () => {
    const jobs = [
      analyticsJob({
        id: "fresh",
        company: "Fresh",
        lastActivityAt: daysBefore(1),
      }),
      analyticsJob({
        id: "stale",
        company: "Stale",
        lastActivityAt: daysBefore(40),
      }),
    ];

    expect(summarise(jobs, NOW).stalest?.company).toBe("Stale");
  });

  it("handles an empty pipeline without dividing by zero", () => {
    const summary = summarise([], NOW);
    expect(summary.total).toBe(0);
    expect(summary.responseRate.value).toBeNull();
    expect(summary.medianDaysSinceActivity).toBeNull();
    expect(summary.stalest).toBeNull();
  });
});

describe("applicationsByWeek", () => {
  it("returns one bucket per requested week, oldest first", () => {
    const buckets = applicationsByWeek([], 12, NOW);
    expect(buckets).toHaveLength(12);
    expect(new Date(buckets[0]!.weekStart).getTime()).toBeLessThan(
      new Date(buckets[11]!.weekStart).getTime(),
    );
  });

  it("counts an application into the week it was submitted", () => {
    const jobs = [analyticsJob({ appliedAt: daysBefore(3) })];
    const buckets = applicationsByWeek(jobs, 12, NOW);
    expect(buckets.reduce((sum, b) => sum + b.applications, 0)).toBe(1);
  });

  it("ignores applications outside the window", () => {
    const jobs = [analyticsJob({ appliedAt: daysBefore(400) })];
    const buckets = applicationsByWeek(jobs, 12, NOW);
    expect(buckets.reduce((sum, b) => sum + b.applications, 0)).toBe(0);
  });

  it("ignores jobs that were never submitted", () => {
    const jobs = [analyticsJob({ appliedAt: null, status: "EVALUATING" })];
    const buckets = applicationsByWeek(jobs, 12, NOW);
    expect(buckets.reduce((sum, b) => sum + b.applications, 0)).toBe(0);
  });
});

describe("diagnose", () => {
  it("flags drafted applications that were never sent", () => {
    const jobs = [
      analyticsJob({
        id: "a",
        company: "Alpha",
        status: "PREPARING",
        hasMaterials: true,
      }),
      analyticsJob({
        id: "b",
        company: "Beta",
        status: "PREPARING",
        hasMaterials: true,
      }),
    ];

    const insights = diagnose(jobs, summarise(jobs, NOW), NOW);
    const found = insights.find((i) => i.id === "ready-to-send");
    expect(found?.severity).toBe("act");
    expect(found?.detail).toContain("Alpha");
  });

  it("flags a pile of unanalysed opportunities", () => {
    const jobs = Array.from({ length: 4 }, (_, i) =>
      analyticsJob({ id: `j${i}`, fitScore: null, status: "DISCOVERED" }),
    );

    const insights = diagnose(jobs, summarise(jobs, NOW), NOW);
    expect(insights.some((i) => i.id === "unanalysed")).toBe(true);
  });

  it("does not flag a quiet job that already has a follow-up scheduled", () => {
    const jobs = [
      analyticsJob({
        id: "a",
        lastActivityAt: daysBefore(30),
        openFollowUps: 1,
      }),
      analyticsJob({
        id: "b",
        lastActivityAt: daysBefore(30),
        openFollowUps: 1,
      }),
    ];

    const insights = diagnose(jobs, summarise(jobs, NOW), NOW);
    expect(insights.some((i) => i.id === "gone-quiet")).toBe(false);
  });

  it("stays quiet about response rate when the sample is too small", () => {
    const jobs = [analyticsJob({ id: "a", status: "APPLIED" })];
    const insights = diagnose(jobs, summarise(jobs, NOW), NOW);

    expect(insights.some((i) => i.id === "low-response")).toBe(false);
    expect(insights.some((i) => i.id === "small-sample")).toBe(true);
  });

  it("calls out a genuinely low response rate once the sample is big enough", () => {
    const jobs = Array.from({ length: 20 }, (_, i) =>
      analyticsJob({ id: `j${i}`, status: "APPLIED" }),
    );

    const insights = diagnose(jobs, summarise(jobs, NOW), NOW);
    expect(insights.some((i) => i.id === "low-response")).toBe(true);
  });

  it("orders actionable findings ahead of informational ones", () => {
    const jobs = Array.from({ length: 4 }, (_, i) =>
      analyticsJob({ id: `j${i}`, fitScore: null, status: "DISCOVERED" }),
    );

    const insights = diagnose(jobs, summarise(jobs, NOW), NOW);
    const severities = insights.map((i) => i.severity);
    const firstInfo = severities.indexOf("info");
    const lastAct = severities.lastIndexOf("act");
    if (firstInfo !== -1 && lastAct !== -1) {
      expect(lastAct).toBeLessThan(firstInfo);
    }
  });

  it("says so plainly when nothing is stuck", () => {
    const jobs = [analyticsJob({ id: "a", status: "INTERVIEWING" })];
    const insights = diagnose(jobs, summarise(jobs, NOW), NOW);
    expect(
      insights.some((i) => i.id === "healthy" || i.id === "small-sample"),
    ).toBe(true);
  });

  it("always returns at least one finding for a non-empty pipeline", () => {
    const jobs = [analyticsJob()];
    expect(diagnose(jobs, summarise(jobs, NOW), NOW).length).toBeGreaterThan(0);
  });
});
