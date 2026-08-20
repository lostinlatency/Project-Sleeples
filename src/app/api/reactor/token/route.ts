import { z } from "zod";
import { openState } from "@/lib/narrative/session-envelope";
import { apiError, parseJson, RequestError } from "@/lib/validation/request";
import { allowRequest } from "@/lib/validation/rate-limit";
import { validateServerEnvironment } from "@/lib/validation/env";

export const runtime = "nodejs";

const Body = z.object({ sessionEnvelope: z.string().min(20) });
const TokenResponse = z.object({
  jwt: z.string().min(1),
  expires_at: z.number().positive(),
});

// One token per performance, rather than one per story session: Chapter Two
// legitimately contains separate performances for Mike, Sarah, and Tom.
const mintedPerformances = new Map<string, number>();
const CLAIM_LIFETIME_MS = 30 * 24 * 60 * 60 * 1000;
const TOKEN_WINDOW_MS = 60 * 60 * 1000;

function requestIp(request: Request) {
  return (
    request.headers.get("x-real-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

function reservePerformance(key: string) {
  const now = Date.now();
  for (const [storedKey, createdAt] of mintedPerformances)
    if (now - createdAt >= CLAIM_LIFETIME_MS)
      mintedPerformances.delete(storedKey);
  if (mintedPerformances.has(key)) return false;
  mintedPerformances.set(key, now);
  return true;
}

export async function POST(request: Request) {
  try {
    const { sessionEnvelope } = Body.parse(await parseJson(request, 48_000));
    const liveMode = process.env.SLEEPLESS_LTX_MODE === "live";
    if (liveMode && !validateServerEnvironment().ok)
      throw new RequestError("REACTOR_NOT_CONFIGURED", 503);
    const state = await openState(sessionEnvelope);
    if (!["webcam_preparing", "webcam_invite"].includes(state.phase))
      throw new RequestError("WEBCAM_NOT_READY", 403);

    if (!liveMode)
      return Response.json({
        token: `mock-${state.sessionId}`,
        expiresAt: Date.now() + 900_000,
        mode: "mock",
      });
    if (!process.env.REACTOR_API_KEY)
      throw new RequestError("REACTOR_NOT_CONFIGURED", 503);

    if (!allowRequest("reactor-token:global", 200, TOKEN_WINDOW_MS))
      throw new RequestError("REACTOR_CAPACITY_REACHED", 429);
    if (
      !allowRequest(
        `reactor-token:ip:${requestIp(request)}`,
        12,
        TOKEN_WINDOW_MS,
      )
    )
      throw new RequestError("REACTOR_RATE_LIMITED", 429);

    const performanceKey = `${state.sessionId}:${state.webcam.scriptVariant}`;
    if (!reservePerformance(performanceKey))
      throw new RequestError("TOKEN_ALREADY_MINTED", 429);
    let data: z.infer<typeof TokenResponse>;
    try {
      const response = await fetch("https://api.reactor.inc/tokens", {
        method: "POST",
        headers: {
          "Reactor-API-Key": process.env.REACTOR_API_KEY,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          expires_after: 900,
          authorization_details: [
            {
              type: "session",
              resources: { models: { match: ["reactor/ltx2"] } },
              constraints: { max_sessions: 1 },
            },
          ],
        }),
      });
      if (!response.ok) throw new RequestError("REACTOR_TOKEN_FAILED", 502);
      data = TokenResponse.parse(await response.json());
    } catch (error) {
      mintedPerformances.delete(performanceKey);
      throw error;
    }
    return Response.json({
      token: data.jwt,
      expiresAt: data.expires_at * 1000,
      mode: "live",
    });
  } catch (error) {
    return apiError(error);
  }
}
