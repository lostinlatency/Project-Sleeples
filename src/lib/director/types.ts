import { z } from "zod";

export const PhaseSchema = z.enum([
  "normal",
  "temporal_curiosity",
  "identity_suspicion",
  "webcam_preparing",
  "webcam_invite",
  "webcam_active",
  "post_webcam",
  "disconnection",
  "complete",
]);
export type NarrativePhase = z.infer<typeof PhaseSchema>;
export const ContactIdSchema = z.enum([
  "sleepless_17",
  "mike_sk8",
  "sarahlou_x",
  "tom_d",
]);
export type ContactId = z.infer<typeof ContactIdSchema>;
export const StoryRouteSchema = z.enum([
  "undecided",
  "truth",
  "impersonation",
  "silence",
]);
export type StoryRoute = z.infer<typeof StoryRouteSchema>;
export const PublicChoiceSchema = z.object({
  id: z.string(),
  label: z.string(),
  tone: z.enum(["truth", "lie", "avoid"]),
  disabled: z.boolean(),
  requirement: z.string().nullable(),
});
export type PublicChoice = z.infer<typeof PublicChoiceSchema>;

export const NarrativeEventSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("MSN_OPENED") }),
  z.object({
    type: z.literal("USER_MESSAGES"),
    messages: z.array(z.string().trim().min(1).max(500)).min(1).max(8),
  }),
  z.object({
    type: z.literal("STORY_CHOICE"),
    choiceId: z.string().min(1).max(80),
  }),
  z.object({
    type: z.literal("FILE_OPENED"),
    fileId: z.string().min(1).max(80),
  }),
  z.object({
    type: z.literal("REQUESTED_OBJECT_TIMEOUT"),
    objectId: z.string(),
  }),
  z.object({ type: z.literal("LTX_CONDITIONS_READY") }),
  z.object({ type: z.literal("WEBCAM_ACCEPTED") }),
  z.object({ type: z.literal("WEBCAM_DECLINED") }),
  z.object({ type: z.literal("LTX_COMPLETED") }),
  z.object({ type: z.literal("LTX_FAILED"), reason: z.string().max(100) }),
  z.object({ type: z.literal("MSN_LOGOUT_ATTEMPTED") }),
  z.object({ type: z.literal("IDLE_NUDGE_DUE") }),
  z.object({ type: z.literal("CHAT_REOPENED") }),
  z.object({ type: z.literal("CONTACT_OPENED"), contactId: ContactIdSchema }),
  z.object({
    type: z.literal("CONTACT_CHOICE"),
    choiceId: z.string().min(1).max(80),
  }),
  z.object({
    type: z.literal("FILE_TRANSFER_DECIDED"),
    decision: z.enum(["accepted", "declined", "inspected"]),
  }),
  z.object({
    type: z.literal("EVIDENCE_INSPECTED"),
    evidenceId: z.string().min(1).max(80),
  }),
  z.object({
    type: z.literal("CHAPTER_TWO_FINAL_DECISION"),
    decision: z.enum(["quarantine", "release", "erase"]),
  }),
]);
export type NarrativeEvent = z.infer<typeof NarrativeEventSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  sender: z.union([ContactIdSchema, z.enum(["visitor", "system"])]),
  contactId: ContactIdSchema.default("sleepless_17"),
  text: z.string(),
  at: z.string(),
});
export type NarrativeMessage = z.infer<typeof MessageSchema>;
const ContactThreadSchema = z.object({
  nodeId: z.string(),
  visited: z.array(z.string()),
  choices: z.array(PublicChoiceSchema),
  opened: z.boolean(),
  completed: z.boolean(),
});
export const ChapterTwoSchema = z.object({
  stage: z.enum([
    "locked",
    "file_offer",
    "interviews",
    "convergence",
    "final",
    "complete",
  ]),
  chapterOneOutcome: StoryRouteSchema,
  activeContact: ContactIdSchema,
  fileTransferDecision: z.enum([
    "pending",
    "accepted",
    "declined",
    "inspected",
  ]),
  exposureStage: z.number().int().min(0).max(5),
  knownEvidence: z.array(z.string()),
  completedContacts: z.array(ContactIdSchema),
  contactTrust: z.record(ContactIdSchema, z.number().int().min(-3).max(3)),
  contactThreads: z.record(ContactIdSchema, ContactThreadSchema),
  finalDecision: z.enum(["quarantine", "release", "erase"]).nullable(),
});
export type ChapterTwoState = z.infer<typeof ChapterTwoSchema>;

export const StateSchema = z.object({
  version: z.literal(2),
  chapter: z.union([z.literal(1), z.literal(2)]),
  sessionId: z.string(),
  turn: z.number().int().nonnegative(),
  phase: PhaseSchema,
  beliefs: z.object({
    userIsDaniel: z.number().min(0).max(1),
    currentYearIs2005: z.number().min(0).max(1),
    trust: z.number().min(0).max(1),
    abandonmentFear: z.number().min(0).max(1),
    webcamConfirmationDesire: z.number().min(0).max(1),
  }),
  facts: z.object({
    visitorName: z.string().nullable(),
    claimedYear: z.number().int().nullable(),
    visitorClaimsNotDaniel: z.boolean(),
  }),
  styleEvidence: z.array(z.string()),
  recentMessages: z.array(MessageSchema),
  summary: z.string(),
  openThreads: z.array(
    z.object({ id: z.string(), label: z.string(), resolved: z.boolean() }),
  ),
  discoveredFiles: z.array(z.string()),
  unlockedFiles: z.array(z.string()),
  requestedObjectId: z.string().nullable(),
  ignoredRequests: z.number().int().nonnegative(),
  idlePromptCount: z.number().int().min(0).max(5).default(0),
  temporarilyOffline: z.boolean().default(false),
  routeFlags: z.object({
    toldTruth: z.boolean(),
    impersonatedDaniel: z.boolean(),
    webcamDeclines: z.number().int().nonnegative(),
  }),
  story: z.object({
    nodeId: z.string(),
    route: StoryRouteSchema,
    visited: z.array(z.string()),
    choiceHistory: z.array(z.string()),
    choices: z.array(PublicChoiceSchema),
  }),
  webcam: z.object({
    status: z.enum([
      "unavailable",
      "script_ready",
      "connecting",
      "conditions_ready",
      "accepted",
      "declined",
      "running",
      "completed",
      "failed",
    ]),
    scriptVariant: z.string().nullable(),
    script: z.string().nullable(),
  }),
  completed: z.boolean(),
  processedKeys: z.array(z.string()),
  msnOpened: z.boolean(),
  firstMessageSent: z.boolean(),
  chapterTwo: ChapterTwoSchema,
});
export type NarrativeState = z.infer<typeof StateSchema>;

