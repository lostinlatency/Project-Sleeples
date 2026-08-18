import { z } from "zod";
import { openState } from "@/lib/narrative/session-envelope";
import { apiError, parseJson, RequestError } from "@/lib/validation/request";

export const runtime = "nodejs";

const Body = z.object({ sessionEnvelope: z.string().min(20) });
const TokenResponse = z.object({
  jwt: z.string().min(1),
  expires_at: z.number().positive(),
});

// One token per performance, rather than one per story session: Chapter Two
// legitimately contains separate performances for Mike, Sarah, and Tom.
const mintedPerformances = new Set<string>();

export async function POST(request: Request) {
  try {
    const { sessionEnvelope } = Body.parse(await parseJson(request, 48_000));
    const state = await openState(sessionEnvelope);
    if (!["webcam_preparing", "webcam_invite"].includes(state.phase))
      throw new RequestError("WEBCAM_NOT_READY", 403);

    if (process.env.SLEEPLESS_LTX_MODE !== "live")
      return Response.json({
        token: `mock-${state.sessionId}`,
        expiresAt: Date.now() + 900_000,
        mode: "mock",
      });
    if (!process.env.REACTOR_API_KEY)
      throw new RequestError("REACTOR_NOT_CONFIGURED", 503);

    const performanceKey = `${state.sessionId}:${state.webcam.scriptVariant}`;
    if (mintedPerformances.has(performanceKey))
      throw new RequestError("TOKEN_ALREADY_MINTED", 429);
    // Reserve before the network call so two simultaneous browser requests
    // cannot both spend credits for the same performance.
    mintedPerformances.add(performanceKey);

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
    const expiry = setTimeout(
      () => mintedPerformances.delete(performanceKey),
      900_000,
    );
    expiry.unref();
    return Response.json({
      token: data.jwt,
      expiresAt: data.expires_at * 1000,
      mode: "live",
    });
  } catch (error) {
    return apiError(error);
  }
}
