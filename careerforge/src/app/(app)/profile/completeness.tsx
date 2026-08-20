import { Check } from "lucide-react";

import { profileChecklist } from "@/lib/domain/profile-completeness";
import { cn } from "@/lib/utils";

type ProfileWithCounts = {
  fullName: string;
  targetRoles: string[];
  masterResume: string;
  employments: unknown[];
  skills: unknown[];
  accomplishments: unknown[];
};

export function ProfileCompleteness({
  profile,
  className,
}: {
  profile: ProfileWithCounts;
  className?: string;
}) {
  const items = profileChecklist({
    fullName: profile.fullName,
    targetRoles: profile.targetRoles,
    masterResume: profile.masterResume,
    employmentCount: profile.employments.length,
    skillCount: profile.skills.length,
    accomplishmentCount: profile.accomplishments.length,
  });

  const done = items.filter((i) => i.done).length;
  const complete = done === items.length;

  return (
    <div
      className={cn(
        "bg-surface border-line rounded-lg border px-4 py-3.5",
        className,
      )}
    >
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <p className="text-ink text-sm font-medium">
          {complete
            ? "Profile is complete"
            : `Profile: ${done} of ${items.length} pieces in place`}
        </p>
        <p className="text-ink-subtle text-xs">
          {complete
            ? "Generated material has everything it needs."
            : "Generated material only uses what is filled in."}
        </p>
      </div>

      <ul className="mt-3 flex flex-wrap gap-x-4 gap-y-1.5">
        {items.map((item) => (
          <li
            key={item.label}
            className={cn(
              "flex items-center gap-1.5 text-xs",
              item.done ? "text-ink-muted" : "text-ink-subtle",
            )}
          >
            <span
              aria-hidden
              className={cn(
                "grid size-3.5 shrink-0 place-items-center rounded-full border",
                item.done
                  ? "border-positive/50 bg-positive-soft text-positive"
                  : "border-line-strong",
              )}
            >
              {item.done ? (
                <Check className="size-2.5" strokeWidth={3} />
              ) : null}
            </span>
            <span
              className={item.done ? "line-through decoration-1" : undefined}
            >
              {item.label}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}
