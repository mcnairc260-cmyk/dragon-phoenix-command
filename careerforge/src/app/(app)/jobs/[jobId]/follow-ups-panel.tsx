"use client";

import type { FollowUp, FollowUpChannel } from "@prisma/client";
import { BellRing, Check, Plus } from "lucide-react";
import * as React from "react";

import { EntityDialog } from "@/components/forms/entity-dialog";
import { Field } from "@/components/forms/field";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/toast";
import { daysUntil } from "@/lib/domain/job-filters";
import {
  completeFollowUpAction,
  deleteFollowUpAction,
  saveFollowUpAction,
} from "@/lib/server/actions/jobs";

const CHANNEL_LABEL: Record<FollowUpChannel, string> = {
  EMAIL: "Email",
  LINKEDIN: "LinkedIn",
  PHONE: "Phone",
  PORTAL: "Portal",
  OTHER: "Other",
};

function FollowUpFields({
  jobId,
  errors,
}: {
  jobId: string;
  errors: Record<string, string>;
}) {
  const [channel, setChannel] = React.useState<FollowUpChannel>("EMAIL");
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 3);

  return (
    <>
      <input type="hidden" name="jobId" value={jobId} />
      <input type="hidden" name="channel" value={channel} />

      <div className="grid gap-4 sm:grid-cols-2">
        <Field id="followup-due" label="When" error={errors.dueAt}>
          {(p) => (
            <Input
              {...p}
              name="dueAt"
              type="date"
              required
              defaultValue={tomorrow.toISOString().slice(0, 10)}
            />
          )}
        </Field>

        <Field id="followup-channel" label="How" error={errors.channel}>
          {(p) => (
            <Select
              value={channel}
              onValueChange={(v) => setChannel(v as FollowUpChannel)}
            >
              <SelectTrigger {...p}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(CHANNEL_LABEL).map(([value, label]) => (
                  <SelectItem key={value} value={value}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </Field>
      </div>

      <Field
        id="followup-note"
        label="What to do"
        hint="Write the actual action, not the topic. 'Ask about the settlement rewrite' beats 'follow up'."
        error={errors.note}
      >
        {(p) => (
          <Input
            {...p}
            name="note"
            placeholder="Ask the recruiter whether the loop is scheduled."
          />
        )}
      </Field>
    </>
  );
}

export function FollowUpsPanel({
  jobId,
  followUps,
}: {
  jobId: string;
  followUps: FollowUp[];
}) {
  const { toast } = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);

  const open = followUps.filter((f) => !f.completedAt);
  const done = followUps.filter((f) => f.completedAt);

  async function complete(id: string) {
    setPendingId(id);
    const result = await completeFollowUpAction(id);
    setPendingId(null);
    toast(
      result.ok ? "Follow-up completed." : result.error,
      result.ok ? "success" : "error",
    );
  }

  async function remove(id: string) {
    setPendingId(id);
    const result = await deleteFollowUpAction(id);
    setPendingId(null);
    toast(
      result.ok ? "Follow-up removed." : result.error,
      result.ok ? "success" : "error",
    );
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Follow-ups</CardTitle>
            <CardDescription>
              Overdue follow-ups are what the Today page surfaces first.
            </CardDescription>
          </div>
          <EntityDialog
            trigger={
              <DialogTrigger asChild>
                <Button size="sm" variant="secondary">
                  <Plus />
                  Add
                </Button>
              </DialogTrigger>
            }
            title="Schedule a follow-up"
            action={saveFollowUpAction}
            successMessage="Follow-up scheduled."
          >
            {(errors) => <FollowUpFields jobId={jobId} errors={errors} />}
          </EntityDialog>
        </div>
      </CardHeader>

      <CardContent className="space-y-3">
        {open.length === 0 ? (
          <p className="text-ink-subtle border-line rounded-md border border-dashed px-3 py-6 text-center text-sm">
            <BellRing className="mx-auto mb-2 size-4" aria-hidden />
            Nothing scheduled.
          </p>
        ) : (
          <ul className="space-y-2">
            {open.map((followUp) => {
              const days = daysUntil(followUp.dueAt) ?? 0;
              return (
                <li
                  key={followUp.id}
                  className="border-line bg-surface-sunken flex items-start gap-3 rounded-md border p-3"
                >
                  <div className="min-w-0 flex-1">
                    <p className="text-ink text-sm">
                      {followUp.note || "Follow up"}
                    </p>
                    <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                      <Badge
                        tone={
                          days < 0
                            ? "critical"
                            : days <= 1
                              ? "caution"
                              : "neutral"
                        }
                      >
                        {days < 0
                          ? `${Math.abs(days)}d overdue`
                          : days === 0
                            ? "Due today"
                            : `In ${days}d`}
                      </Badge>
                      <Badge tone="neutral">
                        {CHANNEL_LABEL[followUp.channel]}
                      </Badge>
                    </div>
                  </div>

                  <div className="flex shrink-0 gap-1">
                    <Button
                      size="icon-sm"
                      variant="ghost"
                      aria-label="Mark follow-up complete"
                      disabled={pendingId === followUp.id}
                      onClick={() => void complete(followUp.id)}
                    >
                      <Check />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pendingId === followUp.id}
                      onClick={() => void remove(followUp.id)}
                    >
                      Remove
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        )}

        {done.length > 0 ? (
          <details className="text-ink-muted">
            <summary className="cursor-pointer text-xs">
              {done.length} completed
            </summary>
            <ul className="mt-2 space-y-1">
              {done.map((followUp) => (
                <li key={followUp.id} className="text-ink-subtle text-xs">
                  {followUp.completedAt?.toLocaleDateString()} —{" "}
                  {followUp.note || "Follow up"}
                </li>
              ))}
            </ul>
          </details>
        ) : null}
      </CardContent>
    </Card>
  );
}
