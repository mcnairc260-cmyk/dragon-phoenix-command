"use client";

import type { ApplicationMaterial, MaterialKind } from "@prisma/client";
import {
  Copy,
  Download,
  FileText,
  RotateCcw,
  Sparkles,
  Trash2,
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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  MATERIAL_DESCRIPTION,
  MATERIAL_KINDS,
  MATERIAL_LABEL,
} from "@/lib/domain/constants";
import { useAutosave } from "@/lib/hooks/use-autosave";
import {
  deleteMaterialAction,
  generateMaterialAction,
  revertMaterialAction,
  saveMaterialAction,
} from "@/lib/server/actions/materials";
import { cn } from "@/lib/utils";

import { SaveIndicator } from "./notes-editor";

type Accomplishment = { id: string; title: string; metric: string | null };

export function MaterialsPanel({
  jobId,
  materials,
  accomplishments,
  hasAnalysis,
  accomplishmentCount,
}: {
  jobId: string;
  materials: ApplicationMaterial[];
  accomplishments: Accomplishment[];
  hasAnalysis: boolean;
  accomplishmentCount: number;
}) {
  const byKind = new Map(materials.map((m) => [m.kind, m]));
  const [active, setActive] = React.useState<MaterialKind>(
    materials[0]?.kind ?? "SUMMARY",
  );

  const current = byKind.get(active);

  return (
    <div className="space-y-5">
      {!hasAnalysis ? (
        <p className="bg-surface-sunken border-line text-ink-muted rounded-lg border px-4 py-3 text-sm leading-relaxed">
          You can generate without a fit analysis, but drafts read better with
          one — the analysis is what tells the generator which of your
          accomplishments this posting actually cares about.
        </p>
      ) : null}

      {accomplishmentCount === 0 ? (
        <p className="bg-caution-soft border-caution/30 text-ink rounded-lg border px-4 py-3 text-sm leading-relaxed">
          Your accomplishment bank is empty. Drafts will be generic, because the
          generator will not invent achievements to fill the space. Add three
          accomplishments and regenerate.
        </p>
      ) : null}

      <div className="flex flex-wrap gap-1.5">
        {MATERIAL_KINDS.map((kind) => {
          const existing = byKind.get(kind);
          return (
            <Button
              key={kind}
              size="sm"
              variant={active === kind ? "secondary" : "ghost"}
              aria-pressed={active === kind}
              onClick={() => setActive(kind)}
              className={cn(!existing && "text-ink-subtle")}
            >
              {MATERIAL_LABEL[kind]}
              {existing ? (
                <span
                  aria-hidden
                  className="bg-accent ml-0.5 size-1.5 rounded-full"
                />
              ) : null}
            </Button>
          );
        })}
      </div>

      <MaterialEditor
        key={active}
        jobId={jobId}
        kind={active}
        material={current}
        accomplishments={accomplishments}
      />

      {materials.length > 0 ? (
        <ExportBar jobId={jobId} materials={materials} />
      ) : null}
    </div>
  );
}

