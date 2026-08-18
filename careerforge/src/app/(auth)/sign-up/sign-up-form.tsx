"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert } from "lucide-react";

import { signUpAction, type FormState } from "@/lib/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: FormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Creating account…" : "Create account"}
    </Button>
  );
}

export function SignUpForm() {
  const [state, formAction] = useActionState(signUpAction, initialState);

  return (
    <form action={formAction} className="mt-7 space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="name">Name</Label>
        <Input
          id="name"
          name="name"
          autoComplete="name"
          required
          autoFocus
          placeholder="Alex Rivera"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="email">Email</Label>
        <Input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="password">Password</Label>
        <Input
          id="password"
          name="password"
          type="password"
          autoComplete="new-password"
          required
          minLength={10}
          aria-describedby="password-hint"
        />
        <p id="password-hint" className="text-ink-subtle text-xs">
          At least 10 characters. A short phrase beats a clever word.
        </p>
      </div>

      {state.error ? (
        <p role="alert" className="text-critical flex items-start gap-1.5 text-sm">
          <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
          {state.error}
        </p>
      ) : null}

      <SubmitButton />
    </form>
  );
}
