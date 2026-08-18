import * as React from "react";

import { cn } from "@/lib/utils";

export const Input = React.forwardRef<
  HTMLInputElement,
  React.InputHTMLAttributes<HTMLInputElement>
>(({ className, type, ...props }, ref) => (
  <input
    ref={ref}
    type={type}
    className={cn(
      "bg-surface-sunken border-line text-ink placeholder:text-ink-subtle flex h-9 w-full rounded-md border px-3 py-1 text-sm transition-colors",
      "hover:border-line-strong focus-visible:border-accent",
      "disabled:cursor-not-allowed disabled:opacity-50",
      "file:border-0 file:bg-transparent file:text-sm file:font-medium",
      "aria-[invalid=true]:border-critical",
      className,
    )}
    {...props}
  />
));
Input.displayName = "Input";
