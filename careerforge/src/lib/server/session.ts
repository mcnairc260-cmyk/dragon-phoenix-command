import "server-only";

import { cache } from "react";
import { redirect } from "next/navigation";

import { auth } from "@/auth";
import { prisma } from "@/lib/server/prisma";

/**
 * Authorization choke point.
 *
 * Every server action and route handler starts here. Nothing below this layer
 * accepts a user id from the client — ownership is always derived from the
 * session, and every child record is reached through a `where` clause that
 * includes the owning user. That way a forged id in a request body finds
 * nothing rather than someone else's data.
 */

export type SessionUser = { id: string; email: string; name: string | null };

/** The signed-in user, or null. Cached per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;

  // Re-read from the database: a token can outlive the account it names.
  const user = await prisma.user.findUnique({
    where: { id },
    select: { id: true, email: true, name: true },
  });

  return user ?? null;
});

/** The signed-in user, or a redirect to sign-in. Use in pages and layouts. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/sign-in");
  return user;
}

/** Thrown by the API-facing guard so route handlers can answer 401 cleanly. */
export class UnauthorizedError extends Error {
  constructor() {
    super("Unauthorized");
    this.name = "UnauthorizedError";
  }
}

/** The signed-in user, or a throw. Use in route handlers and server actions. */
export async function requireUserOrThrow(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new UnauthorizedError();
  return user;
}

/**
 * Loads a job the signed-in user owns, or null. The userId in the `where`
 * clause is what makes cross-user access impossible rather than merely
 * discouraged.
 */
export async function findOwnedJob(userId: string, jobId: string) {
  return prisma.jobOpportunity.findFirst({ where: { id: jobId, userId } });
}

/** The candidate profile owned by this user, or null if not created yet. */
export async function findOwnedProfile(userId: string) {
  return prisma.candidateProfile.findUnique({ where: { userId } });
}

/** The candidate profile id owned by this user, creating nothing. */
export async function requireOwnedProfileId(userId: string): Promise<string> {
  const profile = await prisma.candidateProfile.findUnique({
    where: { userId },
    select: { id: true },
  });
  if (!profile) throw new Error("PROFILE_REQUIRED");
  return profile.id;
}
