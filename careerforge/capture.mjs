import { chromium, devices } from "@playwright/test";

const BASE = process.env.SHOT_BASE ?? "http://127.0.0.1:3100";
const OUT = "docs/screenshots";

const browser = await chromium.launch({
  executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
});
const context = await browser.newContext({
  ...devices["Desktop Chrome"],
  viewport: { width: 1440, height: 960 },
  deviceScaleFactor: 2,
  baseURL: BASE,
});
const page = await context.newPage();

await page.goto("/sign-in");
await page.getByRole("button", { name: "Explore the demo account" }).click();
await page.waitForURL(/\/today/);

const shots = [
  ["today", "/today"],
  ["opportunities", "/jobs"],
  ["analytics", "/analytics"],
  ["profile", "/profile"],
];

for (const [name, path] of shots) {
  await page.goto(path);
  await page.waitForTimeout(900);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("captured", name);
}

// The job detail page, on the analysis tab.
await page.goto("/jobs");
await page.getByRole("link", { name: /Staff Backend Engineer/ }).first().click();
await page.waitForURL(/\/jobs\/[a-z0-9]+/);
await page.waitForTimeout(900);
await page.screenshot({ path: `${OUT}/job-analysis.png` });
console.log("captured job-analysis");

// Mobile, to show the responsive layout is real.
const mobile = await browser.newContext({
  ...devices["Pixel 7"],
  baseURL: BASE,
  deviceScaleFactor: 2,
});
const mp = await mobile.newPage();
await mp.goto("/sign-in");
await mp.getByRole("button", { name: "Explore the demo account" }).click();
await mp.waitForURL(/\/today/);
await mp.waitForTimeout(900);
await mp.screenshot({ path: `${OUT}/today-mobile.png` });
console.log("captured today-mobile");

await browser.close();
