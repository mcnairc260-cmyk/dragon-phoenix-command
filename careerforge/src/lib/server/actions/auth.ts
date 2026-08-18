"use server";

import bcrypt from "bcryptjs";
import { AuthError } from "next-auth";

import { signIn, signOut } from "@/auth";
import { prisma } from "@/lib/server/prisma";
import { signInSchema, signUpSchema } from "@/lib/validation/auth";

export type FormState = { error: string | null };

/** Cost 12: comfortably above the 2026 floor, still ~250ms on modest hardware. */
const BCRYPT_ROUNDS = 12;

/**
 * `signIn` signals a successful redirect by throwing. Detect it by its digest
 * rather than importing Next's internal helper, whose path moves between
 * releases, and rethrow so the redirect actually happens.
 */
function isRedirectError(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest: unknown }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

function safePath(value: FormDataEntryValue | null): string {
  const raw = typeof value === "string" ? value : "";
  // Same-origin paths only. "//evil.com" and "https://evil.com" are rejected.
  return /^\/(?!\/)[\w\-/?&=.%]*$/.test(raw) ? raw : "/today";
}

export async function signUpAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signUpSchema.safeParse({
    name: formData.get("name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check your details." };
  }

  const { name, email, password } = parsed.data;

  const existing = await prisma.user.findUnique({
    where: { email },
    select: { id: true },
  });
  if (existing) {
    // Deliberately vague: confirming which emails hold accounts leaks
    // membership. The wording still tells an honest user what to do.
    return { error: "That email cannot be used. Try signing in instead." };
  }

  const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);
  await prisma.user.create({ data: { email, name, passwordHash } });

  try {
    await signIn("credentials", {
      email,
      password,
      redirectTo: "/profile?welcome=1",
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    return { error: "Account created, but sign-in failed. Try signing in." };
  }

  return { error: null };
}

export async function signInAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const parsed = signInSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter your email and password." };
  }

  try {
    await signIn("credentials", {
      ...parsed.data,
      redirectTo: safePath(formData.get("next")),
    });
  } catch (error) {
    if (isRedirectError(error)) throw error;
    if (error instanceof AuthError) {
      return { error: "Email or password is incorrect." };
    }
    return { error: "Could not sign in right now. Try again in a moment." };
  }

  return { error: null };
}

export async function signOutAction() {
  await signOut({ redirectTo: "/" });
}
