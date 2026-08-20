import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testMatch: "chapter-two.spec.ts",
  timeout: 90_000,
  workers: 1,
  use: {
    baseURL: "http://127.0.0.1:3100",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "SESSION_SECRET=playwright-chapter-two-secret SLEEPLESS_TEST_HARNESS=1 SLEEPLESS_LTX_MODE=mock npm run dev -- -p 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
