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
]);
export type NarrativeEvent = z.infer<typeof NarrativeEventSchema>;

export const MessageSchema = z.object({
  id: z.string(),
  sender: z.enum(["visitor", "sleepless_17", "system"]),
  text: z.string(),
  at: z.string(),
});
export type NarrativeMessage = z.infer<typeof MessageSchema>;
export const StateSchema = z.object({
  version: z.literal(1),
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
});
export type NarrativeState = z.infer<typeof StateSchema>;

export interface DeliveredMessage {
  id: string;
  sender: "sleepless_17" | "system";
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
    choices: state.story.choices,
    estimatedMinutes: "8–12",
    idlePromptCount: state.idlePromptCount,
    temporarilyOffline: state.temporarilyOffline,
    firstMessageSent: state.firstMessageSent,
  };
}
