import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "chapter-two-live.spec.ts",
  timeout: 240_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
    video: "retain-on-failure",
  },
  webServer: {
    command:
      "SESSION_SECRET=playwright-live-session-secret SLEEPLESS_TEST_HARNESS=1 SLEEPLESS_LTX_MODE=live npm run dev -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 120_000,
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
