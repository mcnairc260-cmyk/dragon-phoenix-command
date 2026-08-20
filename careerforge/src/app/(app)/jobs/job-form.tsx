"use client";

import type { JobOpportunity } from "@prisma/client";
import * as React from "react";

import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/toast";
import {
  JOB_STATUS_LABEL,
  JOB_STATUS_ORDER,
  PRIORITY_LABEL,
  PRIORITY_ORDER,
  WORK_MODE_LABEL,
} from "@/lib/domain/constants";
import { saveJobAction } from "@/lib/server/actions/jobs";
import type { ActionResult } from "@/lib/server/actions/result";

function dateValue(date: Date | null | undefined): string {
  return date ? date.toISOString().slice(0, 10) : "";
}

/**
 * One form for both create and edit. Only title, company, and the description
 * really matter — everything else can be filled in later, and saying so up
 * front keeps "add a job" a thirty-second task instead of a form-filling
 * exercise you postpone.
 */
export function JobForm({
  job,
  onSaved,
  onCancel,
}: {
  job?: JobOpportunity;
  onSaved?: (jobId: string) => void;
  onCancel?: () => void;
}) {
  const { toast } = useToast();
  const [state, formAction] = React.useActionState<
    ActionResult<{ jobId: string }> | null,
    FormData
  >(async (prev, formData) => {
    const result = await saveJobAction(prev, formData);
    if (result.ok) {
      toast(job ? "Opportunity updated." : "Opportunity added.", "success");
      onSaved?.(result.data.jobId);
    }
    return result;
  }, null);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  const [status, setStatus] = React.useState(job?.status ?? "DISCOVERED");
  const [priority, setPriority] = React.useState(job?.priority ?? "MEDIUM");
  const [workMode, setWorkMode] = React.useState<string>(
    job?.workMode ?? "unspecified",
  );

  return (
    <form action={formAction} className="space-y-4">
      {job ? <input type="hidden" name="id" value={job.id} /> : null}
      <input type="hidden" name="status" value={status} />
      <input type="hidden" name="priority" value={priority} />
      <input type="hidden" name="workMode" value={workMode} />

      {state && !state.ok && !state.fieldErrors ? (
        <FormError message={state.error} />
      ) : null}

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="job-title" label="Job title" error={errors.title}>
          {(p) => (
            <Input
              {...p}
              name="title"
              required
              autoFocus={!job}
              placeholder="Senior Backend Engineer"
              defaultValue={job?.title}
            />
          )}
        </Field>

        <Field id="job-company" label="Company" error={errors.company}>
          {(p) => (
            <Input
              {...p}
              name="company"
              required
              placeholder="Meridian Financial"
              defaultValue={job?.company}
            />
          )}
        </Field>
      </div>

      <Field id="job-url" label="Posting URL" error={errors.url}>
        {(p) => (
          <Input
            {...p}
            name="url"
            inputMode="url"
            placeholder="https://…"
            defaultValue={job?.url ?? ""}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="job-location" label="Location" error={errors.location}>
          {(p) => (
            <Input
              {...p}
              name="location"
              placeholder="Remote (US)"
              defaultValue={job?.location ?? ""}
            />
          )}
        </Field>

        <Field id="job-workmode" label="Work mode" error={errors.workMode}>
          {(p) => (
            <Select value={workMode} onValueChange={setWorkMode}>
              <SelectTrigger {...p}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="unspecified">Not stated</SelectItem>
                {Object.entries(WORK_MODE_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Field
          id="job-salaryText"
          label="Salary as posted"
          hint="Copy it verbatim."
          error={errors.salaryText}
        >
          {(p) => (
            <Input
              {...p}
              name="salaryText"
              placeholder="$185,000 – $215,000"
              defaultValue={job?.salaryText ?? ""}
            />
          )}
        </Field>
        <Field
          id="job-salaryMin"
          label="Min (numeric)"
          error={errors.salaryMin}
        >
          {(p) => (
            <Input
              {...p}
              name="salaryMin"
              inputMode="numeric"
              placeholder="185000"
              defaultValue={job?.salaryMin ?? ""}
            />
          )}
        </Field>
        <Field
          id="job-salaryMax"
          label="Max (numeric)"
          error={errors.salaryMax}
        >
          {(p) => (
            <Input
              {...p}
              name="salaryMax"
              inputMode="numeric"
              placeholder="215000"
              defaultValue={job?.salaryMax ?? ""}
            />
          )}
        </Field>
      </div>

      <Field
        id="job-description"
        label="Full job description"
        hint="Paste the whole posting. Analysis and every generated draft read from this."
        error={errors.description}
      >
        {(p) => (
          <Textarea
            {...p}
            name="description"
            rows={12}
            className="font-mono text-xs leading-relaxed"
            placeholder="Paste the posting here…"
            defaultValue={job?.description}
          />
        )}
      </Field>

      <div className="grid gap-4 sm:grid-cols-4">
        <Field id="job-status" label="Status" error={errors.status}>
          {(p) => (
            <Select
              value={status}
              onValueChange={(v) => setStatus(v as typeof status)}
            >
              <SelectTrigger {...p}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {JOB_STATUS_ORDER.map((value) => (
                  <SelectItem key={value} value={value}>
                    {JOB_STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field id="job-priority" label="Priority" error={errors.priority}>
          {(p) => (
            <Select
              value={priority}
              onValueChange={(v) => setPriority(v as typeof priority)}
            >
              <SelectTrigger {...p}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {PRIORITY_ORDER.map((value) => (
                  <SelectItem key={value} value={value}>
                    {PRIORITY_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>

        <Field id="job-deadline" label="Deadline" error={errors.deadline}>
          {(p) => (
            <Input
              {...p}
              name="deadline"
              type="date"
              defaultValue={dateValue(job?.deadline)}
            />
          )}
        </Field>

        <Field id="job-source" label="Source" error={errors.source}>
          {(p) => (
            <Input
              {...p}
              name="source"
              placeholder="Referral"
              defaultValue={job?.source ?? ""}
            />
          )}
        </Field>
      </div>

      <Field id="job-notes" label="Notes" error={errors.notes}>
        {(p) => (
          <Textarea
            {...p}
            name="notes"
            rows={3}
            placeholder="Anything you want to remember about this one."
            defaultValue={job?.notes ?? ""}
          />
        )}
      </Field>

      <div className="flex justify-end gap-2">
        {onCancel ? (
          <Button type="button" variant="ghost" onClick={onCancel}>
            Cancel
          </Button>
        ) : null}
        <SubmitButton>{job ? "Save changes" : "Add opportunity"}</SubmitButton>
      </div>
    </form>
  );
}
