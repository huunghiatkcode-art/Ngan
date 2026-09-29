import { defineConfig, devices } from "@playwright/test";

// E2E tests need a live Supabase project (real auth + database) — see
// docs/deployment.md "Local development" for setup, then:
//   npm run dev            # in one terminal
//   npm run test:e2e       # in another
export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: false, // teacher + student flows share seeded data — run serially
  retries: 0,
  reporter: "html",
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:3000",
    trace: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
  ],
  webServer: process.env.CI
    ? { command: "npm run build && npm run start", url: "http://localhost:3000", reuseExistingServer: false }
    : undefined,
});
