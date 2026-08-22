import { expect, test } from "@playwright/test";

import { PASSWORD, signOut, signUp, uniqueEmail } from "./helpers";

test.describe("authentication and isolation", () => {
  test("protected routes redirect to sign-in and return you afterwards", async ({
    page,
  }) => {
    await page.goto("/jobs");
    await expect(page).toHaveURL(/\/sign-in\?next=%2Fjobs/);

    const email = uniqueEmail("redirect");
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Redirect Test");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page).toHaveURL(/\/profile/);

    await page.goto("/jobs");
    await expect(page).toHaveURL(/\/jobs/);
  });

  test("a wrong password is rejected without revealing whether the account exists", async ({
    page,
  }) => {
    const email = uniqueEmail("wrongpass");
    await signUp(page, { email });

    await signOut(page);
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill("definitely the wrong password");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    // Targeted by id: Next's route announcer is also role="alert".
    await expect(page.locator("#sign-in-error")).toContainText(
      "Email or password is incorrect",
    );
  });

  test("an unknown email gets the same message as a wrong password", async ({
    page,
  }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill(uniqueEmail("nobody"));
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    await expect(page.locator("#sign-in-error")).toContainText(
      "Email or password is incorrect",
    );
  });

  test("signing up with an existing email does not confirm the account exists", async ({
    page,
  }) => {
    const email = uniqueEmail("dupe");
    await signUp(page, { email });

    await signOut(page);
    await page.goto("/sign-up");
    await page.getByLabel("Name").fill("Someone Else");
    await page.getByLabel("Email").fill(email);
    await page.getByLabel("Password").fill(PASSWORD);
    await page.getByRole("button", { name: "Create account" }).click();

    const alert = page.getByRole("alert").filter({ hasText: /\S/ });
    await expect(alert).toBeVisible();
    // Vague on purpose: confirming which addresses hold accounts leaks membership.
    await expect(alert).not.toContainText("already registered");
    await expect(alert).not.toContainText("already exists");
  });

  test("one user cannot open another user's opportunity", async ({
    browser,
  }) => {
    const ownerEmail = uniqueEmail("owner");
    const intruderEmail = uniqueEmail("intruder");

    const ownerContext = await browser.newContext();
    const ownerPage = await ownerContext.newPage();
    await signUp(ownerPage, { email: ownerEmail, name: "Owner Person" });

    await ownerPage.goto("/jobs");
    await ownerPage
      .getByRole("button", { name: "Add opportunity" })
      .first()
      .click();
    const dialog = ownerPage.getByRole("dialog");
    await dialog.getByLabel("Job title").fill("Private Role");
    await dialog.getByLabel("Company").fill("Secret Company");
    await dialog.getByRole("button", { name: "Add opportunity" }).click();
    await expect(ownerPage).toHaveURL(/\/jobs\/[a-z0-9]+/);

    const jobId = ownerPage.url().match(/\/jobs\/([^/?]+)/)?.[1];
    expect(jobId).toBeTruthy();
    await ownerContext.close();

    const intruderContext = await browser.newContext();
    const intruderPage = await intruderContext.newPage();
    await signUp(intruderPage, { email: intruderEmail, name: "Intruder" });

    // A job belonging to someone else is indistinguishable from one that does
    // not exist — 404 rather than 403, so nothing is leaked by the response.
    const response = await intruderPage.goto(`/jobs/${jobId}`);
    expect(response?.status()).toBe(404);
    await expect(intruderPage.getByText("Secret Company")).toHaveCount(0);

    const exportResponse = await intruderPage.request.get(
      `/api/jobs/${jobId}/export?format=md`,
    );
    expect([404, 409]).toContain(exportResponse.status());

    await intruderContext.close();
  });

  test("signing out ends the session", async ({ page }) => {
    const email = uniqueEmail("signout");
    await signUp(page, { email });

    // Sign out through the UI, which is the path a user actually takes.
    await page.goto("/today");
    await page
      .locator("aside")
      .getByRole("button")
      .filter({ hasText: email })
      .click();

    // Activated by keyboard: a menu anchored at the sidebar's bottom edge is
    // exactly where a pointer click is most likely to be flaky, and keyboard
    // activation is a path that has to work anyway.
    await page.getByRole("menuitem", { name: "Sign out" }).press("Enter");

    await expect(page).toHaveURL("/");

    await page.goto("/today");
    await expect(page).toHaveURL(/\/sign-in/);
  });
});
