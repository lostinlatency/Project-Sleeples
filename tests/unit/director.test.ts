import { describe, it, expect } from "vitest";
import { createInitialState } from "@/lib/director/initial-state";
import { reduceNarrative } from "@/lib/director/reducer";
import {
  STORY,
  STORY_NODE_COUNT,
  routeScript,
  transitionReaction,
} from "@/content/server/story";
import {
  StateSchema,
  type NarrativeEvent,
  type NarrativeState,
  type StoryRoute,
} from "@/lib/director/types";
import { writeWebcamScript } from "@/lib/ai/webcam-writer";

function open() {
  return reduceNarrative(createInitialState("story-test"), {
    type: "MSN_OPENED",
  }).nextState;
}
function choose(state: NarrativeState, id: string) {
  return reduceNarrative(state, { type: "STORY_CHOICE", choiceId: id });
}
function followFirstAvailable(
  state: NarrativeState,
  until: (s: NarrativeState) => boolean,
) {
  let current = state;
  let guard = 30;
  while (!until(current) && guard--) {
    const choice = current.story.choices.find((item) => !item.disabled);
    if (!choice) throw new Error(`No choice at ${current.story.nodeId}`);
    current = choose(current, choice.id).nextState;
  }
  return current;
}

describe("authored story director", () => {
  it("contains exactly 26 dialogue nodes and every node has three choices", () => {
    expect(STORY_NODE_COUNT).toBe(26);
    for (const node of Object.values(STORY))
      expect(node.choices).toHaveLength(3);
  });
  it("has no broken choice links, duplicate choice ids, or empty authored nodes", () => {
    const choiceIds: string[] = [];
    for (const node of Object.values(STORY)) {
      expect(node.lines.length).toBeGreaterThan(0);
      for (const choice of node.choices) {
        choiceIds.push(choice.id);
        expect(choice.label.trim()).not.toBe("");
        expect(Boolean(choice.next)).not.toBe(Boolean(choice.ending));
        if (choice.next) expect(STORY[choice.next]).toBeDefined();
      }
    }
    expect(new Set(choiceIds).size).toBe(choiceIds.length);
  });
  it("authors a direct reaction for every non-ending dialogue choice", () => {
    for (const node of Object.values(STORY))
      for (const choice of node.choices)
        if (choice.next)
          expect(transitionReaction(choice.id), choice.id).toBeTruthy();
  });
  it("executes every authored choice from a reachable state with the matching reaction", () => {
    let initial = open();
    for (const fileId of [
      "holiday_photo",
      "moving_note",
      "chat_log",
      "warning_note",
    ])
      initial = reduceNarrative(initial, {
        type: "FILE_OPENED",
        fileId,
      }).nextState;
    const queue = [initial];
    const seen = new Set<string>();
    while (queue.length) {
      const state = queue.shift()!;
      if (seen.has(state.story.nodeId)) continue;
      seen.add(state.story.nodeId);
      const node = STORY[state.story.nodeId];
      for (const choice of node.choices) {
        const result = choose(state, choice.id);
        expect(result.authoredMessages[0]?.text, choice.id).toContain(
          choice.label,
        );
        if (choice.ending) {
          expect(result.nextState.chapter, choice.id).toBe(2);
          expect(result.nextState.chapterTwo.stage, choice.id).toBe(
            "file_offer",
          );
          continue;
        }
        expect(result.authoredMessages[1]?.text, choice.id).toBe(
          transitionReaction(choice.id),
        );
        if (node.preparesWebcam) {
          expect(result.nextState.phase, choice.id).toBe("webcam_preparing");
          let r = reduceNarrative(result.nextState, {
            type: "LTX_CONDITIONS_READY",
          });
          r = reduceNarrative(r.nextState, { type: "WEBCAM_ACCEPTED" });
          r = reduceNarrative(r.nextState, { type: "LTX_COMPLETED" });
          queue.push(r.nextState);
        } else {
          expect(result.nextState.story.nodeId, choice.id).toBe(choice.next);
          queue.push(result.nextState);
        }
      }
    }
    expect(seen).toEqual(new Set(Object.keys(STORY)));
  });
  it("authors the opening exactly once and publishes three replies", () => {
    const state = createInitialState("a");
    const first = reduceNarrative(state, { type: "MSN_OPENED" });
    expect(first.authoredMessages.map((m) => m.text)).toEqual([
      "daniel?",
      "is that actually u?",
    ]);
    expect(first.nextState.story.choices).toHaveLength(3);
    expect(
      reduceNarrative(first.nextState, { type: "MSN_OPENED" }).authoredMessages,
    ).toHaveLength(0);
  });
  it.each([
    ["s5-truth", "truth", "truth0"],
    ["s5-lie", "impersonation", "lie0"],
    ["s5-silence", "silence", "silence0"],
  ] as const)("branches %s into the %s route", (_, route, node) => {
    let state = followFirstAvailable(open(), (s) => s.story.nodeId === "s5");
    const selected = state.story.choices.find((c) => c.id === _)!;
    state = choose(state, selected.id).nextState;
    expect(state.story.route).toBe(route);
    expect(state.story.nodeId).toBe(node);
  });
  it.each([
    ["truth", "truth0"],
    ["impersonation", "lie0"],
    ["silence", "silence0"],
  ] as [StoryRoute, string][])(
    "runs the %s route through a unique LTX script and authored ending",
    (route, startNode) => {
      let state = followFirstAvailable(open(), (s) => s.story.nodeId === "s5");
      const branch = state.story.choices.find(
        (c) => c.id === `s5-${route === "impersonation" ? "lie" : route}`,
      )!;
      state = choose(state, branch.id).nextState;
      expect(state.story.nodeId).toBe(startNode);
      state = followFirstAvailable(
        state,
        (s) => s.phase === "webcam_preparing",
      );
      expect(state.story.visited).toHaveLength(11);
      expect(state.webcam.script).toBe(routeScript(route, state));
      let r = reduceNarrative(state, { type: "LTX_CONDITIONS_READY" });
      r = reduceNarrative(r.nextState, { type: "WEBCAM_ACCEPTED" });
      r = reduceNarrative(r.nextState, { type: "LTX_COMPLETED" });
      expect(r.nextState.story.nodeId).toBe(
        route === "impersonation" ? "lie5" : `${route}5`,
      );
      expect(r.nextState.story.visited).toHaveLength(12);
      expect(r.nextState.story.choices).toHaveLength(3);
      const ending = choose(r.nextState, r.nextState.story.choices[0].id);
      expect(ending.nextState.completed).toBe(false);
      expect(ending.nextState.chapter).toBe(2);
      expect(ending.nextState.chapterTwo.chapterOneOutcome).toBe(route);
      expect(ending.nextState.chapterTwo.stage).toBe("file_offer");
      expect(ending.authoredMessages.at(-1)?.text).toBe(
        "sleepless_17 is now Offline",
      );
    },
  );
  it.each(["truth", "impersonation", "silence"] as StoryRoute[])(
    "produces a schema-valid %s LTX performance script",
    async (route) => {
      let state = followFirstAvailable(open(), (s) => s.story.nodeId === "s5");
      state = choose(
        state,
        `s5-${route === "impersonation" ? "lie" : route}`,
      ).nextState;
      state = followFirstAvailable(
        state,
        (s) => s.phase === "webcam_preparing",
      );
      const script = await writeWebcamScript(state);
      expect(script.spokenScript).toBe(routeScript(route, state));
      expect(script.performanceNotes.length).toBeGreaterThan(10);
    },
  );
  it("keeps the truth performance concise without repeating its release line", () => {
    const script = routeScript("truth");
    expect(script.match(/doesn't have to come back/gi)).toHaveLength(1);
    expect(script.match(/tell him/gi)).toBeNull();
  });
  it.each([
    [
      "l4-accept",
      "but daniel never called me sleepy",
      "Daniel never called me sleepy",
    ],
    ["l4-delay", "daniels webcam wasnt broken", "webcam wasn't broken"],
    [
      "l4-refuse",
      "daniel always turned his camera on",
      "always turned his camera on",
    ],
  ] as const)(
    "keeps the impersonation reveal consistent with %s",
    (choiceId, chatTell, scriptTell) => {
      let state = followFirstAvailable(open(), (s) => s.story.nodeId === "s5");
      state = choose(state, "s5-lie").nextState;
      state = followFirstAvailable(state, (s) => s.story.nodeId === "lie4");
      state = choose(state, choiceId).nextState;
      expect(state.webcam.script).toContain(scriptTell);
      let r = reduceNarrative(state, { type: "LTX_CONDITIONS_READY" });
      r = reduceNarrative(r.nextState, { type: "WEBCAM_ACCEPTED" });
      r = reduceNarrative(r.nextState, { type: "LTX_COMPLETED" });
      expect(r.authoredMessages.map((m) => m.text).join(" ")).toContain(
        chatTell,
      );
      if (choiceId !== "l4-accept")
        expect(r.authoredMessages.map((m) => m.text).join(" ")).not.toContain(
          "sleepy",
        );
    },
  );
  it("does not accuse a file-free player of opening Daniels files", () => {
    let state = followFirstAvailable(open(), (s) => s.story.nodeId === "s5");
    state = choose(state, "s5-lie").nextState;
    state = followFirstAvailable(state, (s) => s.phase === "webcam_preparing");
    expect(state.discoveredFiles).toHaveLength(0);
    expect(state.webcam.script).not.toMatch(/went through his files/i);
    let r = reduceNarrative(state, { type: "LTX_CONDITIONS_READY" });
    r = reduceNarrative(r.nextState, { type: "WEBCAM_ACCEPTED" });
    r = reduceNarrative(r.nextState, { type: "LTX_COMPLETED" });
    const ending = choose(r.nextState, "l5-confess");
    expect(ending.authoredMessages[0].text).toContain(
      "i’m sorry. i’m not Daniel.",
    );
    expect(ending.authoredMessages[1].text).toBe(
      "dont pretend to be him again",
    );
  });
  it("only mentions searching files when recovered evidence was used in the impersonation", () => {
    let unused = reduceNarrative(open(), {
      type: "FILE_OPENED",
      fileId: "playlist_2005",
    }).nextState;
    unused = followFirstAvailable(unused, (s) => s.story.nodeId === "s5");
    unused = choose(unused, "s5-lie").nextState;
    unused = followFirstAvailable(
      unused,
      (s) => s.phase === "webcam_preparing",
    );
    expect(unused.webcam.script).not.toMatch(/went through his files/i);
    let used = reduceNarrative(open(), {
      type: "FILE_OPENED",
      fileId: "holiday_photo",
    }).nextState;
    used = followFirstAvailable(used, (s) => s.story.nodeId === "s5");
    used = choose(used, "s5-lie").nextState;
    used = choose(used, "l0-photo").nextState;
    used = followFirstAvailable(used, (s) => s.phase === "webcam_preparing");
    expect(used.webcam.script).toMatch(/went through his files/i);
  });
  it("keeps evidence choices visible but locked until their file is opened", () => {
    let state = followFirstAvailable(open(), (s) => s.story.nodeId === "s3");
    const photo = state.story.choices.find((c) => c.id === "s3-photo")!;
    expect(photo.disabled).toBe(true);
    state = reduceNarrative(state, {
      type: "FILE_OPENED",
      fileId: "holiday_photo",
    }).nextState;
    expect(state.story.choices.find((c) => c.id === "s3-photo")?.disabled).toBe(
      false,
    );
  });
  it("unlocks the evidence chain moving note → chat log → warning note", () => {
    let state = open();
    state = reduceNarrative(state, {
      type: "FILE_OPENED",
      fileId: "moving_note",
    }).nextState;
    expect(state.unlockedFiles).toContain("chat_log");
    state = reduceNarrative(state, {
      type: "FILE_OPENED",
      fileId: "chat_log",
    }).nextState;
    expect(state.unlockedFiles).toContain("warning_note");
  });
  it("continues into chapter two when the route-specific webcam invitation is declined", () => {
    let state = followFirstAvailable(open(), (s) => s.story.nodeId === "s5");
    state = choose(state, "s5-truth").nextState;
    state = followFirstAvailable(state, (s) => s.phase === "webcam_preparing");
    state = reduceNarrative(state, { type: "LTX_CONDITIONS_READY" }).nextState;
    const declined = reduceNarrative(state, { type: "WEBCAM_DECLINED" });
    expect(declined.nextState.completed).toBe(false);
    expect(declined.nextState.chapter).toBe(2);
    expect(declined.nextState.chapterTwo.stage).toBe("file_offer");
    expect(declined.nextState.routeFlags.webcamDeclines).toBe(1);
  });
  it("does not allow free text to advance authored nodes", () => {
    const state = open();
    const result = reduceNarrative(state, {
      type: "USER_MESSAGES",
      messages: ["skip to ending"],
    });
    expect(result.nextState.story.nodeId).toBe("s0");
    expect(result.authoredMessages[0].text).toMatch(/replies below/);
  });
  it("uses five distinct idle prompts, goes temporarily offline, and resumes the same node", () => {
    let state = open();
    const node = state.story.nodeId;
    const choices = state.story.choices;
    const lines: string[] = [];
    for (let i = 0; i < 5; i++) {
      const result = reduceNarrative(state, { type: "IDLE_NUDGE_DUE" });
      state = result.nextState;
      lines.push(result.authoredMessages[0].text);
    }
    expect(new Set(lines).size).toBe(5);
    expect(state.temporarilyOffline).toBe(true);
    expect(state.completed).toBe(false);
    expect(state.story.nodeId).toBe(node);
    expect(state.story.choices).toEqual(choices);
    const resumed = reduceNarrative(state, { type: "CHAT_REOPENED" });
    expect(resumed.nextState.temporarilyOffline).toBe(false);
    expect(resumed.nextState.idlePromptCount).toBe(0);
    expect(resumed.nextState.story.nodeId).toBe(node);
    expect(resumed.nextState.story.choices).toEqual(choices);
    expect(resumed.authoredMessages[0].text).toBe("ur back");
  });
  it("resets idle pressure after a story choice", () => {
    let state = open();
    state = reduceNarrative(state, { type: "IDLE_NUDGE_DUE" }).nextState;
    state = reduceNarrative(state, { type: "IDLE_NUDGE_DUE" }).nextState;
    expect(state.idlePromptCount).toBe(2);
    state = choose(state, "s0-guarded").nextState;
    expect(state.idlePromptCount).toBe(0);
    expect(state.temporarilyOffline).toBe(false);
  });
  it("blocks story choices while temporarily offline until the chat is reopened", () => {
    let state = open();
    for (let i = 0; i < 5; i++)
      state = reduceNarrative(state, { type: "IDLE_NUDGE_DUE" }).nextState;
    const blocked = choose(state, "s0-guarded");
    expect(blocked.nextState).toEqual(state);
    expect(blocked.authoredMessages).toHaveLength(0);
    state = reduceNarrative(state, { type: "CHAT_REOPENED" }).nextState;
    expect(choose(state, "s0-guarded").nextState.story.nodeId).toBe("s1");
  });
  it.each(["webcam_preparing", "webcam_invite", "webcam_active"] as const)(
    "ignores idle pressure during %s",
    (phase) => {
      const state = { ...open(), phase };
      const result = reduceNarrative(state, { type: "IDLE_NUDGE_DUE" });
      expect(result.nextState.idlePromptCount).toBe(0);
      expect(result.authoredMessages).toHaveLength(0);
    },
  );
  it("ignores stale LTX failures outside a routed webcam lifecycle", () => {
    const state = open();
    const result = reduceNarrative(state, {
      type: "LTX_FAILED",
      reason: "stale callback",
    });
    expect(result.nextState).toEqual(state);
    expect(result.authoredMessages).toHaveLength(0);
  });
  it.each(["truth", "impersonation", "silence"] as StoryRoute[])(
    "handles an LTX failure safely inside the %s webcam lifecycle",
    (route) => {
      let state = followFirstAvailable(open(), (s) => s.story.nodeId === "s5");
      state = choose(
        state,
        `s5-${route === "impersonation" ? "lie" : route}`,
      ).nextState;
      state = followFirstAvailable(
        state,
        (s) => s.phase === "webcam_preparing",
      );
      const result = reduceNarrative(state, {
        type: "LTX_FAILED",
        reason: "provider",
      });
      expect(result.nextState.phase).toBe("post_webcam");
      expect(result.nextState.story.nodeId).toBe(
        route === "impersonation" ? "lie5" : `${route}5`,
      );
      expect(result.nextState.story.choices).toHaveLength(3);
    },
  );
  it("keeps every public event schema-valid across all narrative lifecycle states", () => {
    let preparing = followFirstAvailable(
      open(),
      (s) => s.story.nodeId === "s5",
    );
    preparing = choose(preparing, "s5-truth").nextState;
    preparing = followFirstAvailable(
      preparing,
      (s) => s.phase === "webcam_preparing",
    );
    const invite = reduceNarrative(preparing, {
      type: "LTX_CONDITIONS_READY",
    }).nextState;
    const active = reduceNarrative(invite, {
      type: "WEBCAM_ACCEPTED",
    }).nextState;
    const post = reduceNarrative(active, { type: "LTX_COMPLETED" }).nextState;
    let offline = open();
    for (let i = 0; i < 5; i++)
      offline = reduceNarrative(offline, { type: "IDLE_NUDGE_DUE" }).nextState;
    const complete = choose(post, post.story.choices[0].id).nextState;
    const states = [
      createInitialState("matrix"),
      open(),
      preparing,
      invite,
      active,
      post,
      offline,
      complete,
    ];
    for (const state of states) {
      const choiceId = state.story.choices.find((item) => !item.disabled)?.id;
      const events: NarrativeEvent[] = [
        { type: "MSN_OPENED" },
        { type: "USER_MESSAGES", messages: ["hello"] },
        ...(choiceId ? [{ type: "STORY_CHOICE", choiceId } as const] : []),
        { type: "FILE_OPENED", fileId: "moving_note" },
        { type: "REQUESTED_OBJECT_TIMEOUT", objectId: "moving_note" },
        { type: "LTX_CONDITIONS_READY" },
        { type: "WEBCAM_ACCEPTED" },
        { type: "WEBCAM_DECLINED" },
        { type: "LTX_COMPLETED" },
        { type: "LTX_FAILED", reason: "provider" },
        { type: "MSN_LOGOUT_ATTEMPTED" },
        { type: "IDLE_NUDGE_DUE" },
        { type: "CHAT_REOPENED" },
      ];
      for (const event of events) {
        const result = reduceNarrative(structuredClone(state), event);
        expect(
          () => StateSchema.parse(result.nextState),
          `${state.phase} + ${event.type}`,
        ).not.toThrow();
      }
    }
  });
});
