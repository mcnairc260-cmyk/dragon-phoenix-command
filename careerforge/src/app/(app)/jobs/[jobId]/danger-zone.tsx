"use client";

import type { JobStatus } from "@prisma/client";
import { useRouter } from "next/navigation";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useToast } from "@/components/ui/toast";
import { archiveJobAction, deleteJobAction } from "@/lib/server/actions/jobs";
import { cn } from "@/lib/utils";

/**
 * Archive and delete are separated on purpose. Archiving is the reversible
 * option and is offered first; deleting takes an explicit modal because it
 * takes the analysis, drafts, and history with it.
 */
export function JobDangerZone({
  jobId,
  status,
  className,
}: {
  jobId: string;
  status: JobStatus;
  className?: string;
}) {
  const router = useRouter();
  const { toast } = useToast();
  const [pending, setPending] = React.useState(false);

  async function archive() {
    setPending(true);
    const result = await archiveJobAction(jobId);
    setPending(false);
    toast(
      result.ok ? "Opportunity archived." : result.error,
      result.ok ? "success" : "error",
    );
  }

  async function remove() {
    setPending(true);
    const result = await deleteJobAction(jobId);
    setPending(false);
    if (result.ok) {
      toast("Opportunity deleted.", "success");
      router.push("/jobs");
    } else {
      toast(result.error, "error");
    }
  }

  return (
    <div
      className={cn(
        "border-line flex flex-col gap-3 rounded-lg border border-dashed p-4 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <div>
        <p className="text-ink text-sm font-medium">Close this out</p>
        <p className="text-ink-muted mt-1 text-sm leading-relaxed">
          Archiving keeps the record and its analytics. Deleting removes the
          analysis, every generated draft, and the activity history.
        </p>
      </div>

      <div className="flex shrink-0 gap-2">
        {status !== "ARCHIVED" ? (
          <Button
            variant="secondary"
            disabled={pending}
            onClick={() => void archive()}
          >
            Archive
          </Button>
        ) : null}

        <Dialog>
          <DialogTrigger asChild>
            <Button variant="destructive" disabled={pending}>
              Delete
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Delete this opportunity?</DialogTitle>
              <DialogDescription>
                This removes the posting, its fit analysis, every generated
                draft, and the activity history. It cannot be undone. If you
                only want it out of the way, archive it instead.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost">Keep it</Button>
              </DialogClose>
              <Button
                variant="destructive"
                disabled={pending}
                onClick={() => void remove()}
              >
                {pending ? "Deleting…" : "Delete permanently"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
}
