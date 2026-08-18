"use client";

import * as React from "react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FormError } from "@/components/forms/field";
import { SubmitButton } from "@/components/forms/submit-button";
import { useToast } from "@/components/ui/toast";
import type { ActionResult } from "@/lib/server/actions/result";

type Action = (
  prev: ActionResult | null,
  formData: FormData,
) => Promise<ActionResult>;

/**
 * A create/edit dialog driven by a server action.
 *
 * Closing on success — rather than leaving the user to dismiss a dialog whose
 * work is already done — removes one of the small decisions that add up when
 * you are filling in a whole career history in one sitting.
 */
export function EntityDialog({
  trigger,
  title,
  description,
  action,
  successMessage,
  children,
  submitLabel = "Save",
  wide,
}: {
  trigger: React.ReactNode;
  title: string;
  description?: string;
  action: Action;
  successMessage: string;
  submitLabel?: string;
  wide?: boolean;
  children: (fieldErrors: Record<string, string>) => React.ReactNode;
}) {
  const [open, setOpen] = React.useState(false);
  const { toast } = useToast();

  // Success handling lives in the action itself rather than an effect watching
  // its result: the dialog closes as part of the same transition that saved,
  // instead of after an extra render pass.
  const [state, formAction] = React.useActionState<
    ActionResult | null,
    FormData
  >(async (prev, formData) => {
    const result = await action(prev, formData);
    if (result.ok) {
      setOpen(false);
      toast(successMessage, "success");
    }
    return result;
  }, null);

  const fieldErrors = state && !state.ok ? (state.fieldErrors ?? {}) : {};

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      {trigger}
      <DialogContent className={wide ? "max-w-2xl" : undefined}>
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>

        <form action={formAction} className="space-y-4">
          {state && !state.ok && !state.fieldErrors ? (
            <FormError message={state.error} />
          ) : null}

          {children(fieldErrors)}

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
            >
              Cancel
            </Button>
            <SubmitButton>{submitLabel}</SubmitButton>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Delete with an inline confirm step. A second click is enough friction to
 * prevent an accidental delete without adding a modal to every row.
 */
export function DeleteButton({
  onDelete,
  label,
  confirmLabel = "Confirm delete",
  successMessage,
}: {
  onDelete: () => Promise<ActionResult>;
  label: string;
  confirmLabel?: string;
  successMessage: string;
}) {
  const [armed, setArmed] = React.useState(false);
  const [pending, setPending] = React.useState(false);
  const { toast } = useToast();

  React.useEffect(() => {
    if (!armed) return;
    const timer = window.setTimeout(() => setArmed(false), 5000);
    return () => window.clearTimeout(timer);
  }, [armed]);

  async function handleClick() {
    if (!armed) {
      setArmed(true);
      return;
    }
    setPending(true);
    const result = await onDelete();
    setPending(false);
    setArmed(false);
    toast(
      result.ok ? successMessage : result.error,
      result.ok ? "success" : "error",
    );
  }

  return (
    <Button
      type="button"
      variant={armed ? "destructive" : "ghost"}
      size="sm"
      disabled={pending}
      onClick={handleClick}
    >
      {pending ? "Deleting…" : armed ? confirmLabel : label}
    </Button>
  );
}
