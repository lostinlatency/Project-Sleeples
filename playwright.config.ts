import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "tests/e2e",
  testIgnore: "chapter-two-live.spec.ts",
  timeout: 30_000,
  use: {
    baseURL: "http://127.0.0.1:3101",
    trace: "retain-on-failure",
  },
  webServer: {
    command:
      "SESSION_SECRET=playwright-mock-session-secret SLEEPLESS_TEST_HARNESS=1 SLEEPLESS_LTX_MODE=mock npm run dev -- -p 3101",
    url: "http://127.0.0.1:3101",
    reuseExistingServer: false,
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    { name: "firefox", use: { ...devices["Desktop Firefox"] } },
    { name: "webkit", use: { ...devices["Desktop Safari"] } },
  ],
});
