"use client";

import type { Education } from "@prisma/client";
import { GraduationCap, Plus } from "lucide-react";

import { DeleteButton, EntityDialog } from "@/components/forms/entity-dialog";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteEducationAction,
  saveEducationAction,
} from "@/lib/server/actions/profile";

function dateValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function EducationFields({
  entry,
  errors,
}: {
  entry?: Education;
  errors: Record<string, string>;
}) {
  const key = entry?.id ?? "new";
  return (
    <>
      {entry ? <input type="hidden" name="id" value={entry.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`institution-${key}`}
          label="Institution"
          error={errors.institution}
        >
          {(p) => (
            <Input
              {...p}
              name="institution"
              required
              defaultValue={entry?.institution}
            />
          )}
        </Field>
        <Field
          id={`credential-${key}`}
          label="Credential"
          hint="Degree, certificate, or programme name."
          error={errors.credential}
        >
          {(p) => (
            <Input
              {...p}
              name="credential"
              required
              placeholder="B.S. Computer Science"
              defaultValue={entry?.credential}
            />
          )}
        </Field>
        <Field id={`field-${key}`} label="Field of study" error={errors.field}>
          {(p) => (
            <Input {...p} name="field" defaultValue={entry?.field ?? ""} />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field
            id={`startDate-edu-${key}`}
            label="Start"
            error={errors.startDate}
          >
            {(p) => (
              <Input
                {...p}
                name="startDate"
                type="date"
                defaultValue={dateValue(entry?.startDate ?? null)}
              />
            )}
          </Field>
          <Field id={`endDate-edu-${key}`} label="End" error={errors.endDate}>
            {(p) => (
              <Input
                {...p}
                name="endDate"
                type="date"
                defaultValue={dateValue(entry?.endDate ?? null)}
              />
            )}
          </Field>
        </div>
      </div>

      <Field id={`notes-${key}`} label="Notes" error={errors.notes}>
        {(p) => (
          <Textarea
            {...p}
            name="notes"
            rows={3}
            placeholder="Focus areas, honours, renewal dates."
            defaultValue={entry?.notes}
          />
        )}
      </Field>
    </>
  );
}

function formatYears(entry: Education): string {
  const start = entry.startDate?.getFullYear();
  const end = entry.endDate?.getFullYear();
  if (start && end) return `${start} — ${end}`;
  return String(end ?? start ?? "");
}

export function EducationSection({
  hasProfile,
  educations,
}: {
  hasProfile: boolean;
  educations: Education[];
}) {
  if (!hasProfile) {
    return (
      <EmptyState
        icon={<GraduationCap />}
        title="Save your basics first"
        description="Education attaches to your profile, so the Basics tab needs a name before you can add entries."
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <EntityDialog
          trigger={
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus />
                Add education
              </Button>
            </DialogTrigger>
          }
          title="Add education"
          action={saveEducationAction}
          successMessage="Education added."
          wide
        >
          {(errors) => <EducationFields errors={errors} />}
        </EntityDialog>
      </div>

      {educations.length === 0 ? (
        <EmptyState
          icon={<GraduationCap />}
          title="No education entries yet"
          description="Degrees, bootcamps, and certifications all belong here. Postings that list a hard requirement are scored against them."
        />
      ) : (
        <div className="space-y-3">
          {educations.map((entry) => (
            <Card key={entry.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-medium">
                    {entry.credential}
                    <span className="text-ink-muted font-normal">
                      {" "}
                      · {entry.institution}
                    </span>
                  </p>
                  <p className="text-ink-subtle mt-0.5 font-mono text-xs">
                    {[formatYears(entry), entry.field]
                      .filter(Boolean)
                      .join(" · ")}
                  </p>
                  {entry.notes ? (
                    <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                      {entry.notes}
                    </p>
                  ) : null}
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
                    title="Edit education"
                    action={saveEducationAction}
                    successMessage="Education updated."
                    wide
                  >
                    {(errors) => (
                      <EducationFields entry={entry} errors={errors} />
                    )}
                  </EntityDialog>

                  <DeleteButton
                    label="Delete"
                    successMessage="Entry deleted."
                    onDelete={() => deleteEducationAction(entry.id)}
                  />
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
