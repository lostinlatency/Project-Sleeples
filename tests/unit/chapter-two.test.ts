import { describe, expect, it } from "vitest";
import {
  CHAPTER_TWO_REACTIONS,
  CHAPTER_TWO_STORY,
  CONTACT_WEBCAM_SCRIPTS,
  chapterTwoChoices,
  chapterTwoChoiceCallback,
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
    state = event(state, { type: "LTX_FAILED", reason: "test transport" });
  else {
    state = event(state, { type: "LTX_CONDITIONS_READY" });
    if (outcome === "decline") state = event(state, { type: "WEBCAM_DECLINED" });
    else {
      state = event(state, { type: "WEBCAM_ACCEPTED" });
      state = event(state, { type: "LTX_COMPLETED" });
    }
  }
  const postChoice = state.chapterTwo.contactThreads[contactId].choices.find(
    (item) => !item.disabled,
  );
  if (!postChoice) throw new Error(`No post-webcam choice for ${contactId}`);
  return event(state, { type: "CONTACT_CHOICE", choiceId: postChoice.id });
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
  it("executes every authored Chapter Two choice from a valid state", () => {
    const allEvidence = [
      "file_payload",
      "file_fragment",
      "warning_note",
      "brb_readme",
      "brb_users",
      "sarah_log",
      "emily_goodbye",
      "contact_cache",
      "tom_memory",
      "mike_private",
      "sarah_private",
      "tom_private",
      "truth_reveal",
      "impersonation_reveal",
      "silence_reveal",
    ];

    for (const node of Object.values(CHAPTER_TWO_STORY)) {
      for (const choice of node.choices) {
        const initial = chapterTwo("truth");
        const state = StateSchema.parse({
          ...initial,
          phase: "normal",
          discoveredFiles: allEvidence,
          unlockedFiles: allEvidence,
          chapterTwo: {
            ...initial.chapterTwo,
            stage: node.contactId === "sleepless_17" ? "final" : "interviews",
            activeContact: node.contactId,
            knownEvidence: allEvidence,
            completedContacts: [],
            contactThreads: {
              ...initial.chapterTwo.contactThreads,
              [node.contactId]: {
                nodeId: node.id,
                visited: [node.id],
                choices: chapterTwoChoices(
                  {
                    ...initial,
                    discoveredFiles: allEvidence,
                    chapterTwo: {
                      ...initial.chapterTwo,
                      knownEvidence: allEvidence,
                    },
                  },
                  node.id,
                ),
                opened: true,
                completed: false,
              },
            },
          },
        });
        const result = reduceNarrative(state, {
          type: "CONTACT_CHOICE",
          choiceId: choice.id,
        });
        if (choice.id.startsWith("final-")) {
          expect(result.nextState.completed, choice.id).toBe(true);
          expect(result.nextState.chapterTwo.finalDecision, choice.id).toBe(
            choice.id.replace("final-", ""),
          );
          continue;
        }
        expect(result.authoredMessages[0]?.text, choice.id).toContain(
          choice.label,
        );
        expect(result.authoredMessages[1]?.text, choice.id).toBe(
          CHAPTER_TWO_REACTIONS[choice.id],
        );
        if (node.preparesWebcam) {
          expect(result.nextState.phase, choice.id).toBe("webcam_preparing");
          expect(result.shouldPrepareWebcam, choice.id).toBe(true);
        } else if (node.completesContact) {
          expect(
            result.nextState.chapterTwo.completedContacts,
            choice.id,
          ).toContain(node.contactId);
        } else if (choice.next) {
          expect(
            result.nextState.chapterTwo.contactThreads[node.contactId].nodeId,
            choice.id,
          ).toBe(choice.next);
        }
        expect(() => StateSchema.parse(result.nextState), choice.id).not.toThrow();
      }
    }
  });

  it("keeps all character performance scripts distinct and free of repeated sentences", () => {
    const scripts = Object.entries(CONTACT_WEBCAM_SCRIPTS);
    expect(scripts).toHaveLength(3);
    expect(new Set(scripts.map(([, script]) => script)).size).toBe(3);
    for (const [contactId, script] of scripts) {
      const sentences = script
        .split(/[.!?]+/)
        .map((sentence) => sentence.trim().toLowerCase())
        .filter(Boolean);
      expect(new Set(sentences).size, contactId).toBe(sentences.length);
      expect(script.length, contactId).toBeGreaterThan(60);
    }
  });

  it("uses the corrected one-way webcam premise", () => {
    expect(CHAPTER_TWO_STORY["c2-emily0"].lines).toBeDefined();
    expect(CHAPTER_TWO_STORY.mike4.lines).toContain(
      "the label said brb_backup_2 before the freeze",
    );
    expect(CHAPTER_TWO_STORY.mike3.lines.join(" ")).not.toContain(
      "see your camera",
    );
  });

  it("calls back specific Chapter One choices instead of only the route", () => {
    const state = chapterTwo("impersonation");
    state.story.choiceHistory = ["l2-love", "l3-blame", "l5-double"];
    expect(chapterTwoChoiceCallback(state, "mike_sk8")).toContain(
      "told em u loved her",
    );
    expect(chapterTwoChoiceCallback(state, "sarahlou_x")).toContain(
      "watching too closely",
    );
    expect(chapterTwoChoiceCallback(state, "tom_d")).toContain(
      "kept pretending",
    );
  });

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

  it("certifies the complete route × transfer × witness-order × ending matrix", () => {
    let journeys = 0;
    for (const route of ["truth", "impersonation", "silence"] as const) {
      for (const transfer of ["accepted", "declined", "inspected"] as const) {
        for (const order of [
          ["sarahlou_x", "tom_d"],
          ["tom_d", "sarahlou_x"],
        ] as const) {
          for (const decision of ["quarantine", "release", "erase"] as const) {
            const final = event(reachFinal(route, transfer, order), {
              type: "CHAPTER_TWO_FINAL_DECISION",
              decision,
            });
            expect(final.completed).toBe(true);
            expect(final.chapterTwo.chapterOneOutcome).toBe(route);
            expect(final.chapterTwo.fileTransferDecision).toBe(transfer);
            expect(final.chapterTwo.finalDecision).toBe(decision);
            expect(final.chapterTwo.completedContacts).toEqual(
              expect.arrayContaining(["mike_sk8", "sarahlou_x", "tom_d"]),
            );
            expect(() => StateSchema.parse(final)).not.toThrow();
            journeys++;
          }
        }
      }
    }
    expect(journeys).toBe(54);
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

  it("requires a meaningful reply after a webcam before a witness leaves", () => {
    let state = event(chapterTwo(), {
      type: "FILE_TRANSFER_DECIDED",
      decision: "accepted",
    });
    state = event(state, { type: "CONTACT_OPENED", contactId: "mike_sk8" });
    for (const choiceId of ["m0-calm", "m1-tech", "m2-list", "m3-accept"])
      state = event(state, { type: "CONTACT_CHOICE", choiceId });
    state = event(state, { type: "LTX_CONDITIONS_READY" });
    state = event(state, { type: "WEBCAM_ACCEPTED" });
    state = event(state, { type: "LTX_COMPLETED" });
    expect(state.chapterTwo.completedContacts).not.toContain("mike_sk8");
    expect(state.chapterTwo.contactThreads.mike_sk8.nodeId).toBe("mike4");
    expect(state.chapterTwo.contactThreads.mike_sk8.choices).toHaveLength(3);
    state = event(state, { type: "CONTACT_CHOICE", choiceId: "m4-emily" });
    expect(state.chapterTwo.completedContacts).toContain("mike_sk8");
  });

  it("turns trust into optional evidence sharing or refusal", () => {
    let trusted = event(chapterTwo(), {
      type: "FILE_TRANSFER_DECIDED",
      decision: "accepted",
    });
    trusted = event(trusted, { type: "CONTACT_OPENED", contactId: "mike_sk8" });
    for (const choiceId of ["m0-calm", "m1-tech", "m2-list", "m3-accept"])
      trusted = event(trusted, { type: "CONTACT_CHOICE", choiceId });
    trusted = event(trusted, { type: "LTX_FAILED", reason: "test" });
    expect(trusted.unlockedFiles).toContain("mike_private");

    let hostile = event(chapterTwo(), {
      type: "FILE_TRANSFER_DECIDED",
      decision: "accepted",
    });
    hostile = event(hostile, { type: "CONTACT_OPENED", contactId: "mike_sk8" });
    for (const choiceId of ["m0-accuse", "m1-purpose", "m2-believe", "m3-pressure"])
      hostile = event(hostile, { type: "CONTACT_CHOICE", choiceId });
    hostile = event(hostile, { type: "LTX_FAILED", reason: "test" });
    expect(hostile.unlockedFiles).not.toContain("mike_private");
    expect(hostile.recentMessages.at(-1)?.text).toContain(
      "not sending u my private copy",
    );
  });

  it.each([
    ["truth", "truth_reveal"],
    ["impersonation", "impersonation_reveal"],
    ["silence", "silence_reveal"],
  ] as const)("unlocks only the %s route reveal", (route, reveal) => {
    const state = reachFinal(route, "accepted");
    expect(state.unlockedFiles).toContain(reveal);
    expect(
      ["truth_reveal", "impersonation_reveal", "silence_reveal"].filter(
        (id) => state.unlockedFiles.includes(id),
      ),
    ).toEqual([reveal]);
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

  it.each(
    witnesses.flatMap((contactId) =>
      (["success", "failure", "decline"] as const).map(
        (outcome) => [contactId, outcome] as const,
      ),
    ),
  )(
    "advances %s exactly once after LTX %s",
    (contactId, outcome) => {
      let state = event(chapterTwo(), {
        type: "FILE_TRANSFER_DECIDED",
        decision: "accepted",
      });
      if (contactId !== "mike_sk8") state = finishWitness(state, "mike_sk8");
      state = finishWitness(state, contactId, outcome);
      expect(state.chapterTwo.completedContacts).toContain(contactId);
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
