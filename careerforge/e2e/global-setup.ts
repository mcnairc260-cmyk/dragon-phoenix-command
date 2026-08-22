import { PrismaClient } from "@prisma/client";

/**
 * Fails fast, and legibly, when the database is not reachable.
 *
 * Without this the suite still fails — but as a browser navigation error on
 * the first form submit, which looks like a UI bug and costs an hour to trace
 * back to "Postgres was not running".
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
        "  npm run db:seed     # load the demo account the suite signs in as",
        "",
      ].join("\n"),
    );
  } finally {
    await prisma.$disconnect();
  }
}
