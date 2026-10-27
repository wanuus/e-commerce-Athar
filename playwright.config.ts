import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests drive a real browser against a running site with a seeded LOCAL database.
 *   1. SEED_DEMO="true" npm run db:seed        (demo T-shirts + WELCOME10)
 *   2. npm run test:e2e                        (starts the site itself if it is not already running)
 * Admin tests read E2E_ADMIN_EMAIL / E2E_ADMIN_PASSWORD (use the SEED_ADMIN_* values from your .env).
 */
export default defineConfig({
  testDir: "./tests/e2e",
  timeout: 60_000,
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: [["list"], ["html", { open: "never" }]],
  use: { baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000", trace: "retain-on-failure", screenshot: "only-on-failure" },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"] } },
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: process.env.E2E_BASE_URL ? undefined : { command: "npm run dev", url: "http://localhost:3000/api/health", reuseExistingServer: true, timeout: 120_000 },
});
