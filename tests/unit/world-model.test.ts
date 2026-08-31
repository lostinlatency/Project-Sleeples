import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/director/initial-state";
import { reduceNarrative } from "@/lib/director/reducer";
import {
  applyChoiceBeliefs,
  routeScript,
  STORY,
} from "@/content/server/story";
import {
  CONTACT_WEBCAM_SCRIPTS,
  contactWebcamScript,
  witnessAside,
} from "@/content/server/chapter-two";
import { FILE_CONTENTS, fileContentsFor } from "@/content/server/file-contents";
import { emilySuspicion, publicView, StateSchema } from "@/lib/director/types";
import { openState, sealState } from "@/lib/narrative/session-envelope";

function open() {
  return reduceNarrative(createInitialState("world-test"), {
    type: "MSN_OPENED",
  }).nextState;
}
function at(state: ReturnType<typeof open>, nodeId: string) {
  return {
    ...state,
    story: { ...state.story, nodeId, visited: [...state.story.visited, nodeId] },
  };
}
function choose(state: ReturnType<typeof open>, choiceId: string) {
  return reduceNarrative(state, { type: "STORY_CHOICE", choiceId });
}
function chapterTwoFixture() {
  const initial = createInitialState("world-c2");
  return StateSchema.parse({
    ...initial,
    chapter: 2,
    story: { ...initial.story, route: "truth" as const, choices: [] },
    chapterTwo: {
      ...initial.chapterTwo,
      chapterOneOutcome: "truth" as const,
      stage: "interviews" as const,
      exposureStage: 1,
    },
  }) as ReturnType<typeof createInitialState>;
}

describe("belief world model", () => {
  it("shifts beliefs by tone: honesty lowers the Daniel belief, evasion erodes trust", () => {
    const state = open();
    const shift = applyChoiceBeliefs(state, STORY.s1.choices[1]);
    expect(shift.beliefs.userIsDaniel).toBeCloseTo(0.82, 5);
    expect(shift.beliefs.trust).toBeGreaterThan(state.beliefs.trust);
    const avoid = applyChoiceBeliefs(state, STORY.s1.choices[2]);
    expect(avoid.beliefs.trust).toBeLessThan(state.beliefs.trust);
  });
  it("records identity facts on the route choices", () => {
    let state = open();
    state = choose(at(state, "s5"), "s5-truth").nextState;
    expect(state.facts.visitorClaimsNotDaniel).toBe(true);
    expect(state.beliefs.userIsDaniel).toBeLessThanOrEqual(0.12);
    state = choose(at(open(), "s5"), "s5-lie").nextState;
    expect(state.beliefs.userIsDaniel).toBe(0.97);
  });
  it("emits the year-flicker reaction once when the visitor claims 2026", () => {
    const state = at(open(), "truth0");
    const once = applyChoiceBeliefs(state, STORY.truth0.choices[0]);
    expect(once.lines).toEqual(["the screen just flickered when u typed that year"]);
    expect(once.facts.claimedYear).toBe(2026);
    const again = applyChoiceBeliefs(
      { ...state, notices: once.notices },
      STORY.truth0.choices[0],
    );
    expect(again.lines).toEqual([]);
  });
  it("keeps the reaction contract intact and appends suspicion lines after it", () => {
    const prepared = reduceNarrative(
      {
        ...open(),
        discoveredFiles: [
          "holiday_photo",
          "moving_note",
          "chat_log",
          "warning_note",
        ],
      },
      { type: "STORY_CHOICE", choiceId: "s0-honest" },
    );
    expect(prepared.authoredMessages[1]?.text).toBe("found it? what do u mean");
    expect(
      prepared.authoredMessages
        .slice(2)
        .some((m) => m.text.includes("never opened that folder twice")),
    ).toBe(true);
    expect(prepared.nextState.notices).toContain("doubt-files");
  });
  it("raises abandonment pressure from idles and declined webcams", () => {
    let state = open();
    for (let i = 0; i < 3; i++)
      state = reduceNarrative(state, { type: "IDLE_NUDGE_DUE" }).nextState;
    expect(state.beliefs.abandonmentFear).toBeGreaterThan(0.28);
    const declined = reduceNarrative(
      { ...open(), phase: "webcam_invite" as const },
      { type: "WEBCAM_DECLINED" },
    ).nextState;
    expect(declined.beliefs.abandonmentFear).toBeGreaterThan(0.4);
  });
  it("derives a bounded suspicion signal for the public view", () => {
    const initial = publicView(createInitialState("suspicion"));
    expect(initial.emilySuspicion).toBeGreaterThan(0);
    expect(initial.emilySuspicion).toBeLessThan(0.3);
    let state = open();
    state = choose(at(state, "s5"), "s5-truth").nextState;
    const after = publicView(state);
    expect(after.emilySuspicion).toBeGreaterThan(initial.emilySuspicion);
    expect(emilySuspicion(state)).toBeLessThanOrEqual(1);
  });
  it("parses envelopes saved before the notices field existed", async () => {
    const legacy = createInitialState("legacy-save");
    const raw = JSON.parse(
      JSON.stringify({ ...legacy, notices: undefined }),
    );
    delete raw.notices;
    const restored = await openState(await sealState(raw));
    expect(restored.notices).toEqual([]);
    expect(() => StateSchema.parse(restored)).not.toThrow();
  });
});

