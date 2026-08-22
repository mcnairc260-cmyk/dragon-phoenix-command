import { describe, expect, it } from "vitest";

import {
  EMPTY_FILTERS,
  daysSince,
  daysUntil,
  defaultDirection,
  filterJobs,
  isSortKey,
  sortJobs,
  type JobListItem,
} from "./job-filters";

const NOW = new Date("2026-06-15T12:00:00Z");

function item(overrides: Partial<JobListItem> = {}): JobListItem {
  return {
    id: "1",
    title: "Backend Engineer",
    company: "Acme",
    location: "Remote",
    status: "EVALUATING",
    priority: "MEDIUM",
    salaryMin: 100_000,
    salaryMax: 120_000,
    deadline: null,
    lastActivityAt: NOW,
    createdAt: NOW,
    fitScore: 70,
    ...overrides,
  };
}

describe("filterJobs", () => {
  it("hides archived jobs unless asked for", () => {
    const jobs = [item({ id: "a", status: "ARCHIVED" }), item({ id: "b" })];

    expect(filterJobs(jobs, EMPTY_FILTERS).map((j) => j.id)).toEqual(["b"]);
    expect(
      filterJobs(jobs, { ...EMPTY_FILTERS, includeArchived: true }),
    ).toHaveLength(2);
  });

  it("searches title, company, and location case-insensitively", () => {
    const jobs = [
      item({ id: "a", company: "Northwind" }),
      item({ id: "b", company: "Acme", location: "Berlin" }),
    ];

    expect(
      filterJobs(jobs, { ...EMPTY_FILTERS, query: "northwind" }).map(
        (j) => j.id,
      ),
    ).toEqual(["a"]);
    expect(
      filterJobs(jobs, { ...EMPTY_FILTERS, query: "BERLIN" }).map((j) => j.id),
    ).toEqual(["b"]);
  });

  it("excludes an unscored job from a minimum-fit filter", () => {
    // Treating null as zero would be defensible; treating it as passing would
    // silently hide the fact that the job has never been analysed.
    const jobs = [
      item({ id: "scored", fitScore: 90 }),
      item({ id: "none", fitScore: null }),
    ];

    expect(
      filterJobs(jobs, { ...EMPTY_FILTERS, minFit: 80 }).map((j) => j.id),
    ).toEqual(["scored"]);
  });

  it("combines filters conjunctively", () => {
    const jobs = [
      item({ id: "a", priority: "HIGH", company: "Alpha" }),
      item({ id: "b", priority: "HIGH", company: "Beta" }),
      item({ id: "c", priority: "LOW", company: "Alpha" }),
    ];

    expect(
      filterJobs(jobs, {
        ...EMPTY_FILTERS,
        priorities: ["HIGH"],
        query: "alpha",
      }).map((j) => j.id),
    ).toEqual(["a"]);
  });
});

describe("sortJobs", () => {
  it("orders by fit score descending by default", () => {
    const jobs = [
      item({ id: "low", fitScore: 40 }),
      item({ id: "high", fitScore: 90 }),
    ];
    expect(sortJobs(jobs, "fitScore").map((j) => j.id)).toEqual([
      "high",
      "low",
    ]);
  });

  it("puts jobs missing the sorted field last in both directions", () => {
    const jobs = [
      item({ id: "none", fitScore: null }),
      item({ id: "scored", fitScore: 50 }),
    ];

    expect(sortJobs(jobs, "fitScore", "desc").map((j) => j.id)).toEqual([
      "scored",
      "none",
    ]);
    // Ascending too: an unscored job floating to the top would read as a zero.
    expect(sortJobs(jobs, "fitScore", "asc").map((j) => j.id)).toEqual([
      "scored",
      "none",
    ]);
  });

  it("orders priority by rank rather than alphabetically", () => {
    const jobs = [
      item({ id: "low", priority: "LOW" }),
      item({ id: "urgent", priority: "URGENT" }),
      item({ id: "medium", priority: "MEDIUM" }),
    ];
    expect(sortJobs(jobs, "priority").map((j) => j.id)).toEqual([
      "urgent",
      "medium",
      "low",
    ]);
  });

  it("sorts deadlines soonest first", () => {
    const jobs = [
      item({ id: "later", deadline: new Date("2026-08-01") }),
      item({ id: "sooner", deadline: new Date("2026-07-01") }),
    ];
    expect(sortJobs(jobs, "deadline").map((j) => j.id)).toEqual([
      "sooner",
      "later",
    ]);
  });

  it("sorts company names alphabetically", () => {
    const jobs = [
      item({ id: "z", company: "Zebra" }),
      item({ id: "a", company: "Acme" }),
    ];
    expect(sortJobs(jobs, "company").map((j) => j.id)).toEqual(["a", "z"]);
  });

  it("does not mutate the input array", () => {
    const jobs = [
      item({ id: "a", fitScore: 10 }),
      item({ id: "b", fitScore: 90 }),
    ];
    const before = jobs.map((j) => j.id);
    sortJobs(jobs, "fitScore");
    expect(jobs.map((j) => j.id)).toEqual(before);
  });

  it("breaks ties by company so ordering is stable", () => {
    const jobs = [
      item({ id: "b", company: "Beta", fitScore: 70 }),
      item({ id: "a", company: "Alpha", fitScore: 70 }),
    ];
    expect(sortJobs(jobs, "fitScore").map((j) => j.id)).toEqual(["a", "b"]);
  });
});

describe("defaultDirection", () => {
  it("reads scores and activity newest or highest first", () => {
    expect(defaultDirection("fitScore")).toBe("desc");
    expect(defaultDirection("lastActivity")).toBe("desc");
  });

  it("reads deadlines and names ascending", () => {
    expect(defaultDirection("deadline")).toBe("asc");
    expect(defaultDirection("company")).toBe("asc");
  });
});

describe("isSortKey", () => {
  it("accepts a known key and rejects anything else", () => {
    expect(isSortKey("fitScore")).toBe(true);
    expect(isSortKey("nonsense")).toBe(false);
    expect(isSortKey(undefined)).toBe(false);
  });
});

describe("daysUntil and daysSince", () => {
  it("counts a future date forwards and a past one backwards", () => {
    expect(daysUntil(new Date("2026-06-20T00:00:00Z"), NOW)).toBe(5);
    expect(daysUntil(new Date("2026-06-10T00:00:00Z"), NOW)).toBe(-5);
  });

  it("treats the same calendar day as zero regardless of time", () => {
    expect(daysUntil(new Date("2026-06-15T23:00:00Z"), NOW)).toBe(0);
  });

  it("returns null for no date", () => {
    expect(daysUntil(null, NOW)).toBeNull();
  });

  it("never reports negative elapsed days", () => {
    expect(daysSince(new Date("2026-06-20T00:00:00Z"), NOW)).toBe(0);
  });
});
