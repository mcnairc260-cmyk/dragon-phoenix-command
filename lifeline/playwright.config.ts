import { defineConfig, devices } from '@playwright/test';

const PORT = 3210;
export default defineConfig({
  testDir: './e2e',
  timeout: 120_000,
  fullyParallel: false,
  workers: 1,
  reporter: [['list']],
  use: { baseURL: `http://localhost:${PORT}`, trace: 'off' },
  projects: [
    { name: 'mobile', use: { ...devices['Pixel 7'] } },
    { name: 'desktop', use: { ...devices['Desktop Chrome'] } },
  ],
  webServer: {
    // The production build, with a fresh in-memory database. Demo mode: nothing is ever sent.
    command: `npx next start -p ${PORT}`,
    url: `http://localhost:${PORT}`,
    reuseExistingServer: false,
    env: { DATABASE_URL: 'memory://', LIFELINE_DEMO_MODE: '1', APP_URL: `http://localhost:${PORT}` },
  },
});
