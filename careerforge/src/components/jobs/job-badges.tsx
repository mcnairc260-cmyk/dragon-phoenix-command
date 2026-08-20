import type { JobStatus, Priority } from "@prisma/client";

import { Badge } from "@/components/ui/badge";
import {
  JOB_STATUS_LABEL,
  JOB_STATUS_TONE,
  PRIORITY_LABEL,
  PRIORITY_TONE,
  fitBand,
} from "@/lib/domain/constants";
import { daysUntil } from "@/lib/domain/job-filters";
import { cn } from "@/lib/utils";

export function StatusBadge({ status }: { status: JobStatus }) {
  return (
    <Badge tone={JOB_STATUS_TONE[status]}>{JOB_STATUS_LABEL[status]}</Badge>
  );
}

export function PriorityBadge({ priority }: { priority: Priority }) {
  return (
    <Badge tone={PRIORITY_TONE[priority]}>{PRIORITY_LABEL[priority]}</Badge>
  );
}

/**
 * The score is shown next to its band label because the number alone invites
 * false precision — 71 and 74 are the same decision, "Good fit" says so.
 */
export function FitScore({
  score,
  className,
}: {
  score: number | null;
  className?: string;
}) {
  if (score === null) {
    return (
      <span className={cn("text-ink-subtle font-mono text-xs", className)}>
        Not analysed
      </span>
    );
  }

  const band = fitBand(score);
  return (
    <span className={cn("inline-flex items-center gap-1.5", className)}>
      <span className="text-ink font-mono text-sm tabular-nums">{score}</span>
      <Badge tone={band.tone}>{band.label}</Badge>
    </span>
  );
}

export function DeadlineBadge({ deadline }: { deadline: Date | null }) {
  const days = daysUntil(deadline);
  if (days === null) return null;

  if (days < 0) {
    return <Badge tone="critical">Deadline passed</Badge>;
  }
  if (days === 0) return <Badge tone="critical">Due today</Badge>;
  if (days <= 3) return <Badge tone="caution">Due in {days}d</Badge>;
  return <Badge tone="neutral">Due in {days}d</Badge>;
}

export function formatSalary(
  min: number | null,
  max: number | null,
  text?: string | null,
): string {
  if (min === null && max === null) return text?.trim() || "—";
  const fmt = (n: number) =>
    n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
  if (min !== null && max !== null) return `$${fmt(min)} – $${fmt(max)}`;
  return `$${fmt((min ?? max) as number)}`;
}
