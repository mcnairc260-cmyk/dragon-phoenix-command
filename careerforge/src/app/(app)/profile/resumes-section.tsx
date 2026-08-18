"use client";

import type { Resume } from "@prisma/client";
import { FileText, Plus } from "lucide-react";

import { DeleteButton, EntityDialog } from "@/components/forms/entity-dialog";
import { Field } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteResumeAction,
  saveResumeAction,
} from "@/lib/server/actions/profile";

function ResumeFields({
  resume,
  errors,
}: {
  resume?: Resume;
  errors: Record<string, string>;
}) {
  const key = resume?.id ?? "new";
  return (
    <>
      {resume ? <input type="hidden" name="id" value={resume.id} /> : null}

      <Field
        id={`label-${key}`}
        label="Version name"
        hint="What distinguishes this cut, e.g. Platform / infrastructure."
        error={errors.label}
      >
        {(p) => (
          <Input
            {...p}
            name="label"
            required
            placeholder="Backend — general"
            defaultValue={resume?.label}
          />
        )}
      </Field>

      <Field id={`content-${key}`} label="Resume text" error={errors.content}>
        {(p) => (
          <Textarea
            {...p}
            name="content"
            rows={14}
            className="font-mono text-xs leading-relaxed"
            defaultValue={resume?.content}
          />
        )}
      </Field>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`isDefault-${key}`}
          name="isDefault"
          value="true"
          defaultChecked={resume?.isDefault}
        />
        <Label
          htmlFor={`isDefault-${key}`}
          className="cursor-pointer normal-case"
        >
          Use this as my default version
        </Label>
      </div>
    </>
  );
}

export function ResumesSection({
  hasProfile,
  resumes,
}: {
  hasProfile: boolean;
  resumes: Resume[];
}) {
  if (!hasProfile) {
    return (
      <EmptyState
        icon={<FileText />}
        title="Save your basics first"
        description="Resume versions attach to your profile, so the Basics tab needs a name before you can add them."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-ink-muted text-sm">
          Keep a cut per role type. Saving bumps the version number so you can
          see which one has been iterated on.
        </p>
        <EntityDialog
          trigger={
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus />
                Add version
              </Button>
            </DialogTrigger>
          }
          title="Add a resume version"
          action={saveResumeAction}
          successMessage="Resume version added."
          wide
        >
          {(errors) => <ResumeFields errors={errors} />}
        </EntityDialog>
      </div>

      {resumes.length === 0 ? (
        <EmptyState
          icon={<FileText />}
          title="No resume versions yet"
          description="Most searches need two or three cuts. Add one per kind of role you are targeting."
        />
      ) : (
        <div className="space-y-3">
          {resumes.map((resume) => (
            <Card key={resume.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-ink flex items-center gap-2 text-sm font-medium">
                      {resume.label}
                      {resume.isDefault ? (
                        <Badge tone="accent">Default</Badge>
                      ) : null}
                    </p>
                    <p className="text-ink-subtle mt-0.5 font-mono text-xs">
                      v{resume.version} · updated{" "}
                      {resume.updatedAt.toLocaleDateString()}
                    </p>
                    {resume.content ? (
                      <p className="text-ink-muted mt-2 line-clamp-2 text-sm leading-relaxed">
                        {resume.content}
                      </p>
                    ) : (
                      <p className="text-ink-subtle mt-2 text-sm italic">
                        No text yet.
                      </p>
                    )}
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <EntityDialog
                      trigger={
                        <DialogTrigger asChild>
                          <Button variant="ghost" size="sm">
                            Edit
                          </Button>
                        </DialogTrigger>
                      }
                      title="Edit resume version"
                      action={saveResumeAction}
                      successMessage="Resume version saved."
                      wide
                    >
                      {(errors) => (
                        <ResumeFields resume={resume} errors={errors} />
                      )}
                    </EntityDialog>

                    <DeleteButton
                      label="Delete"
                      successMessage="Version deleted."
                      onDelete={() => deleteResumeAction(resume.id)}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
