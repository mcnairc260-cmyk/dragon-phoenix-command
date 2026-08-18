"use client";

import * as React from "react";
import { Check, CircleAlert, Info, X } from "lucide-react";

import { cn } from "@/lib/utils";

type ToastTone = "default" | "success" | "error";

type Toast = { id: number; message: string; tone: ToastTone };

const ToastContext = React.createContext<{
  toast: (message: string, tone?: ToastTone) => void;
} | null>(null);

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);
  const nextId = React.useRef(0);

  const dismiss = React.useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = React.useCallback(
    (message: string, tone: ToastTone = "default") => {
      const id = nextId.current++;
      setToasts((prev) => [...prev, { id, message, tone }]);
      window.setTimeout(() => dismiss(id), 4500);
    },
    [dismiss],
  );

  const value = React.useMemo(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        role="status"
        aria-live="polite"
        className="pointer-events-none fixed right-4 bottom-4 z-[100] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-2"
      >
        {toasts.map((t) => (
          <div
            key={t.id}
            className={cn(
              "fade-in bg-surface-raised border-line text-ink pointer-events-auto flex items-start gap-2.5 rounded-md border px-3.5 py-3 text-sm shadow-lg",
              t.tone === "success" && "border-positive/40",
              t.tone === "error" && "border-critical/40",
            )}
          >
            {t.tone === "success" ? (
              <Check className="text-positive mt-0.5 size-4 shrink-0" />
            ) : t.tone === "error" ? (
              <CircleAlert className="text-critical mt-0.5 size-4 shrink-0" />
            ) : (
              <Info className="text-info mt-0.5 size-4 shrink-0" />
            )}
            <span className="flex-1 leading-snug">{t.message}</span>
            <button
              type="button"
              onClick={() => dismiss(t.id)}
              aria-label="Dismiss notification"
              className="text-ink-subtle hover:text-ink -mr-1 transition-colors"
            >
              <X className="size-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be used within a ToastProvider");
  return ctx;
}
