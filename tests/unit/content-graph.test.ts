import { describe, expect, it } from "vitest";
import {
  STORY,
  TRANSITION_REACTIONS,
  choicesFor,
} from "@/content/server/story";
import {
  CHAPTER_TWO_REACTIONS,
  CHAPTER_TWO_STORY,
  CONTACT_COMPLETION,
  POST_WEBCAM_NODE,
  WITNESS_FILE_REACTIONS,
  contactWebcamScript,
  postWebcamNode,
  routeExclusiveEvidence,
  witnessFileReaction,
} from "@/content/server/chapter-two";
import { FILE_CONTENTS } from "@/content/server/file-contents";
import { FILES } from "@/lib/filesystem/manifest";
import { createInitialState } from "@/lib/director/initial-state";
import type { ContactId } from "@/lib/director/types";

const fileIds = new Set(FILES.map((file) => file.id));
const chapterTwoEvidenceIds = new Set<string>([
  ...fileIds,
  ...Object.values(CONTACT_COMPLETION).flatMap((entry) => [
    ...entry.evidence,
    ...entry.unlocks,
  ]),
  "file_payload",
  "truth_reveal",
  "impersonation_reveal",
  "silence_reveal",
]);
const choiceIds = new Set(
  Object.values(STORY).flatMap((node) => node.choices.map((c) => c.id)),
);
const chapterTwoChoiceIds = new Set(
  Object.values(CHAPTER_TWO_STORY).flatMap((node) =>
    node.choices.map((c) => c.id),
  ),
);

describe("chapter one story graph", () => {
  it("resolves every choice target and ending", () => {
    for (const node of Object.values(STORY)) {
      expect(node.choices).toHaveLength(3);
      for (const choice of node.choices) {
        if (choice.next) {
          expect(STORY[choice.next], `${node.id} -> ${choice.next}`).toBeDefined();
          expect(choice.ending, `${choice.id} has both next and ending`).toBeUndefined();
        } else {
          expect(choice.ending, `${choice.id} leads nowhere without an ending`).toBeTruthy();
        }
      }
    }
  });

  it("keeps every choice id unique", () => {
    const all = Object.values(STORY).flatMap((node) =>
      node.choices.map((c) => c.id),
    );
    expect(new Set(all).size).toBe(all.length);
  });

  it("only requires files that exist and have readable requirement hints", () => {
    const hinted = new Set([
      "holiday_photo",
      "moving_note",
      "chat_log",
      "warning_note",
    ]);
    for (const node of Object.values(STORY)) {
      for (const choice of node.choices) {
        if (!choice.requiresFile) continue;
        expect(fileIds.has(choice.requiresFile)).toBe(true);
        expect(hinted.has(choice.requiresFile)).toBe(true);
      }
    }
  });

  it("reaches every node from s0", () => {
    const seen = new Set<string>(["s0"]);
    const queue = ["s0"];
    while (queue.length) {
      const nodeId = queue.pop()!;
      for (const choice of STORY[nodeId].choices) {
        if (choice.next && !seen.has(choice.next)) {
          seen.add(choice.next);
          queue.push(choice.next);
        }
      }
    }
    expect(seen.size).toBe(Object.keys(STORY).length);
  });

  it("resolves every transition reaction to a real choice", () => {
    for (const key of Object.keys(TRANSITION_REACTIONS)) {
      expect(choiceIds.has(key), key).toBe(true);
    }
  });

  it("keeps the three webcam epilogues valid", () => {
    for (const nodeId of ["truth5", "lie5", "silence5"]) {
      const node = STORY[nodeId];
      expect(node).toBeDefined();
      for (const choice of node.choices) {
        expect(choice.next).toBeUndefined();
        expect(choice.ending).toBeTruthy();
      }
    }
  });

  it("produces requirement hints only for locked choices", () => {
    const state = createInitialState();
    for (const nodeId of Object.keys(STORY)) {
      for (const choice of choicesFor({ ...state, story: { ...state.story, nodeId, visited: [nodeId] } }, nodeId)) {
        if (choice.disabled) expect(choice.requirement).toBeTruthy();
        else expect(choice.requirement).toBeNull();
      }
    }
  });
});

