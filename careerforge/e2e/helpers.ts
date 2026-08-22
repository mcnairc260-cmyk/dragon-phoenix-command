import { expect, type Page } from "@playwright/test";

/**
 * Each spec creates its own account rather than sharing the demo one, so tests
 * never interfere with each other and per-user isolation is exercised for real.
 */
export function uniqueEmail(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1e6)}@example.test`;
}

export const PASSWORD = "a long enough passphrase";

export async function signUp(
  page: Page,
  { name = "Test Person", email }: { name?: string; email: string },
) {
  await page.goto("/sign-up");
  await page.getByLabel("Name").fill(name);
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Create account" }).click();

  // Sign-up lands on the profile page with the welcome hint.
  await expect(page).toHaveURL(/\/profile/);
}

/**
 * Ends the session by clearing cookies. Visiting /api/auth/signout only
 * renders the confirmation page — the session survives it, and the next visit
 * to /sign-in is redirected straight back to /today.
 */
export async function signOut(page: Page) {
  await page.context().clearCookies();
}

export async function signIn(page: Page, email: string) {
  await page.goto("/sign-in");
  await page.getByLabel("Email").fill(email);
  await page.getByLabel("Password").fill(PASSWORD);
  await page.getByRole("button", { name: "Sign in", exact: true }).click();
  await expect(page).toHaveURL(/\/(today|profile)/);
}

export async function signInAsDemo(page: Page) {
  await page.goto("/sign-in");
  await page.getByRole("button", { name: "Explore the demo account" }).click();
  await expect(page).toHaveURL(/\/today/);
}

/** Fills the minimum profile needed for analysis to be meaningful. */
export async function fillBasicProfile(page: Page, fullName: string) {
  await page.goto("/profile");
  await page.getByLabel("Full name").fill(fullName);
  await page.getByLabel("Target roles").fill("Senior Backend Engineer");
  await page.getByLabel("Preferred locations").fill("Remote (US)");
  await page.getByLabel("Salary min").fill("150000");
  await page
    .getByLabel("Resume text")
    .fill(
      "Backend engineer with eight years building payment infrastructure in Go and PostgreSQL.",
    );
  await page.getByRole("button", { name: "Save profile" }).click();

  // Assert on persisted state rather than the toast: toasts auto-dismiss, so
  // asserting on one races the timer and fails intermittently for no reason.
  await expect(
    page.getByText(/Profile: \d of 6 pieces in place/),
  ).toBeVisible();
}

export async function addSkill(page: Page, name: string) {
  await page.getByRole("tab", { name: /^Skills/ }).click();
  await page.getByRole("button", { name: "Add skill" }).click();

  const dialog = page.getByRole("dialog");
  await dialog.getByLabel("Skill", { exact: true }).fill(name);
  await dialog.getByRole("button", { name: "Save" }).click();

  await expect(dialog).toBeHidden();
  await expect(
    page.getByRole("tabpanel").getByText(name, { exact: true }),
  ).toBeVisible();
}

export const SAMPLE_POSTING = [
  "Meridian is hiring a Senior Backend Engineer for the payments platform.",
  "",
  "Requirements:",
  "- 5+ years building backend services in Go",
  "- Deep PostgreSQL experience",
  "- Experience with a payments or ledger system",
  "",
  "Preferred:",
  "- Kubernetes",
  "- gRPC",
].join("\n");
