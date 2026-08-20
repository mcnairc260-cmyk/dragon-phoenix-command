import type { JobStatus, Priority } from "@prisma/client";

import { PRIORITY_WEIGHT } from "./constants";

/** The shape the list views need. Deliberately narrower than the Prisma row. */
export type JobListItem = {
  id: string;
  title: string;
  company: string;
  location: string | null;
  status: JobStatus;
  priority: Priority;
  salaryMin: number | null;
  salaryMax: number | null;
  deadline: Date | null;
  lastActivityAt: Date;
  createdAt: Date;
  fitScore: number | null;
};

export const SORT_KEYS = [
  "fitScore",
  "priority",
  "deadline",
  "salary",
  "lastActivity",
  "company",
] as const;

export type SortKey = (typeof SORT_KEYS)[number];

export const SORT_LABEL: Record<SortKey, string> = {
  fitScore: "Fit score",
  priority: "Priority",
  deadline: "Deadline",
  salary: "Salary",
  lastActivity: "Last activity",
  company: "Company",
};

export function isSortKey(value: string | undefined): value is SortKey {
  return SORT_KEYS.includes((value ?? "") as SortKey);
}

export type JobFilters = {
  query: string;
  statuses: JobStatus[];
  priorities: Priority[];
  minFit: number | null;
  includeArchived: boolean;
};

export const EMPTY_FILTERS: JobFilters = {
  query: "",
  statuses: [],
  priorities: [],
  minFit: null,
  includeArchived: false,
};

/**
 * Comparable value for each sort. Jobs missing the sorted-on field always land
 * at the bottom regardless of direction — an unscored job appearing above a
 * 90-scored one just because its score is null would be actively misleading.
 */
function sortValue(job: JobListItem, key: SortKey): number | string | null {
  switch (key) {
    case "fitScore":
      return job.fitScore;
    case "priority":
      return PRIORITY_WEIGHT[job.priority];
    case "deadline":
      return job.deadline ? job.deadline.getTime() : null;
    case "salary":
      return job.salaryMax ?? job.salaryMin;
    case "lastActivity":
      return job.lastActivityAt.getTime();
    case "company":
      return job.company.toLocaleLowerCase();
  }
}

/** Sorts that read best newest/highest first. */
const DESC_BY_DEFAULT: SortKey[] = [
  "fitScore",
  "priority",
  "salary",
  "lastActivity",
];

export function defaultDirection(key: SortKey): "asc" | "desc" {
  return DESC_BY_DEFAULT.includes(key) ? "desc" : "asc";
}

export function sortJobs<T extends JobListItem>(
  jobs: T[],
  key: SortKey,
  direction: "asc" | "desc" = defaultDirection(key),
): T[] {
  const factor = direction === "asc" ? 1 : -1;

  return [...jobs].sort((a, b) => {
    const av = sortValue(a, key);
    const bv = sortValue(b, key);

    if (av === null && bv === null) return a.company.localeCompare(b.company);
    if (av === null) return 1;
    if (bv === null) return -1;

    if (typeof av === "string" || typeof bv === "string") {
      return String(av).localeCompare(String(bv)) * factor;
    }

    if (av === bv) return a.company.localeCompare(b.company);
    return (av < bv ? -1 : 1) * factor;
  });
}

export function filterJobs<T extends JobListItem>(
  jobs: T[],
  filters: JobFilters,
): T[] {
  const needle = filters.query.trim().toLocaleLowerCase();

  return jobs.filter((job) => {
    if (!filters.includeArchived && job.status === "ARCHIVED") return false;

    if (filters.statuses.length && !filters.statuses.includes(job.status)) {
      return false;
    }

    if (
      filters.priorities.length &&
      !filters.priorities.includes(job.priority)
    ) {
      return false;
    }

    if (filters.minFit !== null) {
      // An unscored job cannot clear a minimum-fit bar; treating null as 0
      // would silently hide jobs that simply have not been analysed yet, so
      // the filter description says "scored at least".
      if (job.fitScore === null || job.fitScore < filters.minFit) return false;
    }

    if (needle) {
      const haystack = [job.title, job.company, job.location ?? ""]
        .join(" ")
        .toLocaleLowerCase();
      if (!haystack.includes(needle)) return false;
    }

    return true;
  });
}

/** Days until a deadline; negative when it has passed. Null when unset. */
export function daysUntil(
  date: Date | null,
  now: Date = new Date(),
): number | null {
  if (!date) return null;
  const startOfDay = (d: Date) =>
    Date.UTC(d.getFullYear(), d.getMonth(), d.getDate());
  return Math.round((startOfDay(date) - startOfDay(now)) / 86_400_000);
}

/** Whole days since a timestamp, floored at zero. */
export function daysSince(date: Date, now: Date = new Date()): number {
  return Math.max(0, Math.floor((now.getTime() - date.getTime()) / 86_400_000));
}