describe("chapter two story graph", () => {
  it("resolves every choice target, ending, and evidence gate", () => {
    for (const node of Object.values(CHAPTER_TWO_STORY)) {
      expect(node.choices).toHaveLength(3);
      for (const choice of node.choices) {
        if (choice.next) {
          expect(
            CHAPTER_TWO_STORY[choice.next],
            `${node.id} -> ${choice.next}`,
          ).toBeDefined();
        }
        if (choice.requiresEvidence) {
          expect(
            chapterTwoEvidenceIds.has(choice.requiresEvidence),
            `${choice.id} requires unknown evidence ${choice.requiresEvidence}`,
          ).toBe(true);
        }
        if (node.completesContact) {
          expect(choice.next, `${choice.id} must not advance a completed node`).toBeUndefined();
        }
      }
    }
  });

  it("keeps every chapter two choice id unique", () => {
    const all = Object.values(CHAPTER_TWO_STORY).flatMap((node) =>
      node.choices.map((c) => c.id),
    );
    expect(new Set(all).size).toBe(all.length);
  });

  it("resolves every reaction and file reaction to authored content", () => {
    for (const key of Object.keys(CHAPTER_TWO_REACTIONS)) {
      expect(chapterTwoChoiceIds.has(key), key).toBe(true);
    }
    const witnesses: ContactId[] = ["mike_sk8", "sarahlou_x", "tom_d"];
    for (const contactId of witnesses) {
      const reactions = WITNESS_FILE_REACTIONS[
        contactId as "mike_sk8" | "sarahlou_x" | "tom_d"
      ];
      for (const evidenceId of Object.keys(reactions)) {
        expect(fileIds.has(evidenceId), evidenceId).toBe(true);
        expect(
          witnessFileReaction(
            contactId as "mike_sk8" | "sarahlou_x" | "tom_d",
            evidenceId,
          ),
        ).toBe(reactions[evidenceId]);
      }
    }
  });

  it("resolves contact completion files and post-webcam nodes", () => {
    for (const [contactId, entry] of Object.entries(CONTACT_COMPLETION)) {
      for (const id of [...entry.evidence, ...entry.unlocks]) {
        expect(fileIds.has(id), `${contactId}: ${id}`).toBe(true);
      }
      const postNode = postWebcamNode(
        contactId as "mike_sk8" | "sarahlou_x" | "tom_d",
      );
      expect(POST_WEBCAM_NODE[contactId as "mike_sk8" | "sarahlou_x" | "tom_d"]).toBe(postNode);
      expect(CHAPTER_TWO_STORY[postNode]).toBeDefined();
      expect(CHAPTER_TWO_STORY[postNode].contactId).toBe(contactId);
    }
  });

  it("builds webcam scripts for every witness in any trust state", () => {
    const state = createInitialState();
    for (const contactId of ["mike_sk8", "sarahlou_x", "tom_d"] as const) {
      for (const trust of [-3, 0, 2] as const) {
        const scripted = contactWebcamScript(contactId, {
          ...state,
          chapterTwo: {
            ...state.chapterTwo,
            contactTrust: {
              ...state.chapterTwo.contactTrust,
              [contactId]: trust,
            },
            fileTransferDecision: "declined",
            exposureStage: 4,
          },
        });
        expect(scripted.length).toBeGreaterThan(40);
      }
    }
  });

  it("throws for undecided routes and resolves the rest", () => {
    expect(() => routeExclusiveEvidence("undecided")).toThrow();
    expect(routeExclusiveEvidence("truth")).toBe("truth_reveal");
    expect(routeExclusiveEvidence("impersonation")).toBe("impersonation_reveal");
    expect(routeExclusiveEvidence("silence")).toBe("silence_reveal");
  });
});

describe("filesystem manifest", () => {
  it("has unique ids and valid parents", () => {
    expect(new Set(FILES.map((file) => file.id)).size).toBe(FILES.length);
    for (const file of FILES) {
      if (file.parentId !== null) {
        expect(
          fileIds.has(file.parentId),
          `${file.id} parent ${file.parentId}`,
        ).toBe(true);
      }
    }
  });

  it("gives every openable file real content", () => {
    for (const file of FILES) {
      if (file.kind === "folder") continue;
      expect(
        FILE_CONTENTS[file.id],
        `${file.id} has no FILE_CONTENTS entry`,
      ).toBeDefined();
    }
    for (const id of Object.keys(FILE_CONTENTS)) {
      expect(fileIds.has(id), `${id} is not in the manifest`).toBe(true);
    }
  });

  it("names the epilogue and payoff files", () => {
    for (const id of ["visitor_profile", "payload_quarantine", "brb_final"]) {
      expect(fileIds.has(id), id).toBe(true);
      expect(FILE_CONTENTS[id]).toBeDefined();
    }
  });
});
