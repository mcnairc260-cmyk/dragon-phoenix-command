import { expect, test } from "@playwright/test";

import { signInAsDemo } from "./helpers";

/**
 * Runs on both the desktop and mobile projects. The mobile pass is what catches
 * the failure mode that actually matters on a phone: a page that scrolls
 * sideways because one wide element escaped its container.
 */
const PAGES = ["/today", "/jobs", "/profile", "/analytics"] as const;

test.describe("responsive layout", () => {
  test.beforeEach(async ({ page }) => {
    await signInAsDemo(page);
  });

  for (const path of PAGES) {
    test(`${path} does not scroll horizontally`, async ({ page }) => {
      await page.goto(path);
      await expect(page.locator("main")).toBeVisible();

      // A wide table or board must scroll inside its own container, never
      // push the document sideways.
      const overflow = await page.evaluate(() => {
        const doc = document.documentElement;
        return doc.scrollWidth - doc.clientWidth;
      });

      expect(overflow).toBeLessThanOrEqual(1);
    });
  }

  test("the mobile menu opens and navigates", async ({ page, isMobile }) => {
    test.skip(!isMobile, "Desktop uses the persistent sidebar instead.");

    await page.goto("/today");
    await page.getByRole("button", { name: "Open menu" }).click();

    const panel = page.locator("#mobile-nav-panel");
    await expect(panel).toBeVisible();

    await panel.getByRole("link", { name: "Opportunities" }).click();
    await expect(page).toHaveURL(/\/jobs/);
  });

  test("the sidebar is present on desktop and absent on mobile", async ({
    page,
    isMobile,
  }) => {
    await page.goto("/today");
    const sidebarNav = page.locator("aside").getByRole("navigation");

    if (isMobile) {
      await expect(sidebarNav).toBeHidden();
    } else {
      await expect(sidebarNav).toBeVisible();
    }
  });
});
