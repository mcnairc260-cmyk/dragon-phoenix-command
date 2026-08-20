import type { Activity } from "@prisma/client";
import { History } from "lucide-react";

import { EmptyState } from "@/components/ui/empty-state";

export function ActivityTimeline({ activities }: { activities: Activity[] }) {
  if (activities.length === 0) {
    return (
      <EmptyState
        icon={<History />}
        title="Nothing recorded yet"
        description="Status changes, analyses, generated drafts, and follow-ups all land here automatically."
      />
    );
  }

  return (
    <ol className="border-line space-y-0 border-l pl-5">
      {activities.map((activity) => (
        <li key={activity.id} className="relative pb-5 last:pb-0">
          <span
            aria-hidden
            className="bg-accent absolute top-1.5 -left-[1.4375rem] size-1.5 rounded-full"
          />
          <p className="text-ink text-sm">{activity.message}</p>
          <p className="text-ink-subtle mt-0.5 font-mono text-xs">
            {activity.createdAt.toLocaleString(undefined, {
              dateStyle: "medium",
              timeStyle: "short",
            })}
          </p>
        </li>
      ))}
    </ol>
  );
}
