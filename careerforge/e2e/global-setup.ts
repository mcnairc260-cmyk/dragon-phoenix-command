import { execFileSync } from "node:child_process";

import { PrismaClient } from "@prisma/client";

/**
 * Fails fast, and legibly, when the database is not reachable, then reseeds
 * the demo account.
 *
 * Without the database check the suite still fails — but as a browser
 * navigation error on the first form submit, which looks like a UI bug and
 * costs an hour to trace back to "Postgres was not running".
 *
 * The reseed exists because several specs sign in as the demo user, and a
 * previous run can leave its focus tasks completed, which would make those
 * specs silently skip. A suite whose coverage depends on what the last run did
 * is not coverage. The seed only ever touches the demo account.
 */
export default async function globalSetup() {
  const prisma = new PrismaClient();
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    throw new Error(
      [
        "",
        "Cannot reach the database, so the end-to-end suite cannot run.",
        "",
        "Start PostgreSQL and make sure DATABASE_URL in .env points at it, then:",
        "  npm run db:deploy   # apply migrations",
        "",
      ].join("\n"),
    );
  } finally {
    await prisma.$disconnect();
  }

  execFileSync("npx", ["tsx", "prisma/seed.ts"], { stdio: "inherit" });
}
