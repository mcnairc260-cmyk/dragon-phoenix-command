"use client";

import type { JobStatus, Priority } from "@prisma/client";
import { Briefcase, Columns3, Search, Table2, X } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import {
  DeadlineBadge,
  FitScore,
  PriorityBadge,
  StatusBadge,
  formatSalary,
} from "@/components/jobs/job-badges";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  JOB_STATUS_LABEL,
  KANBAN_STATUSES,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
} from "@/lib/domain/constants";
import {
  EMPTY_FILTERS,
  SORT_LABEL,
  SORT_KEYS,
  daysSince,
  defaultDirection,
  filterJobs,
  sortJobs,
  type JobFilters,
  type JobListItem,
  type SortKey,
} from "@/lib/domain/job-filters";
import { useLocalPreference } from "@/lib/hooks/use-local-preference";
import { cn } from "@/lib/utils";

import { NewJobButton } from "./new-job-button";
import { StatusMover } from "./status-mover";

type Item = JobListItem & { salaryText: string | null };

const VIEW_STORAGE_KEY = "cf-jobs-view";
const VIEWS = ["board", "table"] as const;

export function JobsWorkspace({
  jobs,
  hasProfile,
}: {
  jobs: Item[];
  hasProfile: boolean;
}) {
  const [view, chooseView] = useLocalPreference(
    VIEW_STORAGE_KEY,
    VIEWS,
    "board",
  );
  const [filters, setFilters] = React.useState<JobFilters>(EMPTY_FILTERS);
  const [sort, setSort] = React.useState<SortKey>("lastActivity");

  const visible = React.useMemo(
    () => sortJobs(filterJobs(jobs, filters), sort, defaultDirection(sort)),
    [jobs, filters, sort],
  );

  const filtersActive =
    filters.query !== "" ||
    filters.statuses.length > 0 ||
    filters.priorities.length > 0 ||
    filters.minFit !== null ||
    filters.includeArchived;

  if (jobs.length === 0) {
    return (
      <div className="mt-8">
        <EmptyState
          icon={<Briefcase />}
          title="No opportunities yet"
          description={
            hasProfile
              ? "Paste a job posting to get started. Analysis and drafts both read from the description, so the more of it you paste the better."
              : "You can add jobs now, but fill in your profile first — fit scoring compares postings against your skills and accomplishments."
          }
          action={<NewJobButton label="Add your first opportunity" />}
        />
      </div>
    );
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="flex flex-wrap items-end gap-2">
        <div className="relative min-w-48 flex-1">
          <Search
            aria-hidden
            className="text-ink-subtle pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2"
          />
          <Input
            value={filters.query}
            onChange={(e) =>
              setFilters((f) => ({ ...f, query: e.target.value }))
            }
            placeholder="Search title, company, or location…"
            aria-label="Search opportunities"
            className="pl-9"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jobs-sort">Sort</Label>
          <Select value={sort} onValueChange={(v) => setSort(v as SortKey)}>
            <SelectTrigger id="jobs-sort" className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {SORT_KEYS.map((key) => (
                <SelectItem key={key} value={key}>
                  {SORT_LABEL[key]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="jobs-minfit">Min fit</Label>
          <Select
            value={filters.minFit === null ? "any" : String(filters.minFit)}
            onValueChange={(v) =>
              setFilters((f) => ({
                ...f,
                minFit: v === "any" ? null : Number(v),
              }))
            }
          >
            <SelectTrigger id="jobs-minfit" className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="any">Any</SelectItem>
              <SelectItem value="50">50+</SelectItem>
              <SelectItem value="65">65+</SelectItem>
              <SelectItem value="80">80+</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div
          role="group"
          aria-label="View"
          className="border-line bg-surface-sunken flex rounded-md border p-0.5"
        >
          <Button
            variant={view === "board" ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={view === "board"}
            onClick={() => chooseView("board")}
          >
            <Columns3 />
            Board
          </Button>
          <Button
            variant={view === "table" ? "secondary" : "ghost"}
            size="sm"
            aria-pressed={view === "table"}
            onClick={() => chooseView("table")}
          >
            <Table2 />
            Table
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap items-center gap-1.5">
        {PRIORITY_ORDER.map((priority) => {
          const active = filters.priorities.includes(priority);
          return (
            <Button
              key={priority}
              size="sm"
              variant={active ? "secondary" : "ghost"}
              aria-pressed={active}
              onClick={() =>
                setFilters((f) => ({
                  ...f,
                  priorities: active
                    ? f.priorities.filter((p) => p !== priority)
                    : [...f.priorities, priority],
                }))
              }
            >
              {PRIORITY_LABEL[priority]}
            </Button>
          );
        })}

        <span aria-hidden className="bg-line mx-1 h-5 w-px" />

        <Button
          size="sm"
          variant={filters.includeArchived ? "secondary" : "ghost"}
          aria-pressed={filters.includeArchived}
          onClick={() =>
            setFilters((f) => ({ ...f, includeArchived: !f.includeArchived }))
          }
        >
          Include archived
        </Button>

        {filtersActive ? (
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setFilters(EMPTY_FILTERS)}
          >
            <X />
            Clear filters
          </Button>
        ) : null}

        <span className="text-ink-subtle ml-auto text-xs">
          {visible.length} of {jobs.length} shown
        </span>
      </div>

      {visible.length === 0 ? (
        <EmptyState
          title="Nothing matches those filters"
          description="Widen the search, lower the minimum fit, or clear the filters to see everything again."
          action={
            <Button
              variant="secondary"
              onClick={() => setFilters(EMPTY_FILTERS)}
            >
              Clear filters
            </Button>
          }
        />
      ) : view === "board" ? (
        <KanbanBoard jobs={visible} />
      ) : (
        <JobsTable jobs={visible} />
      )}
    </div>
  );
}

function KanbanBoard({ jobs }: { jobs: Item[] }) {
  const columns = KANBAN_STATUSES.map((status) => ({
    status,
    jobs: jobs.filter((j) => j.status === status),
  }));

  const outside = jobs.filter(
    (j) => !KANBAN_STATUSES.includes(j.status as JobStatus),
  );

  return (
    <div className="space-y-4">
      <div className="-mx-4 flex gap-3 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0">
        {columns.map(({ status, jobs: columnJobs }) => (
          <section
            key={status}
            aria-label={JOB_STATUS_LABEL[status]}
            className="w-64 shrink-0"
          >
            <div className="mb-2 flex items-center justify-between">
              <h2 className="text-ink text-sm font-medium">
                {JOB_STATUS_LABEL[status]}
              </h2>
              <span className="text-ink-subtle font-mono text-xs">
                {columnJobs.length}
              </span>
            </div>

            <div className="space-y-2">
              {columnJobs.length === 0 ? (
                <p className="border-line text-ink-subtle rounded-lg border border-dashed px-3 py-6 text-center text-xs">
                  Nothing here
                </p>
              ) : (
                columnJobs.map((job) => <JobCard key={job.id} job={job} />)
              )}
            </div>
          </section>
        ))}
      </div>

      {outside.length > 0 ? (
        <section aria-label="Closed opportunities">
          <h2 className="text-ink-muted mb-2 text-sm font-medium">
            Closed ({outside.length})
          </h2>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
            {outside.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
        </section>
      ) : null}
    </div>
  );
}

function JobCard({ job }: { job: Item }) {
  const quiet = daysSince(job.lastActivityAt);

  return (
    <Card className="hover:border-line-strong transition-colors">
      <CardContent className="space-y-2.5 p-3.5">
        <Link
          href={`/jobs/${job.id}`}
          className="block rounded-sm focus-visible:outline-offset-4"
        >
          <p className="text-ink text-sm leading-snug font-medium">
            {job.title}
          </p>
          <p className="text-ink-muted mt-0.5 text-xs">{job.company}</p>
        </Link>

        <div className="flex flex-wrap items-center gap-1.5">
          <FitScore score={job.fitScore} />
          <PriorityBadge priority={job.priority} />
          <DeadlineBadge deadline={job.deadline} />
          {quiet >= 14 ? <Badge tone="caution">Quiet {quiet}d</Badge> : null}
        </div>

        <div className="flex items-center justify-between gap-2">
          <span className="text-ink-subtle font-mono text-xs">
            {formatSalary(job.salaryMin, job.salaryMax, job.salaryText)}
          </span>
          <StatusMover jobId={job.id} status={job.status} />
        </div>
      </CardContent>
    </Card>
  );
}

function JobsTable({ jobs }: { jobs: Item[] }) {
  return (
    <div className="border-line overflow-x-auto rounded-lg border">
      <table className="w-full min-w-[54rem] border-collapse text-sm">
        <caption className="sr-only">
          Opportunities, with fit score, status, priority, salary, deadline, and
          last activity
        </caption>
        <thead>
          <tr className="bg-surface-sunken text-ink-subtle text-left">
            <Th>Role</Th>
            <Th>Fit</Th>
            <Th>Status</Th>
            <Th>Priority</Th>
            <Th>Salary</Th>
            <Th>Deadline</Th>
            <Th>Last activity</Th>
          </tr>
        </thead>
        <tbody>
          {jobs.map((job) => (
            <tr
              key={job.id}
              className="border-line hover:bg-surface-raised/50 border-t transition-colors"
            >
              <Td>
                <Link
                  href={`/jobs/${job.id}`}
                  className="text-ink rounded-sm font-medium hover:underline"
                >
                  {job.title}
                </Link>
                <span className="text-ink-muted block text-xs">
                  {job.company}
                  {job.location ? ` · ${job.location}` : ""}
                </span>
              </Td>
              <Td>
                <FitScore score={job.fitScore} />
              </Td>
              <Td>
                <StatusBadge status={job.status} />
              </Td>
              <Td>
                <PriorityBadge priority={job.priority} />
              </Td>
              <Td className="font-mono text-xs">
                {formatSalary(job.salaryMin, job.salaryMax, job.salaryText)}
              </Td>
              <Td className="text-xs">
                {job.deadline ? job.deadline.toLocaleDateString() : "—"}
              </Td>
              <Td className="text-ink-muted text-xs">
                {daysSince(job.lastActivityAt) === 0
                  ? "Today"
                  : `${daysSince(job.lastActivityAt)}d ago`}
              </Td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function Th({ children }: { children: React.ReactNode }) {
  return (
    <th scope="col" className="px-3 py-2 text-xs font-medium">
      {children}
    </th>
  );
}

function Td({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return <td className={cn("px-3 py-2.5 align-top", className)}>{children}</td>;
}

export type { Priority };
