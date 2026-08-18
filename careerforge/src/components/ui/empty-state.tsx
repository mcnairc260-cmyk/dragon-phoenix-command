import * as React from "react";

import { cn } from "@/lib/utils";

export function EmptyState({
  icon,
  title,
  description,
  action,
  className,
}: {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border-line flex flex-col items-center justify-center rounded-lg border border-dashed px-6 py-14 text-center",
        className,
      )}
    >
      {icon ? (
        <div className="bg-surface-raised text-ink-subtle mb-4 grid size-11 place-items-center rounded-full [&_svg]:size-5">
          {icon}
        </div>
      ) : null}
      <p className="text-ink text-sm font-medium">{title}</p>
      {description ? (
        <p className="text-ink-muted mt-1.5 max-w-sm text-sm leading-relaxed">
          {description}
        </p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
