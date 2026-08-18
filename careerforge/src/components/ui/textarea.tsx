import * as React from "react";

import { cn } from "@/lib/utils";

export const Textarea = React.forwardRef<
  HTMLTextAreaElement,
  React.TextareaHTMLAttributes<HTMLTextAreaElement>
>(({ className, ...props }, ref) => (
  <textarea
    ref={ref}
    className={cn(
      "bg-surface-sunken border-line text-ink placeholder:text-ink-subtle flex min-h-20 w-full rounded-md border px-3 py-2 text-sm leading-relaxed transition-colors",
      "hover:border-line-strong focus-visible:border-accent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "aria-[invalid=true]:border-critical",
      className,
    )}
    {...props}
  />
));
Textarea.displayName = "Textarea";
