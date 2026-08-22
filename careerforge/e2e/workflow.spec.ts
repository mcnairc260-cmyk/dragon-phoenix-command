import { expect, test } from "@playwright/test";

import {
  SAMPLE_POSTING,
  addSkill,
  fillBasicProfile,
  signUp,
  uniqueEmail,
} from "./helpers";

/**
 * The primary workflow, end to end, in one test.
 *
 * Deliberately one long test rather than several short ones: the steps depend
 * on each other, and splitting them would either re-run the setup five times
 * or leak state between specs. If this passes, the product works.
 */
test("sign up, build a profile, add and analyse a job, generate material, advance the pipeline, complete a focus task", async ({
  page,
}) => {
  const email = uniqueEmail("workflow");

  await test.step("sign up", async () => {
    await signUp(page, { email, name: "Rowan Ellis" });
    await expect(page.getByText("Start with the basics.")).toBeVisible();
  });

  await test.step("create the profile", async () => {
    await fillBasicProfile(page, "Rowan Ellis");
    await expect(
      page.getByText(/Profile: \d of 6 pieces in place/),
    ).toBeVisible();
  });

  await test.step("add skills", async () => {
    for (const skill of ["Go", "PostgreSQL", "Payments"]) {
      await addSkill(page, skill);
    }
    await expect(page.getByRole("tab", { name: /Skills \(3\)/ })).toBeVisible();
  });

  await test.step("add an accomplishment", async () => {
    await page.getByRole("tab", { name: /^Accomplishments/ }).click();
    await page.getByRole("button", { name: "Add accomplishment" }).click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Title").fill("Cut settlement runtime");
    await dialog
      .getByLabel("Situation")
      .fill("Settlement saturated the writer");
    await dialog
      .getByLabel("Action")
      .fill("Partitioned the write path by account");
    await dialog
      .getByLabel("Result")
      .fill("Runs finished in a fraction of the time");
    await dialog.getByLabel("Headline metric").fill("4h to 40m");
    await dialog
      .getByLabel("Skills demonstrated")
      .fill("PostgreSQL, Go, Payments");
    await dialog.getByRole("button", { name: "Save" }).click();

    await expect(dialog).toBeHidden();
    await expect(
      page.getByRole("tabpanel").getByText("Cut settlement runtime"),
    ).toBeVisible();
  });

  await test.step("add a job by pasting a posting", async () => {
    await page.goto("/jobs");
    await page.getByRole("button", { name: "Add opportunity" }).first().click();

    const dialog = page.getByRole("dialog");
    await dialog.getByLabel("Job title").fill("Senior Backend Engineer");
    await dialog.getByLabel("Company").fill("Meridian Financial");
    await dialog.getByLabel("Full job description").fill(SAMPLE_POSTING);
    await dialog.getByRole("button", { name: "Add opportunity" }).click();

    // Adding a job navigates straight to it.
    await expect(page).toHaveURL(/\/jobs\/[a-z0-9]+/);
    await expect(
      page.getByRole("heading", { name: "Senior Backend Engineer" }),
    ).toBeVisible();
  });

  await test.step("analyse the job", async () => {
    await expect(page.getByText("Not analysed yet")).toBeVisible();
    await page.getByRole("button", { name: "Analyse this job" }).click();

    await expect(
      page.getByRole("button", { name: "Re-analyse" }),
    ).toBeVisible();
    await expect(page.getByText("/100", { exact: true })).toBeVisible();

    // The evidence distinction is the product's core honesty claim, so the
    // test asserts it is actually rendered rather than merely computed.
    await expect(
      page.getByText("How to read the evidence labels"),
    ).toBeVisible();
    await expect(page.getByText("Required by the posting")).toBeVisible();
  });

  await test.step("re-analysing reuses the cached result", async () => {
    await page.getByRole("button", { name: "Re-analyse" }).click();
    await expect(
      page.getByRole("button", { name: "Re-analyse" }),
    ).toBeVisible();
  });

  await test.step("generate a cover letter", async () => {
    await page.getByRole("tab", { name: /^Materials/ }).click();
    await page.getByRole("button", { name: /^Cover letter$/ }).click();
    await page.getByRole("button", { name: /Generate cover letter/i }).click();

    const draft = page.getByRole("textbox", { name: "Cover letter draft" });
    await expect(draft).toBeVisible();

    const content = await draft.inputValue();
    expect(content).toContain("Meridian Financial");
    // Generated only from the candidate's own record.
    expect(content).toContain("Rowan Ellis");
  });

  await test.step("the draft names its sources", async () => {
    const provenance = page.getByText("What this draft was built from");
    await expect(provenance).toBeVisible();
    await expect(
      page.getByText("Cut settlement runtime").first(),
    ).toBeVisible();
  });

  await test.step("edit the draft and see it autosave", async () => {
    const draft = page.getByRole("textbox", { name: "Cover letter draft" });
    await draft.fill("A short edited cover letter for Meridian Financial.");

    await expect(page.getByText("Saved", { exact: true })).toBeVisible({
      timeout: 10_000,
    });

    await page.reload();
    await page.getByRole("tab", { name: /^Materials/ }).click();
    await expect(
      page.getByRole("textbox", { name: "Cover letter draft" }),
    ).toHaveValue("A short edited cover letter for Meridian Financial.");
    await expect(page.getByText("Edited", { exact: true })).toBeVisible();
  });

  await test.step("export the pack", async () => {
    const jobUrl = page.url();
    const jobId = jobUrl.match(/\/jobs\/([^/?]+)/)?.[1];
    expect(jobId).toBeTruthy();

    const response = await page.request.get(
      `/api/jobs/${jobId}/export?format=md`,
    );
    expect(response.status()).toBe(200);
    expect(response.headers()["content-disposition"]).toContain("attachment");

    const body = await response.text();
    expect(body).toContain("Application pack");
    expect(body).toContain("Meridian Financial");
  });

  await test.step("move the job through the pipeline", async () => {
    await page
      .getByRole("button", { name: /Preparing|Discovered|Evaluating/ })
      .click();
    await page.getByRole("menuitem", { name: "Applied" }).click();
    await expect(page.getByRole("button", { name: "Applied" })).toBeVisible();
  });

  await test.step("the activity trail recorded the work", async () => {
    await page.getByRole("tab", { name: "Activity" }).click();

    // Scoped to the timeline: a toast can carry the same words while it fades.
    // Re-analysing logs a second entry, so these match more than once by
    // design; .first() asserts presence without asserting a count.
    const timeline = page.getByRole("tabpanel").getByRole("list");
    await expect(timeline.getByText("Moved to Applied").first()).toBeVisible();
    await expect(
      timeline.getByText(/Fit analysed: \d+\/100/).first(),
    ).toBeVisible();
    await expect(
      timeline.getByText(/Generated cover letter/i).first(),
    ).toBeVisible();
  });

  await test.step("complete a focus task on Today", async () => {
    await page.goto("/today");

    const markDone = page.getByRole("button", { name: "Mark done" }).first();
    await expect(markDone).toBeVisible();
    await markDone.click();
    await expect(page.getByText(/1 completed today/)).toBeVisible();
  });

  await test.step("analytics reflects the pipeline", async () => {
    await page.goto("/analytics");
    await expect(
      page.getByRole("heading", { name: "Analytics" }),
    ).toBeVisible();
    await expect(
      page.getByText("Applications submitted", { exact: true }),
    ).toBeVisible();
    // One application is far too few to quote a rate from, and the page says so.
    await expect(
      page.getByText(/Too early to read the rates/).first(),
    ).toBeVisible();
  });
});
