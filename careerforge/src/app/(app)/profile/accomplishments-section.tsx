"use client";

import type { Accomplishment } from "@prisma/client";
import { Plus, Trophy } from "lucide-react";
import * as React from "react";

import { DeleteButton, EntityDialog } from "@/components/forms/entity-dialog";
import { Field } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { DialogTrigger } from "@/components/ui/dialog";
import { EmptyState } from "@/components/ui/empty-state";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  deleteAccomplishmentAction,
  saveAccomplishmentAction,
} from "@/lib/server/actions/profile";

type EmploymentOption = { id: string; label: string };

function AccomplishmentFields({
  item,
  errors,
  employmentOptions,
}: {
  item?: Accomplishment;
  errors: Record<string, string>;
  employmentOptions: EmploymentOption[];
}) {
  const key = item?.id ?? "new";
  const [employmentId, setEmploymentId] = React.useState(
    item?.employmentId ?? "none",
  );

  return (
    <>
      {item ? <input type="hidden" name="id" value={item.id} /> : null}
      <input type="hidden" name="employmentId" value={employmentId} />

      <Field
        id={`title-acc-${key}`}
        label="Title"
        hint="How you would refer to this in conversation."
        error={errors.title}
      >
        {(p) => (
          <Input
            {...p}
            name="title"
            required
            placeholder="Removed the single-writer bottleneck from the ledger"
            defaultValue={item?.title}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`situation-${key}`}
          label="Situation"
          error={errors.situation}
        >
          {(p) => (
            <Textarea
              {...p}
              name="situation"
              rows={3}
              placeholder="What was going wrong or needed doing?"
              defaultValue={item?.situation}
            />
          )}
        </Field>
        <Field id={`task-${key}`} label="Task" error={errors.task}>
          {(p) => (
            <Textarea
              {...p}
              name="task"
              rows={3}
              placeholder="What were you specifically responsible for?"
              defaultValue={item?.task}
            />
          )}
        </Field>
        <Field id={`action-${key}`} label="Action" error={errors.action}>
          {(p) => (
            <Textarea
              {...p}
              name="action"
              rows={3}
              placeholder="What did you actually do?"
              defaultValue={item?.action}
            />
          )}
        </Field>
        <Field id={`result-${key}`} label="Result" error={errors.result}>
          {(p) => (
            <Textarea
              {...p}
              name="result"
              rows={3}
              placeholder="What changed because of it?"
              defaultValue={item?.result}
            />
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field
          id={`metric-${key}`}
          label="Headline metric"
          hint="Only if you can defend the number. Left blank is better than approximated."
          error={errors.metric}
        >
          {(p) => (
            <Input
              {...p}
              name="metric"
              placeholder="4h → 40m settlement runtime"
              defaultValue={item?.metric ?? ""}
            />
          )}
        </Field>

        <Field
          id={`employment-${key}`}
          label="Which role"
          error={errors.employmentId}
        >
          {(p) => (
            <Select value={employmentId} onValueChange={setEmploymentId}>
              <SelectTrigger {...p}>
                <SelectValue placeholder="Not tied to a role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Not tied to a role</SelectItem>
                {employmentOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field
          id={`skillTags-${key}`}
          label="Skills demonstrated"
          hint="Comma separated. Used to pick which accomplishments fit a given job."
          error={errors.skillTags}
        >
          {(p) => (
            <Input
              {...p}
              name="skillTags"
              placeholder="PostgreSQL, Go, Payments"
              defaultValue={(item?.skillTags ?? []).join(", ")}
            />
          )}
        </Field>

        <Field
          id={`categories-${key}`}
          label="Categories"
          hint="Comma separated, e.g. Backend, Leadership."
          error={errors.categories}
        >
          {(p) => (
            <Input
              {...p}
              name="categories"
              placeholder="Backend, Platform"
              defaultValue={(item?.categories ?? []).join(", ")}
            />
          )}
        </Field>
      </div>
    </>
  );
}

export function AccomplishmentsSection({
  hasProfile,
  accomplishments,
  employmentOptions,
}: {
  hasProfile: boolean;
  accomplishments: Accomplishment[];
  employmentOptions: EmploymentOption[];
}) {
  const [query, setQuery] = React.useState("");

  if (!hasProfile) {
    return (
      <EmptyState
        icon={<Trophy />}
        title="Save your basics first"
        description="Accomplishments attach to your profile, so the Basics tab needs a name before you can add them."
      />
    );
  }

  const needle = query.trim().toLowerCase();
  const visible = needle
    ? accomplishments.filter((a) =>
        [a.title, a.result, ...a.skillTags, ...a.categories]
          .join(" ")
          .toLowerCase()
          .includes(needle),
      )
    : accomplishments;

  return (
    <div className="space-y-4">
      <div className="bg-accent-soft border-accent/30 text-ink rounded-lg border px-4 py-3 text-sm leading-relaxed">
        This is the bank every cover letter and resume bullet draws from.
        Generated material quotes these and nothing else — which is exactly why
        it cannot invent a metric you never achieved.
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <Input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search accomplishments…"
          aria-label="Search accomplishments"
          className="sm:max-w-xs"
        />
        <EntityDialog
          trigger={
            <DialogTrigger asChild>
              <Button size="sm">
                <Plus />
                Add accomplishment
              </Button>
            </DialogTrigger>
          }
          title="Add an accomplishment"
          description="Situation, task, action, result. Fill in what you can — partial entries are still usable."
          action={saveAccomplishmentAction}
          successMessage="Accomplishment added."
          wide
        >
          {(errors) => (
            <AccomplishmentFields
              errors={errors}
              employmentOptions={employmentOptions}
            />
          )}
        </EntityDialog>
      </div>

      {accomplishments.length === 0 ? (
        <EmptyState
          icon={<Trophy />}
          title="The accomplishment bank is empty"
          description="Add three to start. Each one gets reused across every application, so this is the highest-leverage thing on the profile."
        />
      ) : visible.length === 0 ? (
        <EmptyState
          title="Nothing matches that search"
          description="Try a skill name or a company instead."
        />
      ) : (
        <div className="space-y-3">
          {visible.map((item) => (
            <Card key={item.id}>
              <CardContent className="p-5">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <p className="text-ink text-sm font-medium">{item.title}</p>
                    {item.metric ? (
                      <p className="text-accent mt-1 font-mono text-xs">
                        {item.metric}
                      </p>
                    ) : null}
                    {item.result ? (
                      <p className="text-ink-muted mt-2 text-sm leading-relaxed">
                        {item.result}
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
                      title="Edit accomplishment"
                      action={saveAccomplishmentAction}
                      successMessage="Accomplishment updated."
                      wide
                    >
                      {(errors) => (
                        <AccomplishmentFields
                          item={item}
                          errors={errors}
                          employmentOptions={employmentOptions}
                        />
                      )}
                    </EntityDialog>

                    <DeleteButton
                      label="Delete"
                      successMessage="Accomplishment deleted."
                      onDelete={() => deleteAccomplishmentAction(item.id)}
                    />
                  </div>
                </div>

                {item.skillTags.length || item.categories.length ? (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {item.skillTags.map((tag) => (
                      <Badge key={`s-${tag}`} tone="accent">
                        {tag}
                      </Badge>
                    ))}
                    {item.categories.map((tag) => (
                      <Badge key={`c-${tag}`} tone="neutral">
                        {tag}
                      </Badge>
                    ))}
                  </div>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
