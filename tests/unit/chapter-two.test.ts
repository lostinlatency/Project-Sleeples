import { describe, expect, it } from "vitest";
import {
  CHAPTER_TWO_REACTIONS,
  CHAPTER_TWO_STORY,
} from "@/content/server/chapter-two";
import { createInitialState } from "@/lib/director/initial-state";
import { reduceNarrative } from "@/lib/director/reducer";
import { writeWebcamScript } from "@/lib/ai/webcam-writer";
import {
  StateSchema,
  type NarrativeState,
  type StoryRoute,
} from "@/lib/director/types";

type WitnessId = "mike_sk8" | "sarahlou_x" | "tom_d";
const witnesses: readonly WitnessId[] = ["mike_sk8", "sarahlou_x", "tom_d"];

function chapterTwo(route: StoryRoute = "truth") {
  const initial = createInitialState(`chapter-two-${route}`);
  return StateSchema.parse({
    ...initial,
    chapter: 2,
    story: { ...initial.story, route, choices: [] },
    chapterTwo: {
      ...initial.chapterTwo,
      chapterOneOutcome: route,
      stage: "file_offer",
      exposureStage: 1,
    },
  });
}

function event(
  state: NarrativeState,
  value: Parameters<typeof reduceNarrative>[1],
) {
  return reduceNarrative(state, value).nextState;
}

function finishWitness(
  state: NarrativeState,
  contactId: WitnessId,
  outcome: "success" | "failure" | "decline" = "success",
) {
  state = event(state, { type: "CONTACT_OPENED", contactId });
  let guard = 8;
  while (state.phase !== "webcam_preparing" && guard-- > 0) {
    const choice = state.chapterTwo.contactThreads[contactId].choices.find(
      (item) => !item.disabled,
    );
    if (!choice) throw new Error(`No available choice for ${contactId}`);
    state = event(state, { type: "CONTACT_CHOICE", choiceId: choice.id });
  }
  if (state.phase !== "webcam_preparing")
    throw new Error(`No webcam for ${contactId}`);
  if (outcome === "failure")
    return event(state, { type: "LTX_FAILED", reason: "test transport" });
  state = event(state, { type: "LTX_CONDITIONS_READY" });
  if (outcome === "decline") return event(state, { type: "WEBCAM_DECLINED" });
  state = event(state, { type: "WEBCAM_ACCEPTED" });
  return event(state, { type: "LTX_COMPLETED" });
}

function reachFinal(
  route: StoryRoute,
  transfer: "accepted" | "declined" | "inspected",
  order: readonly ["sarahlou_x" | "tom_d", "sarahlou_x" | "tom_d"] = [
    "sarahlou_x",
    "tom_d",
  ],
) {
  let state = event(chapterTwo(route), {
    type: "FILE_TRANSFER_DECIDED",
    decision: transfer,
  });
  state = finishWitness(state, "mike_sk8");
  state = finishWitness(state, order[0]);
  state = finishWitness(state, order[1]);
  expect(state.chapterTwo.stage).toBe("convergence");
  state = event(state, { type: "CONTACT_OPENED", contactId: "sleepless_17" });
  state = event(state, {
    type: "CONTACT_CHOICE",
    choiceId: state.chapterTwo.contactThreads.sleepless_17.choices[0].id,
  });
  expect(state.chapterTwo.stage).toBe("final");
  return state;
}

