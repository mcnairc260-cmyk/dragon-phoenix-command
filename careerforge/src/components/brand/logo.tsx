import { cn } from "@/lib/utils";

/** An anvil-and-spark mark: forging, not fireworks. */
export function Logo({ className }: { className?: string }) {
  return (
    <span className={cn("inline-flex items-center gap-2", className)}>
      <svg
        viewBox="0 0 24 24"
        aria-hidden="true"
        className="size-5 shrink-0"
        fill="none"
      >
        <path
          d="M3 10h11.5a4.5 4.5 0 0 0 4.2-2.9L19 6"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinecap="round"
          className="text-ink"
        />
        <path
          d="M6 10v2.2c0 1.6-.9 3-2.3 3.7L3 16.3V18h13v-1.7l-.7-.4A4.2 4.2 0 0 1 13 12.2V10"
          stroke="currentColor"
          strokeWidth="1.7"
          strokeLinejoin="round"
          className="text-ink"
        />
        <circle cx="19.5" cy="4.5" r="1.6" className="fill-accent" />
      </svg>
      <span className="text-ink text-[0.95rem] font-semibold tracking-tight">
        Career<span className="text-accent">Forge</span>
      </span>
    </span>
  );
}
