"use client";

import type { FocusTask } from "@prisma/client";
import { Check, Pause, Play, RotateCcw } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FOCUS_DURATIONS } from "@/lib/domain/constants";
import { cn } from "@/lib/utils";

function format(totalSeconds: number): string {
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
}

/**
 * A focus session timer.
 *
 * It counts down and then stops. There is no streak, no score, no confetti,
 * and no penalty for stopping early — the point is to make starting cheap,
 * not to build a habit loop around the app itself. Finishing shows a quiet
 * line of text and the option to mark the task done.
 */
export function FocusTimer({
  task,
  onClose,
  onComplete,
}: {
  task: FocusTask;
  onClose: () => void;
  onComplete: () => void;
}) {
  const startingMinutes = (FOCUS_DURATIONS as readonly number[]).includes(
    task.estimatedMinutes,
  )
    ? task.estimatedMinutes
    : 15;

  const [minutes, setMinutes] = React.useState(startingMinutes);
  const [remaining, setRemaining] = React.useState(startingMinutes * 60);
  const [running, setRunning] = React.useState(true);

  React.useEffect(() => {
    if (!running || remaining <= 0) return;

    // Anchored to wall-clock time rather than counting ticks, so a backgrounded
    // tab (where timers are throttled) still shows the right number on return.
    const endsAt = Date.now() + remaining * 1000;
    const id = window.setInterval(() => {
      setRemaining(Math.max(0, Math.round((endsAt - Date.now()) / 1000)));
    }, 250);

    return () => window.clearInterval(id);
  }, [running, remaining]);

  const finished = remaining === 0;
  const elapsed = minutes * 60 - remaining;
  const progress = minutes > 0 ? elapsed / (minutes * 60) : 0;

  function choose(next: number) {
    setMinutes(next);
    setRemaining(next * 60);
    setRunning(true);
  }

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>Focus session</DialogTitle>
          <DialogDescription>{task.title}</DialogDescription>
        </DialogHeader>

        <div className="flex flex-col items-center gap-5 py-2">
          <div className="relative grid size-40 place-items-center">
            <svg
              viewBox="0 0 100 100"
              className="absolute inset-0 -rotate-90"
              aria-hidden
            >
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                strokeWidth="4"
                className="stroke-line"
              />
              <circle
                cx="50"
                cy="50"
                r="45"
                fill="none"
                strokeWidth="4"
                strokeLinecap="round"
                className={finished ? "stroke-positive" : "stroke-accent"}
                strokeDasharray={2 * Math.PI * 45}
                strokeDashoffset={2 * Math.PI * 45 * (1 - progress)}
                style={{ transition: "stroke-dashoffset 250ms linear" }}
              />
            </svg>
            <p
              role="timer"
              aria-live="off"
              className={cn(
                "font-mono text-3xl tabular-nums",
                finished ? "text-positive" : "text-ink",
              )}
            >
              {format(remaining)}
            </p>
          </div>

          {finished ? (
            <p role="status" className="text-ink text-center text-sm">
              Session finished. Whatever got done, got done.
            </p>
          ) : (
            <div className="flex gap-1.5">
              {FOCUS_DURATIONS.map((option) => (
                <Button
                  key={option}
                  size="sm"
                  variant={minutes === option ? "secondary" : "ghost"}
                  aria-pressed={minutes === option}
                  onClick={() => choose(option)}
                >
                  {option}m
                </Button>
              ))}
            </div>
          )}

          <div className="flex flex-wrap justify-center gap-2">
            {!finished ? (
              <Button variant="secondary" onClick={() => setRunning((r) => !r)}>
                {running ? <Pause /> : <Play />}
                {running ? "Pause" : "Resume"}
              </Button>
            ) : null}

            <Button variant="ghost" onClick={() => choose(minutes)}>
              <RotateCcw />
              Reset
            </Button>

            {task.href ? (
              <Button variant="ghost" asChild>
                <Link href={task.href}>Open the task</Link>
              </Button>
            ) : null}

            <Button onClick={onComplete}>
              <Check />
              Mark done
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
