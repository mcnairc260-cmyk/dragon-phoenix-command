import { describe, expect, it } from "vitest";

import {
  MAX_FOCUS_TASKS,
  describeMinutes,
  recommendFocusTasks,
  type FocusInput,
  type FocusJob,
} from "./focus";

const NOW = new Date("2026-06-15T09:00:00Z");

function daysBefore(days: number): Date {
  return new Date(NOW.getTime() - days * 86_400_000);
}

function daysAfter(days: number): Date {
  return new Date(NOW.getTime() + days * 86_400_000);
}

function focusJob(overrides: Partial<FocusJob> = {}): FocusJob {
  return {
    id: "job-1",
    title: "Senior Backend Engineer",
    company: "Acme",
    status: "EVALUATING",
    priority: "MEDIUM",
    deadline: null,
    lastActivityAt: daysBefore(1),
    appliedAt: null,
    fitScore: 75,
    hasAnalysis: true,
    materialKinds: [],
    followUps: [],
    ...overrides,
  };
}

function input(overrides: Partial<FocusInput> = {}): FocusInput {
  return {
    jobs: [],
    now: NOW,
    profileComplete: true,
    accomplishmentCount: 5,
    ...overrides,
  };
}

describe("recommendFocusTasks", () => {
  it("never returns more than three", () => {
    const jobs = Array.from({ length: 10 }, (_, i) =>
      focusJob({ id: `job-${i}`, company: `Company ${i}`, hasAnalysis: false }),
    );

    expect(recommendFocusTasks(input({ jobs }))).toHaveLength(MAX_FOCUS_TASKS);
  });

  it("returns at most one action per job", () => {
    // This job qualifies for several recipes at once.
    const busy = focusJob({
      status: "INTERVIEWING",
      hasAnalysis: false,
      deadline: daysAfter(1),
      followUps: [{ id: "f1", dueAt: daysBefore(3), completedAt: null }],
    });

    const result = recommendFocusTasks(input({ jobs: [busy] }));
    expect(result).toHaveLength(1);
  });

  it("puts an overdue follow-up ahead of an unanalysed job", () => {
    const overdue = focusJob({
      id: "overdue",
      company: "Overdue Co",
      followUps: [{ id: "f1", dueAt: daysBefore(4), completedAt: null }],
    });
    const unanalysed = focusJob({
      id: "unanalysed",
      company: "Unanalysed Co",
      hasAnalysis: false,
    });

    const [first] = recommendFocusTasks(input({ jobs: [unanalysed, overdue] }));
    expect(first?.title).toContain("Overdue Co");
  });

  it("does not surface a follow-up that is not due yet", () => {
    const future = focusJob({
      hasAnalysis: true,
      materialKinds: ["COVER_LETTER", "RESUME_BULLETS", "SUMMARY"],
      followUps: [{ id: "f1", dueAt: daysAfter(5), completedAt: null }],
    });

    const result = recommendFocusTasks(input({ jobs: [future] }));
    expect(result.some((r) => r.title.startsWith("Follow up"))).toBe(false);
  });

  it("ignores a completed follow-up", () => {
    const done = focusJob({
      followUps: [
        { id: "f1", dueAt: daysBefore(9), completedAt: daysBefore(8) },
      ],
    });
    const result = recommendFocusTasks(input({ jobs: [done] }));
    expect(result.some((r) => r.title.startsWith("Follow up"))).toBe(false);
  });

  it("skips archived and rejected opportunities entirely", () => {
    const jobs = [
      focusJob({ id: "a", status: "ARCHIVED", hasAnalysis: false }),
      focusJob({ id: "r", status: "REJECTED", hasAnalysis: false }),
    ];
    expect(recommendFocusTasks(input({ jobs }))).toHaveLength(0);
  });

  it("puts profile setup above job work when the profile is incomplete", () => {
    const jobs = [focusJob({ hasAnalysis: false })];
    const [first] = recommendFocusTasks(
      input({ jobs, profileComplete: false }),
    );
    expect(first?.recipeKey).toBe("setup:profile");
  });

  it("asks for the exact number of missing accomplishments", () => {
    const result = recommendFocusTasks(input({ accomplishmentCount: 1 }));
    const task = result.find((r) => r.recipeKey === "setup:accomplishments");
    expect(task?.title).toBe("Add 2 more accomplishments");
  });

  it("uses the singular when only one accomplishment is missing", () => {
    const result = recommendFocusTasks(input({ accomplishmentCount: 2 }));
    const task = result.find((r) => r.recipeKey === "setup:accomplishments");
    expect(task?.title).toBe("Add 1 more accomplishment");
  });

  it("suggests adding a first opportunity to an empty pipeline", () => {
    const result = recommendFocusTasks(input({ jobs: [] }));
    expect(result.some((r) => r.recipeKey === "setup:first-job")).toBe(true);
  });

  it("names a company in every job-linked recommendation", () => {
    const jobs = [
      focusJob({ id: "a", company: "Alpha", hasAnalysis: false }),
      focusJob({ id: "b", company: "Beta", status: "INTERVIEWING" }),
      focusJob({
        id: "c",
        company: "Gamma",
        status: "APPLIED",
        appliedAt: daysBefore(20),
      }),
    ];

    for (const rec of recommendFocusTasks(input({ jobs }))) {
      if (rec.jobId === null) continue;
      expect(rec.title).toMatch(/Alpha|Beta|Gamma/);
    }
  });

  it("only offers durations the focus timer supports", () => {
    const jobs = [
      focusJob({ id: "a", hasAnalysis: false }),
      focusJob({ id: "b", status: "INTERVIEWING" }),
      focusJob({
        id: "c",
        status: "PREPARING",
        materialKinds: ["COVER_LETTER", "RESUME_BULLETS", "SUMMARY"],
      }),
    ];

    for (const rec of recommendFocusTasks(input({ jobs }))) {
      expect([5, 15, 30, 60]).toContain(rec.estimatedMinutes);
    }
  });

  it("produces stable recipe keys for the same pipeline state", () => {
    const jobs = [focusJob({ hasAnalysis: false })];
    const first = recommendFocusTasks(input({ jobs })).map((r) => r.recipeKey);
    const second = recommendFocusTasks(input({ jobs })).map((r) => r.recipeKey);
    expect(first).toEqual(second);
  });

  it("prioritises an imminent deadline over a distant one", () => {
    const urgent = focusJob({
      id: "urgent",
      company: "Urgent Co",
      hasAnalysis: false,
      deadline: daysAfter(1),
    });
    const relaxed = focusJob({
      id: "relaxed",
      company: "Relaxed Co",
      hasAnalysis: false,
      deadline: daysAfter(60),
    });

    const [first] = recommendFocusTasks(input({ jobs: [relaxed, urgent] }));
    expect(first?.title).toContain("Urgent Co");
  });

  it("suggests submitting once every core material is drafted", () => {
    const ready = focusJob({
      status: "PREPARING",
      materialKinds: ["COVER_LETTER", "RESUME_BULLETS", "SUMMARY"],
    });
    const [first] = recommendFocusTasks(input({ jobs: [ready] }));
    expect(first?.title).toContain("Submit your application");
  });

  it("chases an application that has been silent with no follow-up", () => {
    const silent = focusJob({
      status: "APPLIED",
      appliedAt: daysBefore(21),
      lastActivityAt: daysBefore(21),
    });
    const [first] = recommendFocusTasks(input({ jobs: [silent] }));
    expect(first?.title).toContain("Chase your application");
  });
});

describe("describeMinutes", () => {
  it("keeps minutes under an hour", () => {
    expect(describeMinutes(30)).toBe("30 min");
  });

  it("says one hour rather than 1 hours", () => {
    expect(describeMinutes(60)).toBe("1 hour");
  });
});
