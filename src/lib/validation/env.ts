export function validateServerEnvironment() {
  const required = new Set<string>(["SESSION_SECRET"]);
  if (process.env.SLEEPLESS_LTX_MODE === "live") required.add("REACTOR_API_KEY");
  const missing = [...required].filter((variable) => !process.env[variable]);
  if (missing.length)
    console.error(
      `[sleepless] server configuration is missing: ${missing.join(", ")}`,
    );
  return { ok: missing.length === 0, missing };
}
