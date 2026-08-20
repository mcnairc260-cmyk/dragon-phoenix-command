"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
import { saveJobNotesAction } from "@/lib/server/actions/jobs";
import { useAutosave } from "@/lib/hooks/use-autosave";

export function NotesEditor({
  jobId,
  initialNotes,
}: {
  jobId: string;
  initialNotes: string;
}) {
  const [notes, setNotes] = React.useState(initialNotes);

  const { status, error } = useAutosave({
    value: notes,
    initialValue: initialNotes,
    save: React.useCallback(
      (value: string) => saveJobNotesAction(jobId, value),
      [jobId],
    ),
  });

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3">
          <div>
            <CardTitle>Notes</CardTitle>
            <CardDescription>
              Saves as you type. No save button to remember.
            </CardDescription>
          </div>
          <SaveIndicator status={status} error={error} />
        </div>
      </CardHeader>
      <CardContent>
        <Textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          rows={10}
          aria-label="Notes about this opportunity"
          placeholder="Who you spoke to, what they said, what you promised to send."
        />
      </CardContent>
    </Card>
  );
}

export function SaveIndicator({
  status,
  error,
}: {
  status: "idle" | "saving" | "saved" | "error";
  error?: string | null;
}) {
  return (
    <p
      role="status"
      aria-live="polite"
      className="text-ink-subtle flex shrink-0 items-center gap-1.5 text-xs"
    >
      {status === "saving" ? (
        <>
          <Loader2 className="size-3 animate-spin" aria-hidden />
          Saving…
        </>
      ) : status === "saved" ? (
        <>
          <Check className="text-positive size-3" aria-hidden />
          Saved
        </>
      ) : status === "error" ? (
        <span className="text-critical">{error ?? "Could not save"}</span>
      ) : null}
    </p>
  );
}
