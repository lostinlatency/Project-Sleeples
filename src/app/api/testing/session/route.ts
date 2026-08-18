import { z } from "zod";
import {
  CHAPTER_TWO_STORY,
  chapterTwoChoices,
} from "@/content/server/chapter-two";
import { createInitialState } from "@/lib/director/initial-state";
import { publicView, StateSchema } from "@/lib/director/types";
import { sealState } from "@/lib/narrative/session-envelope";

const Body = z.object({
  route: z.enum(["truth", "impersonation", "silence"]).default("truth"),
  stage: z.enum(["file_offer", "final"]).default("file_offer"),
});

export async function POST(request: Request) {
  if (process.env.SLEEPLESS_TEST_HARNESS !== "1")
    return Response.json({ error: { code: "NOT_FOUND" } }, { status: 404 });
  const input = Body.parse(await request.json());
  const initial = createInitialState(`e2e-${crypto.randomUUID()}`);
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
