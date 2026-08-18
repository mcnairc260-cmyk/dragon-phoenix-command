import type { Metadata } from "next";
import Link from "next/link";

import { SignUpForm } from "./sign-up-form";

export const metadata: Metadata = { title: "Create your account" };

export default function SignUpPage() {
  return (
    <div>
      <h1 className="text-ink text-2xl font-semibold tracking-tight">
        Create your account
      </h1>
      <p className="text-ink-muted mt-1.5 text-sm">
        Next step is your profile — it is what keeps generated material honest.
      </p>

      <SignUpForm />

      <p className="text-ink-muted mt-6 text-sm">
        Already have an account?{" "}
        <Link href="/sign-in" className="text-accent hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  );
}
