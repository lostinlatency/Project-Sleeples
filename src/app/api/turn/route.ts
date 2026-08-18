import { z } from "zod";
import { NarrativeEventSchema, publicView } from "@/lib/director/types";
import { openState, sealState } from "@/lib/narrative/session-envelope";
import { parseJson, apiError, RequestError } from "@/lib/validation/request";
import { reduceNarrative } from "@/lib/director/reducer";
import { writeWebcamScript } from "@/lib/ai/webcam-writer";
import { allowRequest } from "@/lib/validation/rate-limit";

export const runtime = "nodejs";
const Body = z.object({
  sessionEnvelope: z.string().min(20).max(40000),
  idempotencyKey: z.string().min(8).max(100),
  event: NarrativeEventSchema,
});

export async function POST(request: Request) {
  try {
    const body = Body.parse(await parseJson(request));
    let state = await openState(body.sessionEnvelope);
    if (state.processedKeys.includes(body.idempotencyKey))
      return Response.json({
        sessionEnvelope: body.sessionEnvelope,
        publicView: publicView(state),
        messages: [],
        uiActions: [],
        duplicate: true,
      });
    if (!allowRequest(`turn:${state.sessionId}`, 36, 60_000))
      throw new RequestError("RATE_LIMITED", 429);
    const result = reduceNarrative(state, body.event);
    const messages = [...result.authoredMessages];
    let webcamPreparation:
      | {
          spokenScript: string;
          emotionalTone: string;
          performanceNotes: string;
        }
      | undefined;
    if (result.shouldPrepareWebcam) {
      const prepared = await writeWebcamScript(result.nextState);
      result.nextState = {
        ...result.nextState,
        webcam: { ...result.nextState.webcam, script: prepared.spokenScript },
      };
      webcamPreparation = {
        spokenScript: prepared.spokenScript,
        emotionalTone: prepared.emotionalTone,
        performanceNotes: prepared.performanceNotes,
      };
    }
    state = {
      ...result.nextState,
      processedKeys: [
        ...result.nextState.processedKeys,
        body.idempotencyKey,
      ].slice(-40),
    };
    return Response.json({
      sessionEnvelope: await sealState(state),
      publicView: publicView(state),
      messages,
      uiActions: result.uiActions,
      webcamPreparation,
    });
  } catch (error) {
    return apiError(error);
  }
}
