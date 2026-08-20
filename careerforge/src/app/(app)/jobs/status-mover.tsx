"use client";

import type { JobStatus } from "@prisma/client";
import { ChevronDown } from "lucide-react";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useToast } from "@/components/ui/toast";
import { JOB_STATUS_LABEL, JOB_STATUS_ORDER } from "@/lib/domain/constants";
import { updateJobStatusAction } from "@/lib/server/actions/jobs";

/**
 * Status changes go through a menu rather than drag-and-drop. Dragging is
 * pleasant with a mouse and hostile with a keyboard, a touchscreen, or a
 * tremor — and this is the single most-repeated action in the app.
 */
export function StatusMover({
  jobId,
  status,
  variant = "compact",
}: {
  jobId: string;
  status: JobStatus;
  variant?: "compact" | "full";
}) {
  const [pending, startTransition] = React.useTransition();
  const { toast } = useToast();

  function move(next: JobStatus) {
    startTransition(async () => {
      const result = await updateJobStatusAction(jobId, next);
      toast(
        result.ok ? `Moved to ${JOB_STATUS_LABEL[next]}.` : result.error,
        result.ok ? "success" : "error",
      );
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant={variant === "full" ? "secondary" : "ghost"}
          size={variant === "full" ? "default" : "sm"}
          disabled={pending}
        >
          {variant === "full" ? JOB_STATUS_LABEL[status] : "Move"}
          <ChevronDown />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuLabel>Move to</DropdownMenuLabel>
        {JOB_STATUS_ORDER.map((value) => (
          <DropdownMenuItem
            key={value}
            disabled={value === status}
            onSelect={() => move(value)}
          >
            {JOB_STATUS_LABEL[value]}
            {value === status ? " (current)" : ""}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
