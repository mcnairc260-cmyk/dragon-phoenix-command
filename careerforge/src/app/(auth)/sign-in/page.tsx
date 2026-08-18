import type { Metadata } from "next";
import Link from "next/link";

import { SignInForm } from "./sign-in-form";

export const metadata: Metadata = { title: "Sign in" };

export default async function SignInPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const demoMode = process.env.NEXT_PUBLIC_DEMO_MODE === "true";

  return (
    <div>
      <h1 className="text-ink text-2xl font-semibold tracking-tight">
        Welcome back
      </h1>
      <p className="text-ink-muted mt-1.5 text-sm">
        Pick up where the pipeline left off.
      </p>

      <SignInForm next={next} demoMode={demoMode} />

      <p className="text-ink-muted mt-6 text-sm">
        No account yet?{" "}
        <Link href="/sign-up" className="text-accent hover:underline">
          Create one
        </Link>
      </p>
    </div>
  );
}
