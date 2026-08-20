"use client";

import type { Priority } from "@prisma/client";
import {
  CircleAlert,
  CircleCheck,
  CircleHelp,
  RefreshCw,
  Sparkles,
  ThumbsUp,
} from "lucide-react";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/toast";
import {
  EVIDENCE_EXPLANATION,
  EVIDENCE_LABEL,
  gapSchema,
  skillFindingSchema,
  type EvidenceLevel,
  type Gap,
  type SkillFinding,
} from "@/lib/ai/schemas";
import { PRIORITY_LABEL, fitBand } from "@/lib/domain/constants";
import { analyzeJobAction } from "@/lib/server/actions/analysis";
import { cn } from "@/lib/utils";
import { z } from "zod";

type StoredAnalysis = {
  fitScore: number;
  explanation: string;
  recommendedPriority: Priority;
  requiredSkills: unknown;
  preferredSkills: unknown;
  matchedSkills: unknown;
  missingQualifications: unknown;
  strengths: unknown;
  concerns: unknown;
  provider: string;
  model: string;
  updatedAt: Date;
};

// Columns are Json, so what comes back is `unknown`. Parsing defensively here
// means a row written by an older schema degrades to an empty list rather than
// crashing the page.
const findings = z.array(skillFindingSchema).catch([]);
const gaps = z.array(gapSchema).catch([]);
const strings = z.array(z.string()).catch([]);

const EVIDENCE_TONE: Record<
  EvidenceLevel,
  "positive" | "caution" | "critical"
> = {
  CONFIRMED: "positive",
  INFERRED: "caution",
  MISSING: "critical",
};

const EVIDENCE_ICON: Record<EvidenceLevel, typeof CircleCheck> = {
  CONFIRMED: CircleCheck,
  INFERRED: CircleHelp,
  MISSING: CircleAlert,
};