describe("chapter two story graph", () => {
  it("does not let an offline witness bypass the file-transfer decision", () => {
    const state = chapterTwo();
    const attempted = event(state, {
      type: "CONTACT_OPENED",
      contactId: "mike_sk8",
    });
    expect(attempted).toEqual(state);
    expect(attempted.chapterTwo.stage).toBe("file_offer");
  });

  it("has valid links, unique choices, authored reactions, and three intentional options per node", () => {
    const choiceIds: string[] = [];
    for (const node of Object.values(CHAPTER_TWO_STORY)) {
      expect(node.lines.length, node.id).toBeGreaterThan(0);
      expect(node.choices, node.id).toHaveLength(3);
      for (const choice of node.choices) {
        choiceIds.push(choice.id);
        expect(choice.label.trim(), choice.id).not.toBe("");
        if (choice.next)
          expect(CHAPTER_TWO_STORY[choice.next], choice.id).toBeDefined();
        if (!choice.id.startsWith("final-"))
          expect(CHAPTER_TWO_REACTIONS[choice.id], choice.id).toBeTruthy();
      }
    }
    expect(new Set(choiceIds).size).toBe(choiceIds.length);
  });

  it.each(["accepted", "declined", "inspected"] as const)(
    "lets the %s transfer route reach every final",
    (transfer) => {
      for (const decision of ["quarantine", "release", "erase"] as const) {
        const final = event(reachFinal("truth", transfer), {
          type: "CHAPTER_TWO_FINAL_DECISION",
          decision,
        });
        expect(final.completed).toBe(true);
        expect(final.chapterTwo.finalDecision).toBe(decision);
        expect(final.chapterTwo.stage).toBe("complete");
      }
    },
  );

  it.each(["truth", "impersonation", "silence"] as const)(
    "preserves the %s callback across all three endings",
    (route) => {
      for (const decision of ["quarantine", "release", "erase"] as const) {
        const final = event(
          reachFinal(route, "inspected", ["tom_d", "sarahlou_x"]),
          { type: "CHAPTER_TWO_FINAL_DECISION", decision },
        );
        expect(final.chapterTwo.chapterOneOutcome).toBe(route);
        expect(final.chapterTwo.finalDecision).toBe(decision);
      }
    },
  );

  it("supports Sarah and Tom in either order without skipping convergence", () => {
    for (const order of [
      ["sarahlou_x", "tom_d"],
      ["tom_d", "sarahlou_x"],
    ] as const) {
      expect(reachFinal("truth", "declined", order).chapterTwo.stage).toBe(
        "final",
      );
    }
  });

  it("keeps the final witness visible until the player opens Emily's notification", () => {
    let state = event(chapterTwo(), {
      type: "FILE_TRANSFER_DECIDED",
      decision: "accepted",
    });
    state = finishWitness(state, "mike_sk8");
    state = finishWitness(state, "tom_d");
    state = finishWitness(state, "sarahlou_x");
    expect(state.chapterTwo.stage).toBe("convergence");
    expect(state.chapterTwo.activeContact).toBe("sarahlou_x");
    state = event(state, {
      type: "CONTACT_OPENED",
      contactId: "sleepless_17",
    });
    expect(state.chapterTwo.activeContact).toBe("sleepless_17");
  });

  it("keeps evidence confrontations locked until their files are opened", () => {
    let state = event(chapterTwo(), {
      type: "FILE_TRANSFER_DECIDED",
      decision: "declined",
    });
    state = event(state, { type: "CONTACT_OPENED", contactId: "mike_sk8" });
    state = event(state, { type: "CONTACT_CHOICE", choiceId: "m0-calm" });
    state = event(state, { type: "CONTACT_CHOICE", choiceId: "m1-tech" });
    expect(
      state.chapterTwo.contactThreads.mike_sk8.choices.find(
        (choice) => choice.id === "m2-note",
      )?.disabled,
    ).toBe(true);
    state = event(state, {
      type: "EVIDENCE_INSPECTED",
      evidenceId: "warning_note",
    });
    expect(
      state.chapterTwo.contactThreads.mike_sk8.choices.find(
        (choice) => choice.id === "m2-note",
      )?.disabled,
    ).toBe(false);
  });

  it.each(["failure", "decline"] as const)(
    "uses written fallback after LTX %s and advances exactly once",
    (outcome) => {
      let state = event(chapterTwo(), {
        type: "FILE_TRANSFER_DECIDED",
        decision: "accepted",
      });
      state = finishWitness(state, "mike_sk8", outcome);
      expect(state.chapterTwo.completedContacts).toEqual(["mike_sk8"]);
      const replay = event(state, { type: "LTX_FAILED", reason: "stale" });
      expect(replay).toEqual(state);
    },
  );

  it("recovers a non-executable fragment later when the incoming file was rejected", () => {
    let state = event(chapterTwo(), {
      type: "FILE_TRANSFER_DECIDED",
      decision: "declined",
    });
    state = finishWitness(state, "mike_sk8");
    expect(state.unlockedFiles).toContain("file_fragment");
    expect(state.chapterTwo.knownEvidence).toContain("file_fragment");
  });

  it.each(witnesses)(
    "authors a schema-valid, distinct %s LTX performance",
    async (contactId) => {
      let state = event(chapterTwo(), {
        type: "FILE_TRANSFER_DECIDED",
        decision: "accepted",
      });
      if (contactId !== "mike_sk8") state = finishWitness(state, "mike_sk8");
      state = event(state, { type: "CONTACT_OPENED", contactId });
      let guard = 8;
      while (state.phase !== "webcam_preparing" && guard-- > 0) {
        const choice = state.chapterTwo.contactThreads[contactId].choices.find(
          (item) => !item.disabled,
        )!;
        state = event(state, { type: "CONTACT_CHOICE", choiceId: choice.id });
      }
      const script = await writeWebcamScript(state);
      expect(script.spokenScript).toBe(state.webcam.script);
      expect(script.performanceNotes.length).toBeGreaterThan(40);
    },
  );

  it("keeps each contact's messages isolated in its own persisted thread", () => {
    let state = event(chapterTwo(), {
      type: "FILE_TRANSFER_DECIDED",
      decision: "inspected",
    });
    state = finishWitness(state, "mike_sk8");
    state = event(state, { type: "CONTACT_OPENED", contactId: "sarahlou_x" });
    const mikeMessages = state.recentMessages.filter(
      (message) => message.contactId === "mike_sk8",
    );
    const sarahMessages = state.recentMessages.filter(
      (message) => message.contactId === "sarahlou_x",
    );
    expect(mikeMessages.length).toBeGreaterThan(4);
    expect(sarahMessages.length).toBeGreaterThan(1);
    expect(
      mikeMessages.every((message) => message.contactId === "mike_sk8"),
    ).toBe(true);
    expect(
      sarahMessages.every((message) => message.contactId === "sarahlou_x"),
    ).toBe(true);
  });
});