describe("reactive performances", () => {
  it("leaves canonical route scripts untouched under default conditions", () => {
    const neutral = open();
    expect(routeScript("truth", neutral)).toBe(routeScript("truth"));
    expect(routeScript("truth", neutral)).toContain(
      "I kept thinking Daniel would come back",
    );
    expect(routeScript("truth")).not.toMatch(/tell him/i);
  });
  it("appends belief-driven sentences only under pressure", () => {
    const idle = { ...open(), idlePromptCount: 4 };
    expect(routeScript("truth", idle)).toContain("You kept going quiet");
    expect(routeScript("truth", idle)).not.toMatch(/tell him/i);
    expect(
      routeScript("truth", idle).match(/doesn't have to come back/gi),
    ).toHaveLength(1);
    const declined = {
      ...open(),
      routeFlags: { toldTruth: false, impersonatedDaniel: true, webcamDeclines: 1 },
    };
    expect(routeScript("impersonation", declined)).toContain(
      "declined my camera once tonight",
    );
    const afraid = {
      ...open(),
      beliefs: { ...open().beliefs, abandonmentFear: 0.8 },
    };
    expect(routeScript("silence", afraid)).toContain(
      "If the picture stops",
    );
  });
  it("returns the base chapter-two script for a neutral performance context", () => {
    const state = chapterTwoFixture();
    for (const contactId of ["mike_sk8", "sarahlou_x", "tom_d"] as const)
      expect(contactWebcamScript(contactId, state)).toBe(
        CONTACT_WEBCAM_SCRIPTS[contactId],
      );
  });
  it("varies chapter-two performances by trust, transfer decision, and exposure", () => {
    const base = chapterTwoFixture();
    const cold = contactWebcamScript("mike_sk8", {
      ...base,
      chapterTwo: {
        ...base.chapterTwo,
        contactTrust: { ...base.chapterTwo.contactTrust, mike_sk8: -2 },
      },
    });
    expect(cold).toContain("almost didn't turn the camera on");
    const exposed = contactWebcamScript("sarahlou_x", {
      ...base,
      chapterTwo: { ...base.chapterTwo, exposureStage: 4 },
    });
    expect(exposed).toContain("learns between sentences");
    const refused = contactWebcamScript("mike_sk8", {
      ...base,
      chapterTwo: {
        ...base.chapterTwo,
        fileTransferDecision: "declined" as const,
      },
    });
    expect(refused).toContain("file you refused");
    for (const script of [cold, exposed, refused]) {
      const sentences = script
        .split(/[.!?]+/)
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean);
      expect(new Set(sentences).size).toBe(sentences.length);
    }
  });
  it("adds witness asides only for extreme chapter-one belief states, once", () => {
    const state = chapterTwoFixture();
    expect(witnessAside("mike_sk8", state)).toBeNull();
    const honest = { ...state, beliefs: { ...state.beliefs, userIsDaniel: 0.1 } };
    expect(witnessAside("mike_sk8", honest)).toContain("straight away");
    const spent = { ...honest, notices: [...honest.notices, "aside-mike_sk8"] };
    expect(witnessAside("mike_sk8", spent)).toBeNull();
    const opened = reduceNarrative(
      { ...chapterTwoFixture(), beliefs: { ...state.beliefs, userIsDaniel: 0.1 } },
      { type: "CONTACT_OPENED", contactId: "mike_sk8" },
    );
    expect(
      opened.authoredMessages.some((m) => m.text.includes("straight away")),
    ).toBe(true);
    expect(opened.nextState.notices).toContain("aside-mike_sk8");
  });
});

