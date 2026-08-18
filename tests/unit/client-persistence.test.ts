import { describe, expect, it } from "vitest";
import { isCurrentSavedSession } from "@/lib/narrative/client-persistence";

describe("recovered client sessions", () => {
  it("rejects a pre-choice public view instead of crashing the conversation", () => {
    expect(
      isCurrentSavedSession({
        envelope: "legacy-envelope",
        publicView: { phase: "normal", completed: false },
        messages: [],
      }),
    ).toBe(false);
  });

  it("accepts the current choice-based public view", () => {
    expect(
      isCurrentSavedSession({
        envelope: "current-envelope",
        publicView: {
          storyNodeId: "s0",
          storyRoute: "undecided",
          choices: [],
        },
        messages: [],
      }),
    ).toBe(true);
  });
});
