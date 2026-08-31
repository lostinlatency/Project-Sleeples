import { z } from "zod";
import {
  CHAPTER_TWO_STORY,
  chapterTwoChoices,
} from "@/content/server/chapter-two";
import { STORY, choicesFor } from "@/content/server/story";
import { createInitialState } from "@/lib/director/initial-state";
import { publicView, StateSchema } from "@/lib/director/types";
import { sealState } from "@/lib/narrative/session-envelope";

const Body = z.object({
  route: z.enum(["truth", "impersonation", "silence"]).default("truth"),
  stage: z.enum(["file_offer", "final"]).default("file_offer"),
  chapterOneNode: z.string().optional(),
  chapterTwoNode: z.string().optional(),
  sessionId: z.string().optional(),
  typingOffered: z.boolean().optional(),
  flagsPlaying: z.boolean().optional(),
  flagsOutcome: z
    .enum(["visitor_won", "visitor_lost", "visitor_quit"])
    .optional(),
});

const allEvidence = [
  "holiday_photo",
  "moving_note",
  "chat_log",
  "warning_note",
  "file_payload",
  "file_fragment",
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

export async function POST(request: Request) {
  if (
    process.env.NODE_ENV === "production" ||
    process.env.SLEEPLESS_TEST_HARNESS !== "1"
  )
    return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  const input = Body.parse(await request.json());
  const initial = createInitialState(input.sessionId ?? `e2e-${crypto.randomUUID()}`);
  if (input.chapterOneNode) {
    const node = STORY[input.chapterOneNode];
    if (!node)
      return Response.json({ error: { code: "UNKNOWN_NODE" } }, { status: 400 });
    const route = input.chapterOneNode.startsWith("truth")
      ? "truth"
      : input.chapterOneNode.startsWith("lie")
        ? "impersonation"
        : input.chapterOneNode.startsWith("silence")
          ? "silence"
          : "undecided";
    const base = StateSchema.parse({
      ...initial,
      firstMessageSent: true,
      msnOpened: true,
      phase: route === "undecided" ? "normal" : "identity_suspicion",
      discoveredFiles: allEvidence,
      unlockedFiles: allEvidence,
      ...(input.typingOffered
        ? { typingTest: { status: "offered" as const, score: 0 } }
        : {}),
      ...(input.flagsPlaying
        ? {
            flagsGame: {
              status: "playing" as const,
              outcome: "pending" as const,
              visitorMines: 0,
              emilyMines: 0,
              turns: 0,
              round: 0,
            },
            notices: ["flags-offered", "flags-firstgame"],
          }
        : {}),
      ...(input.flagsOutcome
        ? {
            flagsGame: {
              status: "done" as const,
              outcome: input.flagsOutcome,
              visitorMines: 26,
              emilyMines: 12,
              turns: 38,
              round: 1,
            },
            notices: ["flags-offered", "flags-firstgame"],
          }
        : {}),
      story: {
        ...initial.story,
        nodeId: node.id,
        route,
        visited: [node.id],
        choices: [],
      },
    });
    base.story.choices = choicesFor(base, node.id);
    const messages = node.lines.map((text, index) => ({
      id: `fixture-${node.id}-${index}`,
      sender: "sleepless_17" as const,
      contactId: "sleepless_17" as const,
      text,
      delivery: "casual" as const,
    }));
    return Response.json({
      sessionEnvelope: await sealState(base),
      publicView: publicView(base),
      messages,
      sessionId: base.sessionId,
    });
  }
  if (input.chapterTwoNode) {
    const node = CHAPTER_TWO_STORY[input.chapterTwoNode];
    if (!node)
      return Response.json({ error: { code: "UNKNOWN_NODE" } }, { status: 400 });
    const base = StateSchema.parse({
      ...initial,
      chapter: 2,
      firstMessageSent: true,
      msnOpened: true,
      phase: "normal",
      discoveredFiles: allEvidence,
      unlockedFiles: allEvidence,
      ...(input.flagsOutcome
        ? {
            flagsGame: {
              status: "done" as const,
              outcome: input.flagsOutcome,
              visitorMines: 26,
              emilyMines: 12,
              turns: 38,
              round: 1,
            },
            notices: ["flags-offered", "flags-firstgame"],
          }
        : {}),
      story: { ...initial.story, route: input.route, choices: [] },
      chapterTwo: {
        ...initial.chapterTwo,
        chapterOneOutcome: input.route,
        stage: node.contactId === "sleepless_17" ? "final" : "interviews",
        activeContact: node.contactId,
        fileTransferDecision: "inspected",
        exposureStage: 4,
        knownEvidence: allEvidence,
        completedContacts:
          node.contactId === "sleepless_17"
            ? ["mike_sk8", "sarahlou_x", "tom_d"]
            : node.contactId === "mike_sk8"
              ? []
              : ["mike_sk8"],
        contactThreads: {
          ...initial.chapterTwo.contactThreads,
          [node.contactId]: {
            nodeId: node.id,
            visited: [node.id],
            choices: [],
            opened: true,
            completed: false,
          },
        },
      },
    });
    base.chapterTwo.contactThreads[node.contactId].choices = chapterTwoChoices(
      base,
      node.id,
    );
    const messages = node.lines.map((text, index) => ({
      id: `fixture-${node.id}-${index}`,
      sender: node.contactId,
      contactId: node.contactId,
      text,
      delivery: "casual" as const,
    }));
    return Response.json({
      sessionEnvelope: await sealState(base),
      publicView: publicView(base),
      messages,
    });
  }
  const finalStage = input.stage === "final";
  const base = StateSchema.parse({
    ...initial,
    chapter: 2,
    firstMessageSent: true,
    msnOpened: true,
    phase: finalStage ? "identity_suspicion" : "normal",
    story: {
      ...initial.story,
      route: input.route,
      choices: [],
      choiceHistory:
        input.route === "impersonation"
          ? ["s5-lie", "l2-love"]
          : [`s5-${input.route}`],
    },
    unlockedFiles: finalStage
      ? [
          ...initial.unlockedFiles,
          "brb_readme",
          "brb_users",
          "sarah_log",
          "emily_goodbye",
          "contact_cache",
          "tom_memory",
        ]
      : initial.unlockedFiles,
    chapterTwo: {
      ...initial.chapterTwo,
      chapterOneOutcome: input.route,
      stage: input.stage,
      exposureStage: finalStage ? 4 : 1,
      activeContact: "sleepless_17",
      fileTransferDecision: finalStage ? "inspected" : "pending",
      completedContacts: finalStage ? ["mike_sk8", "sarahlou_x", "tom_d"] : [],
      knownEvidence: finalStage
        ? ["brb_readme", "sarah_log", "contact_cache", "tom_memory"]
        : [],
      contactThreads: {
        ...initial.chapterTwo.contactThreads,
        sleepless_17: {
          nodeId: finalStage ? "c2-emily1" : "c2-emily0",
          visited: finalStage ? ["c2-emily0", "c2-emily1"] : [],
          choices: [],
          opened: finalStage,
          completed: false,
        },
        mike_sk8: {
          nodeId: finalStage ? "mike3" : "mike0",
          visited: finalStage ? ["mike0", "mike1", "mike2", "mike3"] : [],
          choices: [],
          opened: finalStage,
          completed: finalStage,
        },
        sarahlou_x: {
          nodeId: finalStage ? "sarah3" : "sarah0",
          visited: finalStage ? ["sarah0", "sarah1", "sarah2", "sarah3"] : [],
          choices: [],
          opened: finalStage,
          completed: finalStage,
        },
        tom_d: {
          nodeId: finalStage ? "tom3" : "tom0",
          visited: finalStage ? ["tom0", "tom1", "tom2", "tom3"] : [],
          choices: [],
          opened: finalStage,
          completed: finalStage,
        },
      },
    },
  });
  if (finalStage)
    base.chapterTwo.contactThreads.sleepless_17.choices = chapterTwoChoices(
      base,
      CHAPTER_TWO_STORY["c2-emily1"].id,
    );
  const messages = finalStage
    ? CHAPTER_TWO_STORY["c2-emily1"].lines.map((text, index) => ({
        id: `fixture-emily-${index}`,
        sender: "sleepless_17" as const,
        contactId: "sleepless_17" as const,
        text,
        delivery: "casual" as const,
      }))
    : [];
  return Response.json({
    sessionEnvelope: await sealState(base),
    publicView: publicView(base),
    messages,
  });
}
