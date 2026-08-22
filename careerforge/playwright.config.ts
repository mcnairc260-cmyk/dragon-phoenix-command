import { defineConfig, devices } from "@playwright/test";

const PORT = Number(process.env.E2E_PORT ?? 3100);
const baseURL = `http://127.0.0.1:${PORT}`;

/**
 * Some CI images ship a Chromium build whose revision does not match the one
 * this Playwright version would download. PLAYWRIGHT_CHROMIUM_EXECUTABLE points
 * at that binary so the suite runs against it instead of failing on a missing
 * download. Unset locally, Playwright resolves its own browser as usual.
 */
const chromiumPath = process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE;
const launchOptions = chromiumPath ? { executablePath: chromiumPath } : {};

/**
 * The e2e suite runs against a production build on a dedicated port, so it
 * never collides with a dev server and exercises the same code path a
 * deployment does.
 */
export default defineConfig({
  testDir: "./e2e",
  globalSetup: "./e2e/global-setup.ts",
  fullyParallel: false,
  workers: 1,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["list"]] : [["list"]],
  timeout: 60_000,
  expect: { timeout: 15_000 },

  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },

  projects: [
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], launchOptions },
    },
    {
      name: "mobile",
      use: { ...devices["Pixel 7"], launchOptions },
      testMatch: /responsive/,
    },
  ],

  webServer: {
    // E2E_SKIP_BUILD lets a pipeline (or a constrained machine) build once as
    // its own step and hand the suite a ready server, instead of paying for a
    // build inside every run.
    command: process.env.E2E_SKIP_BUILD
      ? `npx next start --port ${PORT}`
      : `npm run build && npx next start --port ${PORT}`,
    url: baseURL,
    // Never adopt a server that happens to be listening: it would be running
    // an older build, and a suite that silently tests stale code is worse than
    // a slow one.
    reuseExistingServer: false,
    timeout: 180_000,
    stdout: "pipe",
    stderr: "pipe",
    env: {
      // Auth.js builds its post-sign-in redirect from AUTH_URL, so it has to
      // name the origin the tests actually browse. Left pointing at the dev
      // port, sign-up would redirect off-origin and the page would fail to
      // load — which is exactly what a misconfigured deployment does too.
      AUTH_URL: baseURL,
      NEXTAUTH_URL: baseURL,
      // The suite must exercise the deterministic provider: an e2e run should
      // never depend on a network call or spend anyone's tokens.
      AI_PROVIDER: "mock",
      NEXT_PUBLIC_DEMO_MODE: "true",
    },
  },
});
