"use client";

import * as React from "react";
import type { CandidateProfile } from "@prisma/client";

import { Field, FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { saveProfileAction } from "@/lib/server/actions/profile";
import type { ActionResult } from "@/lib/server/actions/result";
import { WORK_MODE_LABEL } from "@/lib/domain/constants";

export function BasicsForm({
  profile,
  fallbackName,
  fallbackEmail,
}: {
  profile: CandidateProfile | null;
  fallbackName: string | null;
  fallbackEmail: string;
}) {
  const { toast } = useToast();
  const [state, formAction] = React.useActionState<
    ActionResult | null,
    FormData
  >(async (prev, formData) => {
    const result = await saveProfileAction(prev, formData);
    if (result.ok) toast("Profile saved.", "success");
    return result;
  }, null);

  const errors = state && !state.ok ? (state.fieldErrors ?? {}) : {};
  const [workMode, setWorkMode] = React.useState(
    profile?.workMode ?? "FLEXIBLE",
  );

  return (
    <form action={formAction} className="space-y-6">
      {state && !state.ok && !state.fieldErrors ? (
        <FormError message={state.error} />
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Who you are</CardTitle>
          <CardDescription>
            Contact details appear in generated outreach exactly as entered.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field id="fullName" label="Full name" error={errors.fullName}>
            {(p) => (
              <Input
                {...p}
                name="fullName"
                required
                defaultValue={profile?.fullName ?? fallbackName ?? ""}
              />
            )}
          </Field>

          <Field
            id="headline"
            label="Headline"
            hint="One line, the way you would introduce yourself."
            error={errors.headline}
          >
            {(p) => (
              <Input
                {...p}
                name="headline"
                placeholder="Senior backend engineer — payments"
                defaultValue={profile?.headline ?? ""}
              />
            )}
          </Field>

          <Field id="email" label="Contact email" error={errors.email}>
            {(p) => (
              <Input
                {...p}
                name="email"
                type="email"
                defaultValue={profile?.email ?? fallbackEmail}
              />
            )}
          </Field>

          <Field id="phone" label="Phone" error={errors.phone}>
            {(p) => (
              <Input {...p} name="phone" defaultValue={profile?.phone ?? ""} />
            )}
          </Field>

          <Field
            id="location"
            label="Where you are based"
            error={errors.location}
          >
            {(p) => (
              <Input
                {...p}
                name="location"
                placeholder="Portland, OR"
                defaultValue={profile?.location ?? ""}
              />
            )}
          </Field>

          <Field id="linkedIn" label="LinkedIn" error={errors.linkedIn}>
            {(p) => (
              <Input
                {...p}
                name="linkedIn"
                inputMode="url"
                placeholder="https://linkedin.com/in/you"
                defaultValue={profile?.linkedIn ?? ""}
              />
            )}
          </Field>

          <Field id="github" label="GitHub" error={errors.github}>
            {(p) => (
              <Input
                {...p}
                name="github"
                inputMode="url"
                placeholder="https://github.com/you"
                defaultValue={profile?.github ?? ""}
              />
            )}
          </Field>

          <Field
            id="portfolio"
            label="Portfolio or site"
            error={errors.portfolio}
          >
            {(p) => (
              <Input
                {...p}
                name="portfolio"
                inputMode="url"
                placeholder="https://you.dev"
                defaultValue={profile?.portfolio ?? ""}
              />
            )}
          </Field>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>What you are looking for</CardTitle>
          <CardDescription>
            Fit scoring compares every posting against these.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 sm:grid-cols-2">
          <Field
            id="targetRoles"
            label="Target roles"
            hint="One per line, or comma separated."
            error={errors.targetRoles}
          >
            {(p) => (
              <Textarea
                {...p}
                name="targetRoles"
                rows={3}
                placeholder={"Senior Backend Engineer\nStaff Engineer"}
                defaultValue={(profile?.targetRoles ?? []).join("\n")}
              />
            )}
          </Field>

          <Field
            id="preferredLocations"
            label="Preferred locations"
            hint="One per line, or comma separated."
            error={errors.preferredLocations}
          >
            {(p) => (
              <Textarea
                {...p}
                name="preferredLocations"
                rows={3}
                placeholder={"Remote (US)\nSeattle, WA"}
                defaultValue={(profile?.preferredLocations ?? []).join("\n")}
              />
            )}
          </Field>

          <Field id="workMode" label="Work mode" error={errors.workMode}>
            {(p) => (
              <>
                <input type="hidden" name="workMode" value={workMode} />
                <Select
                  value={workMode}
                  onValueChange={(v) =>
                    setWorkMode(v as CandidateProfile["workMode"])
                  }
                >
                  <SelectTrigger {...p}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Object.entries(WORK_MODE_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </>
            )}
          </Field>

          <div className="grid grid-cols-[1fr_1fr_5rem] gap-2">
            <Field
              id="desiredSalaryMin"
              label="Salary min"
              error={errors.desiredSalaryMin}
            >
              {(p) => (
                <Input
                  {...p}
                  name="desiredSalaryMin"
                  inputMode="numeric"
                  placeholder="165000"
                  defaultValue={profile?.desiredSalaryMin ?? ""}
                />
              )}
            </Field>
            <Field
              id="desiredSalaryMax"
              label="Salary max"
              error={errors.desiredSalaryMax}
            >
              {(p) => (
                <Input
                  {...p}
                  name="desiredSalaryMax"
                  inputMode="numeric"
                  placeholder="205000"
                  defaultValue={profile?.desiredSalaryMax ?? ""}
                />
              )}
            </Field>
            <Field
              id="salaryCurrency"
              label="Currency"
              error={errors.salaryCurrency}
            >
              {(p) => (
                <Input
                  {...p}
                  name="salaryCurrency"
                  maxLength={8}
                  defaultValue={profile?.salaryCurrency ?? "USD"}
                />
              )}
            </Field>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Master resume</CardTitle>
          <CardDescription>
            Paste your full resume text. It is context for tailoring, and it is
            never sent anywhere except your configured AI provider.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Field
            id="masterResume"
            label="Resume text"
            error={errors.masterResume}
          >
            {(p) => (
              <Textarea
                {...p}
                name="masterResume"
                rows={14}
                className="font-mono text-xs leading-relaxed"
                defaultValue={profile?.masterResume ?? ""}
              />
            )}
          </Field>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <SubmitButton>Save profile</SubmitButton>
      </div>
    </form>
  );
}
