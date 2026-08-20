"use client";

import type { FocusTask } from "@prisma/client";
import { Check, Clock, MoonStar, PartyPopper } from "lucide-react";
import Link from "next/link";
import * as React from "react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/components/ui/toast";
import { describeMinutes } from "@/lib/domain/focus";
import {
  completeFocusTaskAction,
  dismissFocusTaskAction,
  snoozeFocusTaskAction,
} from "@/lib/server/actions/focus";
import { cn } from "@/lib/utils";

import { FocusTimer } from "./focus-timer";

export function FocusList({
  tasks,
  completedToday,
}: {
  tasks: FocusTask[];
  completedToday: number;
}) {
  const { toast } = useToast();
  const [pendingId, setPendingId] = React.useState<string | null>(null);
  const [timerFor, setTimerFor] = React.useState<FocusTask | null>(null);

  async function act(
    task: FocusTask,
    run: () => Promise<{ ok: boolean; error?: string }>,
    successMessage: string,
  ) {
    setPendingId(task.id);
    const result = await run();
    setPendingId(null);
    if (result.ok) {
      if (timerFor?.id === task.id) setTimerFor(null);
      toast(successMessage, "success");
    } else {
      toast(result.error ?? "That did not work.", "error");
    }
  }

  if (tasks.length === 0) {
    return (
      <Card className="mt-6">
        <CardContent className="flex flex-col items-center gap-3 px-6 py-12 text-center">
          <div className="bg-positive-soft text-positive grid size-11 place-items-center rounded-full">
            <PartyPopper className="size-5" aria-hidden />
          </div>
          <div>
            <p className="text-ink text-sm font-medium">
              {completedToday > 0
                ? `That is ${completedToday} done today. Nothing else is pressing.`
                : "Nothing needs doing right now."}
            </p>
            <p className="text-ink-muted mx-auto mt-1.5 max-w-md text-sm leading-relaxed">
              New actions appear as deadlines approach, follow-ups come due, or
              opportunities go quiet. Adding a job is a good use of the gap.
            </p>
          </div>
          <div className="mt-1 flex gap-2">
            <Button variant="secondary" asChild>
              <Link href="/jobs">Open the pipeline</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="mt-6 space-y-3">
      {completedToday > 0 ? (
        <p className="text-ink-muted flex items-center gap-1.5 text-xs">
          <Check className="text-positive size-3.5" aria-hidden />
          {completedToday} completed today.
        </p>
      ) : null}

      <ol className="space-y-3">
        {tasks.map((task, index) => {
          const busy = pendingId === task.id;
          return (
            <li key={task.id}>
              <Card
                className={cn(
                  "transition-colors",
                  index === 0 && "border-accent/40",
                )}
              >
                <CardContent className="p-5">
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start">
                    <span
                      aria-hidden
                      className={cn(
                        "grid size-7 shrink-0 place-items-center rounded-full font-mono text-xs",
                        index === 0
                          ? "bg-accent text-accent-ink"
                          : "bg-surface-raised text-ink-muted",
                      )}
                    >
                      {index + 1}
                    </span>

                    <div className="min-w-0 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <h2 className="text-ink text-sm font-medium">
                          {task.title}
                        </h2>
                        <Badge tone="neutral">
                          <Clock className="size-3" aria-hidden />
                          {describeMinutes(task.estimatedMinutes)}
                        </Badge>
                      </div>

                      <p className="text-ink-muted mt-1.5 text-sm leading-relaxed">
                        {task.rationale}
                      </p>

                      <div className="mt-4 flex flex-wrap gap-2">
                        {task.href ? (
                          <Button size="sm" asChild>
                            <Link href={task.href}>Open it</Link>
                          </Button>
                        ) : null}

                        <Button
                          size="sm"
                          variant="secondary"
                          onClick={() => setTimerFor(task)}
                          disabled={busy}
                        >
                          <Clock />
                          Start focus session
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              task,
                              () => completeFocusTaskAction(task.id),
                              "Done. Nice.",
                            )
                          }
                        >
                          <Check />
                          Mark done
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              task,
                              () => snoozeFocusTaskAction(task.id, 24),
                              "Snoozed until tomorrow.",
                            )
                          }
                        >
                          <MoonStar />
                          Not today
                        </Button>

                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-ink-subtle ml-auto"
                          disabled={busy}
                          onClick={() =>
                            void act(
                              task,
                              () => dismissFocusTaskAction(task.id),
                              "Dismissed.",
                            )
                          }
                        >
                          Dismiss
                        </Button>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </li>
          );
        })}
      </ol>

      {timerFor ? (
        <FocusTimer
          task={timerFor}
          onClose={() => setTimerFor(null)}
          onComplete={() =>
            void act(
              timerFor,
              () => completeFocusTaskAction(timerFor.id),
              "Done. Nice.",
            )
          }
        />
      ) : null}
    </div>
  );
}