function MaterialEditor({
  jobId,
  kind,
  material,
  accomplishments,
}: {
  jobId: string;
  kind: MaterialKind;
  material: ApplicationMaterial | undefined;
  accomplishments: Accomplishment[];
}) {
  const { toast } = useToast();
  const [pending, startTransition] = React.useTransition();
  const [content, setContent] = React.useState(material?.content ?? "");

  const { status, error } = useAutosave({
    value: content,
    initialValue: material?.content ?? "",
    save: React.useCallback(
      (value: string) => saveMaterialAction(jobId, kind, value),
      [jobId, kind],
    ),
  });

  function generate() {
    startTransition(async () => {
      const result = await generateMaterialAction(jobId, kind);
      toast(
        result.ok ? `${MATERIAL_LABEL[kind]} generated.` : result.error,
        result.ok ? "success" : "error",
      );
    });
  }

  function revert() {
    startTransition(async () => {
      const result = await revertMaterialAction(jobId, kind);
      if (result.ok) {
        setContent(result.data.content);
        toast("Reverted to the generated version.", "success");
      } else {
        toast(result.error, "error");
      }
    });
  }

  function remove() {
    startTransition(async () => {
      const result = await deleteMaterialAction(jobId, kind);
      if (result.ok) {
        setContent("");
        toast("Draft deleted.", "success");
      } else {
        toast(result.error, "error");
      }
    });
  }

  async function copy() {
    try {
      await navigator.clipboard.writeText(content);
      toast("Copied to the clipboard.", "success");
    } catch {
      toast(
        "Your browser blocked the clipboard. Select the text and copy it.",
        "error",
      );
    }
  }

  if (!material) {
    return (
      <EmptyState
        icon={<Sparkles />}
        title={`No ${MATERIAL_LABEL[kind].toLowerCase()} yet`}
        description={MATERIAL_DESCRIPTION[kind]}
        action={
          <Button disabled={pending} onClick={generate}>
            <Sparkles />
            {pending
              ? "Generating…"
              : `Generate ${MATERIAL_LABEL[kind].toLowerCase()}`}
          </Button>
        }
      />
    );
  }

  const sources = accomplishments.filter((a) =>
    material.sourceAccomplishmentIds.includes(a.id),
  );

  return (
    <Card>
      <CardHeader>
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle className="flex items-center gap-2">
              {MATERIAL_LABEL[kind]}
              {material.isEdited ? <Badge tone="accent">Edited</Badge> : null}
            </CardTitle>
            <CardDescription>{MATERIAL_DESCRIPTION[kind]}</CardDescription>
          </div>
          <SaveIndicator status={status} error={error} />
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <Textarea
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={18}
          aria-label={`${MATERIAL_LABEL[kind]} draft`}
          className="font-mono text-xs leading-relaxed"
        />

        <div className="flex flex-wrap gap-2">
          <Button variant="secondary" size="sm" onClick={() => void copy()}>
            <Copy />
            Copy
          </Button>
          <Button
            variant="secondary"
            size="sm"
            disabled={pending}
            onClick={generate}
          >
            <Sparkles />
            Regenerate
          </Button>
          {material.isEdited ? (
            <Button
              variant="ghost"
              size="sm"
              disabled={pending}
              onClick={revert}
            >
              <RotateCcw />
              Revert to generated
            </Button>
          ) : null}
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            onClick={remove}
            className="text-critical ml-auto"
          >
            <Trash2 />
            Delete
          </Button>
        </div>

        <div className="border-line bg-surface-sunken rounded-md border p-3.5">
          <p className="text-ink text-xs font-medium">
            What this draft was built from
          </p>
          {sources.length === 0 ? (
            <p className="text-ink-muted mt-1.5 text-xs leading-relaxed">
              No specific accomplishments — this one draws on your profile
              generally. Nothing here was invented; anything the profile does
              not contain simply is not in the draft.
            </p>
          ) : (
            <ul className="mt-2 space-y-1">
              {sources.map((source) => (
                <li key={source.id} className="text-ink-muted text-xs">
                  {source.title}
                  {source.metric ? (
                    <span className="text-accent font-mono">
                      {" "}
                      · {source.metric}
                    </span>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
          <p className="text-ink-subtle mt-2.5 text-xs">
            {material.provider === "mock"
              ? "Assembled locally from your record — no AI provider configured."
              : `${material.provider} · ${material.model}`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

function ExportBar({
  jobId,
  materials,
}: {
  jobId: string;
  materials: ApplicationMaterial[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="size-4" aria-hidden />
          Export
        </CardTitle>
        <CardDescription>
          {materials.length} draft{materials.length === 1 ? "" : "s"} ready.
          Markdown keeps the structure; plain text pastes cleanly into an
          application form.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-wrap gap-2">
        <Button variant="secondary" size="sm" asChild>
          <a href={`/api/jobs/${jobId}/export?format=md`} download>
            <Download />
            All as Markdown
          </a>
        </Button>
        <Button variant="secondary" size="sm" asChild>
          <a href={`/api/jobs/${jobId}/export?format=txt`} download>
            <Download />
            All as plain text
          </a>
        </Button>
      </CardContent>
    </Card>
  );
}
