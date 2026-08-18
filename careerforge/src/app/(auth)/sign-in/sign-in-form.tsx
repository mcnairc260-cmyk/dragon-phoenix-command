"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { CircleAlert } from "lucide-react";

import { signInAction, type FormState } from "@/lib/server/actions/auth";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const initialState: FormState = { error: null };

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" className="w-full" disabled={pending}>
      {pending ? "Signing in…" : "Sign in"}
    </Button>
  );
}

export function SignInForm({
  next,
  demoMode,
}: {
  next?: string;
  demoMode: boolean;
}) {
  const [state, formAction] = useActionState(signInAction, initialState);

  return (
    <>
      <form action={formAction} className="mt-7 space-y-4">
        {next ? <input type="hidden" name="next" value={next} /> : null}

        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            name="email"
            type="email"
            autoComplete="email"
            required
            autoFocus
            placeholder="you@example.com"
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "sign-in-error" : undefined}
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            name="password"
            type="password"
            autoComplete="current-password"
            required
            aria-invalid={state.error ? true : undefined}
            aria-describedby={state.error ? "sign-in-error" : undefined}
          />
        </div>

        {state.error ? (
          <p
            id="sign-in-error"
            role="alert"
            className="text-critical flex items-start gap-1.5 text-sm"
          >
            <CircleAlert className="mt-0.5 size-3.5 shrink-0" />
            {state.error}
          </p>
        ) : null}

        <SubmitButton />
      </form>

      {demoMode ? (
        <form action={formAction} className="mt-3">
          <input type="hidden" name="email" value="demo@careerforge.app" />
          <input type="hidden" name="password" value="demo-password-1234" />
          <Button type="submit" variant="secondary" className="w-full">
            Explore the demo account
          </Button>
          <p className="text-ink-subtle mt-2 text-center text-xs leading-relaxed">
            A fully populated pipeline built from fictional data. Nothing in it
            belongs to a real person.
          </p>
        </form>
      ) : null}
    </>
  );
}
