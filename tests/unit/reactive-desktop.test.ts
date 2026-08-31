import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/director/initial-state";
import { reduceNarrative } from "@/lib/director/reducer";

describe("BRB reactive desktop", () => {
  it("reveals the recovered artifact when the missing track plays", () => {
    const state = createInitialState("reactive-track");
    const result = reduceNarrative(state, {
      type: "PLAYLIST_TRACK_PLAYED",
      trackId: "missing_goodbye",
    });
    expect(result.nextState.reactiveDesktop).toMatchObject({
      stage: 1,
      playlistTrackPlayed: true,
      movingNoteMutated: true,
      recycleArtifact: "available",
    });
    expect(reduceNarrative(result.nextState, {
      type: "PLAYLIST_TRACK_PLAYED",
      trackId: "missing_goodbye",
    }).nextState).toBe(result.nextState);
  });

  it("restores, watches, and sends the recovered memory", () => {
    let state = reduceNarrative(createInitialState("reactive-send"), {
      type: "PLAYLIST_TRACK_PLAYED",
      trackId: "missing_goodbye",
    }).nextState;
    let result = reduceNarrative(state, {
      type: "RECYCLE_ARTIFACT_DECIDED",
      decision: "restore",
    });
    state = result.nextState;
    expect(state.unlockedFiles).toContain("emily_goodbye");
    expect(result.authoredMessages.map((message) => message.text)).toContain("why did u bring that back");

    state = reduceNarrative(state, { type: "RECOVERED_VIDEO_COMPLETED" }).nextState;
    expect(state.reactiveDesktop.observedBehavior).toBeTruthy();
    const beforeTrust = state.beliefs.trust;
    result = reduceNarrative(state, { type: "MEMORY_FILE_DECIDED", decision: "send" });
    expect(result.nextState.reactiveDesktop.memoryDecision).toBe("sent");
    expect(result.nextState.beliefs.trust).toBeGreaterThan(beforeTrust);
    expect(result.nextState.unlockedFiles).not.toContain("emily_goodbye");
  });

  it("keeps a residual story path after permanent deletion", () => {
    let state = reduceNarrative(createInitialState("reactive-delete"), {
      type: "PLAYLIST_TRACK_PLAYED",
      trackId: "missing_goodbye",
    }).nextState;
    state = reduceNarrative(state, {
      type: "RECYCLE_ARTIFACT_DECIDED",
      decision: "delete",
    }).nextState;
    expect(state.reactiveDesktop.recycleArtifact).toBe("residual");
    expect(state.reactiveDesktop.memoryDecision).toBe("residual_deleted");
    expect(state.playerBehavior.deletedArtifact).toBe(true);
  });

  it("resists one shutdown at high exposure and then yields", () => {
    const base = createInitialState("reactive-power");
    const state = {
      ...base,
      chapter: 2 as const,
      chapterTwo: { ...base.chapterTwo, stage: "convergence" as const, exposureStage: 4 },
    };
    const first = reduceNarrative(state, {
      type: "POWER_ACTION_ATTEMPTED",
      action: "shutdown",
    });
    expect(first.nextState.reactiveDesktop.blockedShutdown).toBe(true);
    expect(first.uiActions.some((action) => action.type === "RESIST_SHUTDOWN")).toBe(true);
    const second = reduceNarrative(first.nextState, {
      type: "POWER_ACTION_ATTEMPTED",
      action: "shutdown",
    });
    expect(second.uiActions.some((action) => action.type === "RESIST_SHUTDOWN")).toBe(false);
  });
});
