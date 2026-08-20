import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    env: { SESSION_SECRET: "project-sleepless-vitest-session-secret" },
    include: ["tests/unit/**/*.test.ts", "tests/integration/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "server-only": path.resolve(import.meta.dirname, "tests/server-only.ts"),
      "@": path.resolve(import.meta.dirname, "src"),
    },
  },
});
