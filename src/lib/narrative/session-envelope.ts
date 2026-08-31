import { createHash } from "node:crypto";
import { EncryptJWT, jwtDecrypt } from "jose";
import { StateSchema, type NarrativeState } from "@/lib/director/types";
import { createInitialState } from "@/lib/director/initial-state";

function key() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === "test")
      return new Uint8Array(
        createHash("sha256")
          .update("project-sleepless-test-session-key")
          .digest(),
      );
    throw new EnvelopeError("SESSION_CONFIG");
  }
  return new Uint8Array(createHash("sha256").update(secret).digest());
}

export async function sealState(state: NarrativeState) {
  return new EncryptJWT({ state })
    .setProtectedHeader({ alg: "dir", enc: "A256GCM" })
    .setIssuedAt()
    .setExpirationTime("30d")
    .setSubject(state.sessionId)
    .encrypt(key());
}

export async function openState(token: string) {
  try {
    const { payload } = await jwtDecrypt(token, key(), { clockTolerance: 5 });
    const raw = payload.state;
    if (!raw || typeof raw !== "object" || !("version" in raw))
      throw new EnvelopeError("SESSION_INVALID");
    const version = (raw as { version: unknown }).version;
    if (version === 3) return StateSchema.parse(raw);
    if (version === 1 || version === 2) {
      const legacy = raw as Record<string, unknown>;
      const base = createInitialState(
        typeof legacy.sessionId === "string" ? legacy.sessionId : undefined,
      );
      return StateSchema.parse({
        ...base,
        ...legacy,
        version: 3,
        ...(version === 1 ? { chapter: 1, chapterTwo: base.chapterTwo } : {}),
        reactiveDesktop: base.reactiveDesktop,
        playerBehavior: base.playerBehavior,
      });
    }
    throw new EnvelopeError("SESSION_VERSION");
  } catch (error) {
    if (error instanceof EnvelopeError) throw error;
    throw new EnvelopeError("SESSION_INVALID");
  }
}

export class EnvelopeError extends Error {
  constructor(
    public code: "SESSION_INVALID" | "SESSION_VERSION" | "SESSION_CONFIG",
  ) {
    super(code);
  }
}
