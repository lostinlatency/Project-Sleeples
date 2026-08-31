import { describe, it, expect } from "vitest";
import { createInitialState } from "@/lib/director/initial-state";
import { openState, sealState } from "@/lib/narrative/session-envelope";
describe("session envelope", () => {
  it("round trips authenticated state", async () => {
    const state = createInitialState("session-a");
    expect((await openState(await sealState(state))).sessionId).toBe(
      "session-a",
    );
  });
  it("rejects tampering", async () => {
    const token = await sealState(createInitialState("a"));
    const parts = token.split(".");
    const position = Math.floor(parts[3].length / 2);
    parts[3] = `${parts[3].slice(0, position)}${parts[3][position] === "a" ? "b" : "a"}${parts[3].slice(position + 1)}`;
    await expect(openState(parts.join("."))).rejects.toThrow("SESSION_INVALID");
  });
  it("rejects a different key", async () => {
    process.env.SESSION_SECRET = "one";
    const token = await sealState(createInitialState("a"));
    process.env.SESSION_SECRET = "two";
    await expect(openState(token)).rejects.toThrow("SESSION_INVALID");
    delete process.env.SESSION_SECRET;
  });
  it("identifies an incompatible envelope version", async () => {
    const state = {
      ...createInitialState("a"),
      version: 99,
    } as unknown as Parameters<typeof sealState>[0];
    await expect(openState(await sealState(state))).rejects.toThrow(
      "SESSION_VERSION",
    );
  });
  it("migrates version two story progress into the reactive desktop schema", async () => {
    const current = createInitialState("legacy-v2");
    const legacy = {
      ...current,
      version: 2,
      reactiveDesktop: undefined,
      playerBehavior: undefined,
      story: { ...current.story, route: "truth" as const },
    } as unknown as Parameters<typeof sealState>[0];
    const opened = await openState(await sealState(legacy));
    expect(opened.version).toBe(3);
    expect(opened.story.route).toBe("truth");
    expect(opened.reactiveDesktop.stage).toBe(0);
    expect(opened.playerBehavior.fileOpenCounts).toEqual({});
  });
});
