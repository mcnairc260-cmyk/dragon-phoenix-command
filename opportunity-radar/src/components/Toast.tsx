import { useToasts } from '../state/AppState';

export function ToastViewport() {
  const { toasts } = useToasts();
  return (
    <div
      aria-live="polite"
      role="status"
      className="pointer-events-none fixed bottom-16 left-1/2 z-50 flex w-full max-w-sm -translate-x-1/2 flex-col items-center gap-2 px-4 sm:bottom-6"
    >
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className="rounded-lg bg-ink px-4 py-2.5 text-sm font-medium text-on-ink shadow-card-hover"
        >
          {toast.text}
        </div>
      ))}
    </div>
  );
}