describe("files that talk back", () => {
  it("keeps chapter-one contents stable", () => {
    const state = createInitialState("files-1");
    expect(fileContentsFor(state, "chat_log")).toEqual(FILE_CONTENTS.chat_log);
    expect(fileContentsFor(state, "moving_note")).toEqual(
      FILE_CONTENTS.moving_note,
    );
  });
  it("appends recovered entries to the chat log in chapter two", () => {
    const state = {
      ...chapterTwoFixture(),
      chapterTwo: { ...chapterTwoFixture().chapterTwo, exposureStage: 2 },
    };
    const content = fileContentsFor(state, "chat_log").content ?? "";
    expect(content).toContain("entries appended after device recovery");
    expect(content).toContain("he never came back. i waited anyway");
    expect(fileContentsFor(state, "chat_log").corrupted).toBe(true);
  });
  it("grows brb_users while the session is observed and unmasks the visitor late", () => {
    const early = chapterTwoFixture();
    const late = {
      ...chapterTwoFixture(),
      turn: 40,
      chapterTwo: { ...chapterTwoFixture().chapterTwo, exposureStage: 4 },
    };
    const earlyContent = fileContentsFor(early, "brb_users").content ?? "";
    const lateContent = fileContentsFor(late, "brb_users").content ?? "";
    expect(lateContent).toContain("visitor");
    expect(earlyContent).toContain("?????");
    expect(lateContent).not.toContain("?????");
    expect(lateContent).toContain("writing continues");
  });
  it("maps the visitor into the contact cache as the story converges", () => {
    const pending = chapterTwoFixture();
    expect(fileContentsFor(pending, "contact_cache").content).toContain(
      "[building…]",
    );
    const converged = {
      ...chapterTwoFixture(),
      chapterTwo: {
        ...chapterTwoFixture().chapterTwo,
        fileTransferDecision: "inspected" as const,
        completedContacts: ["mike_sk8", "sarahlou_x", "tom_d"] as [
          "mike_sk8",
          "sarahlou_x",
          "tom_d",
        ],
      },
    };
    const content = fileContentsFor(converged, "contact_cache").content ?? "";
    expect(content).toContain("visitor => you");
    expect(content).toContain("Integrity: foreign");
  });
  it("adds photographic evidence captions only after deep exposure", () => {
    const early = chapterTwoFixture();
    expect(fileContentsFor(early, "holiday_photo").caption).toBeUndefined();
    const late = {
      ...chapterTwoFixture(),
      chapterTwo: { ...chapterTwoFixture().chapterTwo, exposureStage: 4 },
    };
    expect(fileContentsFor(late, "holiday_photo").caption).toContain(
      "third flag",
    );
    expect(fileContentsFor(chapterTwoFixture(), "webcam_still").meta).toContain(
      "1 frame",
    );
  });
  it("emits the file reaction line exactly once per file", () => {
    const first = reduceNarrative(open(), {
      type: "FILE_OPENED",
      fileId: "holiday_photo",
    });
    expect(
      first.authoredMessages.some((m) => m.text.includes("kept that photo")),
    ).toBe(true);
    expect(first.nextState.notices).toContain("file-holiday_photo");
    const second = reduceNarrative(first.nextState, {
      type: "FILE_OPENED",
      fileId: "holiday_photo",
    });
    expect(
      second.authoredMessages.some((m) => m.text.includes("kept that photo")),
    ).toBe(false);
  });
});
