"use client";

import type { Employment } from "@prisma/client";
import { Briefcase, Plus } from "lucide-react";

import { DeleteButton, EntityDialog } from "@/components/forms/entity-dialog";
import { Field } from "@/components/forms/field";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteEmploymentAction,
  saveEmploymentAction,
} from "@/lib/server/actions/profile";

function dateValue(date: Date | null): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

function formatRange(role: Employment): string {
  const start = role.startDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
  if (role.isCurrent) return `${start} — present`;
  if (!role.endDate) return start;
  const end = role.endDate.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
  });
  return `${start} — ${end}`;
}

function EmploymentFields({
  role,
  errors,
}: {
  role?: Employment;
  errors: Record<string, string>;
}) {
  return (
    <>
      {role ? <input type="hidden" name="id" value={role.id} /> : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`title-${role?.id ?? "new"}`}
          label="Job title"
          error={errors.title}
        >
          {(p) => (
            <Input {...p} name="title" required defaultValue={role?.title} />
          )}
        </Field>
        <Field
          id={`company-${role?.id ?? "new"}`}
          label="Company"
          error={errors.company}
        >
          {(p) => (
            <Input
              {...p}
              name="company"
              required
              defaultValue={role?.company}
            />
          )}
        </Field>
        <Field
          id={`location-${role?.id ?? "new"}`}
          label="Location"
          error={errors.location}
        >
          {(p) => (
            <Input
              {...p}
              name="location"
              placeholder="Remote (US)"
              defaultValue={role?.location ?? ""}
            />
          )}
        </Field>
        <div className="grid grid-cols-2 gap-2">
          <Field
            id={`startDate-${role?.id ?? "new"}`}
            label="Start"
            error={errors.startDate}
          >
            {(p) => (
              <Input
                {...p}
                name="startDate"
                type="date"
                required
                defaultValue={dateValue(role?.startDate ?? null)}
              />
            )}
          </Field>
          <Field
            id={`endDate-${role?.id ?? "new"}`}
            label="End"
            error={errors.endDate}
          >
            {(p) => (
              <Input
                {...p}
                name="endDate"
                type="date"
                defaultValue={dateValue(role?.endDate ?? null)}
              />
            )}
          </Field>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <Checkbox
          id={`isCurrent-${role?.id ?? "new"}`}
          name="isCurrent"
          value="true"
          defaultChecked={role?.isCurrent}
        />
        <Label
          htmlFor={`isCurrent-${role?.id ?? "new"}`}
          className="cursor-pointer normal-case"
        >
          This is my current role
        </Label>
      </div>

      <Field
        id={`summary-${role?.id ?? "new"}`}
        label="What you own here"
        hint="A couple of sentences. Specific accomplishments go in the accomplishment bank."
        error={errors.summary}
      >
        {(p) => (
          <Textarea
            {...p}
            name="summary"
            rows={4}
            defaultValue={role?.summary}
          />
        )}
      </Field>
    </>
  );
}

export function EmploymentSection({
  hasProfile,
  employments,
}: {
  hasProfile: boolean;
  employments: Employment[];
}) {
  if (!hasProfile) {
    return (
      <EmptyState
        icon={<Briefcase />}
        title="Save your basics first"
        description="Employment history attaches to your profile, so the Basics tab needs a name before you can add roles."
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
                Add role
              </Button>
            </DialogTrigger>
          }
          title="Add a role"
          action={saveEmploymentAction}
          successMessage="Role added."
          wide
        >
          {(errors) => <EmploymentFields errors={errors} />}
        </EntityDialog>
      </div>

      {employments.length === 0 ? (
        <EmptyState
          icon={<Briefcase />}
          title="No employment history yet"
          description="Add the roles you would list on a resume. Fit scoring and cover letters both draw on these."
        />
      ) : (
        <div className="space-y-3">
          {employments.map((role) => (
            <Card key={role.id}>
              <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-ink text-sm font-medium">
                    {role.title}
                    <span className="text-ink-muted font-normal">
                      {" "}
                      · {role.company}
                    </span>
                  </p>
                  <p className="text-ink-subtle mt-0.5 font-mono text-xs">
                    {formatRange(role)}
                    {role.location ? ` · ${role.location}` : ""}
                  </p>
                  {role.summary ? (
                    <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                      {role.summary}
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
                    title="Edit role"
                    action={saveEmploymentAction}
                    successMessage="Role updated."
                    wide
                  >
                    {(errors) => (
                      <EmploymentFields role={role} errors={errors} />
                    )}
                  </EntityDialog>

                  <DeleteButton
                    label="Delete"
                    successMessage="Role deleted."
                    onDelete={() => deleteEmploymentAction(role.id)}
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