export interface DeliveredMessage {
  id: string;
  sender: ContactId | "system";
  contactId: ContactId;
  text: string;
  delivery: "casual" | "quick" | "hesitant" | "hurt" | "direct" | "nervous";
}
export type UiAction = {
  type:
    | "OPEN_CONVERSATION"
    | "PLAY_SOUND"
    | "SHOW_WEBCAM_INVITE"
    | "SHOW_FILE_TRANSFER"
    | "SET_OFFLINE"
    | "DISABLE_INPUT";
  payload?: string;
};
export interface PublicView {
  sessionId: string;
  turn: number;
  phase: NarrativePhase;
  discoveredFiles: string[];
  unlockedFiles: string[];
  requestedObjectId: string | null;
  webcamStatus: NarrativeState["webcam"]["status"];
  webcamDeclines: number;
  online: boolean;
  completed: boolean;
  storyNodeId: string;
  storyRoute: StoryRoute;
  choices: PublicChoice[];
  estimatedMinutes: string;
  idlePromptCount: number;
  temporarilyOffline: boolean;
  firstMessageSent: boolean;
  chapter: 1 | 2;
  activeContact: ContactId;
  chapterTwoStage: ChapterTwoState["stage"];
  contactStatuses: Record<ContactId, "online" | "offline" | "typing">;
  fileTransferDecision: ChapterTwoState["fileTransferDecision"];
  exposureStage: number;
  knownEvidence: string[];
  completedContacts: ContactId[];
  finalDecision: ChapterTwoState["finalDecision"];
  fileOfferDescription: string;
}
export interface DirectorResult {
  nextState: NarrativeState;
  authoredMessages: DeliveredMessage[];
  uiActions: UiAction[];
  shouldPrepareWebcam: boolean;
  actorObjective: string | null;
}

export function publicView(state: NarrativeState): PublicView {
  return {
    sessionId: state.sessionId,
    turn: state.turn,
    phase: state.phase,
    discoveredFiles: state.discoveredFiles,
    unlockedFiles: state.unlockedFiles,
    requestedObjectId: state.requestedObjectId,
    webcamStatus: state.webcam.status,
    webcamDeclines: state.routeFlags.webcamDeclines,
    online:
      !state.temporarilyOffline &&
      !["disconnection", "complete"].includes(state.phase),
    completed: state.completed,
    storyNodeId: state.story.nodeId,
    storyRoute: state.story.route,
    choices:
      state.chapter === 2
        ? state.chapterTwo.contactThreads[state.chapterTwo.activeContact]
            .choices
        : state.story.choices,
    estimatedMinutes: state.chapter === 2 ? "20–25" : "8–12",
    idlePromptCount: state.idlePromptCount,
    temporarilyOffline: state.temporarilyOffline,
    firstMessageSent: state.firstMessageSent,
    chapter: state.chapter,
    activeContact: state.chapterTwo.activeContact,
    chapterTwoStage: state.chapterTwo.stage,
    contactStatuses: {
      sleepless_17:
        state.chapter === 1
          ? !state.temporarilyOffline &&
            !["disconnection", "complete"].includes(state.phase)
            ? "online"
            : "offline"
          : state.chapterTwo.stage === "convergence" ||
              state.chapterTwo.stage === "final"
            ? "online"
            : "offline",
      mike_sk8:
        state.chapter === 2 &&
        ["interviews", "convergence", "final"].includes(
          state.chapterTwo.stage,
        ) &&
        !state.chapterTwo.completedContacts.includes("mike_sk8")
          ? "online"
          : "offline",
      sarahlou_x:
        state.chapterTwo.completedContacts.includes("mike_sk8") &&
        !state.chapterTwo.completedContacts.includes("sarahlou_x")
          ? "online"
          : "offline",
      tom_d:
        state.chapterTwo.completedContacts.includes("mike_sk8") &&
        !state.chapterTwo.completedContacts.includes("tom_d")
          ? "online"
          : "offline",
    },
    fileTransferDecision: state.chapterTwo.fileTransferDecision,
    exposureStage: state.chapterTwo.exposureStage,
    knownEvidence: state.chapterTwo.knownEvidence,
    completedContacts: state.chapterTwo.completedContacts,
    finalDecision: state.chapterTwo.finalDecision,
    fileOfferDescription:
      state.story.route === "truth"
        ? "tell him i waited. but dont tell him im still waiting"
        : state.story.route === "impersonation"
          ? `Owner: Daniel · remembered answer: ${
              {
                "l2-move": "mum says we move friday",
                "l2-love": "i was going to say i loved you",
                "l2-dodge": "it doesnt matter anymore",
              }[
                state.story.choiceHistory.find((id) => id.startsWith("l2-")) ??
                  ""
              ] ?? "unknown"
            }`
          : "",
  };
}
