const liveAi = [
  "AI_GATEWAY_API_KEY",
  "AI_MODEL_PERCEPTION",
  "AI_MODEL_ACTOR",
  "AI_MODEL_REVIEW",
] as const;

export function validateServerEnvironment() {
  const required = new Set<string>(["SESSION_SECRET"]);
  if (process.env.SLEEPLESS_AI_MODE === "live")
    liveAi.forEach((variable) => required.add(variable));
  if (process.env.SLEEPLESS_LTX_MODE === "live") required.add("REACTOR_API_KEY");
  const missing = [...required].filter((variable) => !process.env[variable]);
  if (missing.length)
    console.error(
      `[sleepless] server configuration is missing: ${missing.join(", ")}`,
    );
  return { ok: missing.length === 0, missing };
}
