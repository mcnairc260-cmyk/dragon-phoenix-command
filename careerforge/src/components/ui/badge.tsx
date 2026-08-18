import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-xs font-medium whitespace-nowrap",
  {
    variants: {
      tone: {
        neutral: "bg-surface-raised border-line text-ink-muted",
        accent: "bg-accent-soft border-accent/40 text-accent",
        positive: "bg-positive-soft border-positive/40 text-positive",
        caution: "bg-caution-soft border-caution/40 text-caution",
        critical: "bg-critical-soft border-critical/40 text-critical",
        info: "bg-info-soft border-info/40 text-info",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

export function Badge({
  className,
  tone,
  ...props
}: React.HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>) {
  return <span className={cn(badgeVariants({ tone }), className)} {...props} />;
}

export { badgeVariants };