export function AnalysisPanel({
  jobId,
  analysis,
  hasDescription,
  hasProfile,
  skillCount,
}: {
  jobId: string;
  analysis: StoredAnalysis | null;
  hasDescription: boolean;
  hasProfile: boolean;
  skillCount: number;
}) {
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();

  function run(force: boolean) {
    startTransition(async () => {
      const result = await analyzeJobAction(jobId, { force });
      if (result.ok) {
        toast(
          result.data.cached
            ? "Nothing changed since the last analysis, so the stored one still stands."
            : `Analysed: ${result.data.fitScore}/100.`,
          "success",
        );
      } else {
        toast(result.error, "error");
      }
    });
  }

  if (pending && !analysis) return <AnalysisSkeleton />;

  if (!analysis) {
    const blocked = !hasDescription || !hasProfile;
    return (
      <EmptyState
        icon={<Sparkles />}
        title="Not analysed yet"
        description={
          !hasProfile
            ? "Fit scoring compares this posting against your profile, so build the profile first."
            : !hasDescription
              ? "Paste the job description into this opportunity and analysis becomes possible."
              : skillCount === 0
                ? "Add a few skills to your profile first, or every requirement here comes back as missing evidence."
                : "Run the analysis to get a fit score, the skills this posting asks for, and where your evidence is thin."
        }
        action={
          <Button disabled={pending || blocked} onClick={() => run(false)}>
            <Sparkles />
            {pending ? "Analysing…" : "Analyse this job"}
          </Button>
        }
      />
    );
  }

  const required = findings.parse(analysis.requiredSkills);
  const preferred = findings.parse(analysis.preferredSkills);
  const missing = gaps.parse(analysis.missingQualifications);
  const strengths = strings.parse(analysis.strengths);
  const concerns = strings.parse(analysis.concerns);

  const band = fitBand(analysis.fitScore);

  return (
    <div className="space-y-5">
      <Card>
        <CardContent className="flex flex-col gap-5 p-5 sm:flex-row sm:items-start">
          <div className="flex shrink-0 items-baseline gap-2">
            <span className="text-ink font-mono text-4xl tabular-nums">
              {analysis.fitScore}
            </span>
            <span className="text-ink-subtle font-mono text-sm">/100</span>
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <Badge tone={band.tone}>{band.label}</Badge>
              <Badge tone="neutral">
                Suggested priority:{" "}
                {PRIORITY_LABEL[analysis.recommendedPriority]}
              </Badge>
            </div>
            <p className="text-ink-muted mt-3 text-sm leading-relaxed">
              {analysis.explanation}
            </p>
            <p className="text-ink-subtle mt-3 font-mono text-xs">
              {analysis.provider === "mock"
                ? "Local heuristics (no AI provider configured)"
                : `${analysis.provider} · ${analysis.model}`}{" "}
              · {analysis.updatedAt.toLocaleString()}
            </p>
          </div>

          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => run(true)}
            className="shrink-0"
          >
            <RefreshCw className={cn(pending && "animate-spin")} />
            {pending ? "Analysing…" : "Re-analyse"}
          </Button>
        </CardContent>
      </Card>

      <div className="bg-surface-sunken border-line rounded-lg border px-4 py-3">
        <p className="text-ink text-sm font-medium">
          How to read the evidence labels
        </p>
        <ul className="mt-2 grid gap-1.5 sm:grid-cols-3">
          {(["CONFIRMED", "INFERRED", "MISSING"] as EvidenceLevel[]).map(
            (level) => (
              <li key={level} className="flex items-start gap-2">
                <Badge tone={EVIDENCE_TONE[level]}>
                  {EVIDENCE_LABEL[level]}
                </Badge>
                <span className="text-ink-muted text-xs leading-relaxed">
                  {EVIDENCE_EXPLANATION[level]}
                </span>
              </li>
            ),
          )}
        </ul>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <SkillList
          title="Required by the posting"
          description="What it says you must have."
          items={required}
        />
        <SkillList
          title="Preferred"
          description="Nice-to-haves. Worth naming, not worth blocking on."
          items={preferred}
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ThumbsUp className="text-positive size-4" aria-hidden />
              Reasons to apply
            </CardTitle>
          </CardHeader>
          <CardContent>
            {strengths.length === 0 ? (
              <p className="text-ink-subtle text-sm">Nothing stood out.</p>
            ) : (
              <ul className="space-y-2">
                {strengths.map((item, i) => (
                  <li
                    key={i}
                    className="text-ink-muted text-sm leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <CircleAlert className="text-caution size-4" aria-hidden />
              Concerns
            </CardTitle>
          </CardHeader>
          <CardContent>
            {concerns.length === 0 ? (
              <p className="text-ink-subtle text-sm">
                Nothing flagged. That is worth a second look yourself.
              </p>
            ) : (
              <ul className="space-y-2">
                {concerns.map((item, i) => (
                  <li
                    key={i}
                    className="text-ink-muted text-sm leading-relaxed"
                  >
                    {item}
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <GapList gaps={missing} />
    </div>
  );
}

function SkillList({
  title,
  description,
  items,
}: {
  title: string;
  description: string;
  items: SkillFinding[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        {items.length === 0 ? (
          <p className="text-ink-subtle text-sm">
            Nothing detected in this section of the posting.
          </p>
        ) : (
          <ul className="space-y-2">
            {items.map((item) => {
              const Icon = EVIDENCE_ICON[item.evidence];
              return (
                <li key={item.name} className="flex items-start gap-2.5">
                  <Icon
                    aria-hidden
                    className={cn(
                      "mt-0.5 size-4 shrink-0",
                      item.evidence === "CONFIRMED" && "text-positive",
                      item.evidence === "INFERRED" && "text-caution",
                      item.evidence === "MISSING" && "text-critical",
                    )}
                  />
                  <div className="min-w-0">
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <span className="text-ink cursor-help text-sm">
                          {item.name}
                        </span>
                      </TooltipTrigger>
                      <TooltipContent>
                        {EVIDENCE_LABEL[item.evidence]} —{" "}
                        {EVIDENCE_EXPLANATION[item.evidence]}
                      </TooltipContent>
                    </Tooltip>
                    {item.note ? (
                      <p className="text-ink-subtle mt-0.5 text-xs leading-relaxed">
                        {item.note}
                      </p>
                    ) : null}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function GapList({ gaps: items }: { gaps: Gap[] }) {
  if (items.length === 0) return null;

  const tone = {
    MAJOR: "critical",
    MODERATE: "caution",
    MINOR: "neutral",
  } as const;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Gaps and unclear qualifications</CardTitle>
        <CardDescription>
          Each of these is either a thing to learn, a thing to add to your
          profile, or a reason to skip this one.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <ul className="space-y-2.5">
          {items.map((gap, i) => (
            <li key={`${gap.item}-${i}`} className="flex items-start gap-2.5">
              <Badge tone={tone[gap.severity]}>
                {gap.severity.toLowerCase()}
              </Badge>
              <div className="min-w-0">
                <p className="text-ink text-sm">{gap.item}</p>
                {gap.note ? (
                  <p className="text-ink-subtle mt-0.5 text-xs leading-relaxed">
                    {gap.note}
                  </p>
                ) : null}
              </div>
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}

function AnalysisSkeleton() {
  return (
    <div className="space-y-5">
      <Skeleton className="h-28" />
      <div className="grid gap-5 lg:grid-cols-2">
        <Skeleton className="h-56" />
        <Skeleton className="h-56" />
      </div>
    </div>
  );
}
