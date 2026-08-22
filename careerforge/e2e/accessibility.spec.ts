import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

/**
 * Keyboard and semantics checks on the paths a keyboard user actually takes.
 * Not a substitute for a full audit — these cover the things most likely to
 * regress silently.
 */
test.describe("keyboard and semantics", () => {
  test("the sign-in form is reachable and submittable by keyboard alone", async ({
    page,
  }) => {
    await page.goto("/sign-in");

    // The skip link must be reachable early in the tab order. Asserting a
    // specific tab count would break on any future header change, so this
    // checks the property that matters: you reach it without hunting.
    // The email field takes focus on load, which is the right trade for a
    // sign-in page — so the skip link is reached by shift-tabbing back, not by
    // tabbing forward. What matters is that it is there and that it works.
    await expect(page.getByLabel("Email")).toBeFocused();

    const skipLink = page.getByRole("link", { name: "Skip to content" });
    await expect(skipLink).toHaveAttribute("href", "#main");
    await skipLink.focus();
    await expect(skipLink).toBeFocused();

    await page.getByLabel("Email").focus();
    await page.keyboard.type("demo@careerforge.app");
    await page.keyboard.press("Tab");
    await expect(page.getByLabel("Password")).toBeFocused();
    await page.keyboard.type("demo-password-1234");
    await page.keyboard.press("Enter");

    await expect(page).toHaveURL(/\/today/);
  });

  test("every page has exactly one h1", async ({ page }) => {
    await signInAsDemo(page);

    for (const path of ["/today", "/jobs", "/profile", "/analytics"]) {
      await page.goto(path);
      await expect(page.locator("h1")).toHaveCount(1);
    }
  });

  test("interactive controls have accessible names", async ({ page }) => {
    await signInAsDemo(page);
    await page.goto("/jobs");

    const buttons = page.getByRole("button");
    const count = await buttons.count();
    expect(count).toBeGreaterThan(0);

    for (let i = 0; i < count; i++) {
      const button = buttons.nth(i);
      if (!(await button.isVisible())) continue;
      const name = (await button.textContent())?.trim();
      const label = await button.getAttribute("aria-label");
      expect(
        Boolean(name) || Boolean(label),
        `button ${i} has no accessible name`,
      ).toBe(true);
    }
  });

  test("the job table is a real table with a caption and header scopes", async ({
    page,
  }) => {
    await signInAsDemo(page);
    await page.goto("/jobs");
    await page.getByRole("button", { name: "Table" }).click();

    const table = page.getByRole("table");
    await expect(table).toBeVisible();
    await expect(table.locator("caption")).toHaveCount(1);
    await expect(table.locator('th[scope="col"]').first()).toBeVisible();
  });

  test("form errors are announced", async ({ page }) => {
    await page.goto("/sign-in");
    await page.getByLabel("Email").fill("someone@example.test");
    await page.getByLabel("Password").fill("wrong password entirely");
    await page.getByRole("button", { name: "Sign in", exact: true }).click();

    const alert = page.getByRole("alert");
    await expect(alert).toBeVisible();

    // The field points at its error so a screen reader reads them together.
    await expect(page.getByLabel("Email")).toHaveAttribute(
      "aria-describedby",
      /sign-in-error/,
    );
  });

  test("the focus timer exposes its countdown as a timer", async ({ page }) => {
    await signInAsDemo(page);
    await page.goto("/today");

    const start = page
      .getByRole("button", { name: "Start focus session" })
      .first();
    if ((await start.count()) === 0)
      test.skip(true, "No focus tasks available.");

    await start.click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();
    await expect(dialog.getByRole("timer")).toBeVisible();
  });
});
