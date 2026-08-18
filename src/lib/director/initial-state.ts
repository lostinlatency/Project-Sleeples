import { randomUUID } from "node:crypto";
import type { NarrativeState } from "./types";
import { choicesFor } from "@/content/server/story";

export function createInitialState(
  sessionId: string = randomUUID(),
): NarrativeState {
  const state: NarrativeState = {
    version: 2,
    chapter: 1,
    sessionId,
    turn: 0,
    phase: "normal",
    beliefs: {
      userIsDaniel: 0.92,
      currentYearIs2005: 0.98,
      trust: 0.64,
      abandonmentFear: 0.28,
      webcamConfirmationDesire: 0.05,
    },
    facts: {
      visitorName: null,
      claimedYear: null,
      visitorClaimsNotDaniel: false,
    },
    styleEvidence: [],
    recentMessages: [],
    summary: "Daniel has just appeared online after being absent.",
    openThreads: [
      { id: "song", label: "whether Daniel heard the song", resolved: false },
    ],
    discoveredFiles: [],
    unlockedFiles: ["moving_note", "holiday_photo", "playlist_2005"],
    requestedObjectId: null,
    ignoredRequests: 0,
    idlePromptCount: 0,
    temporarilyOffline: false,
    routeFlags: {
      toldTruth: false,
      impersonatedDaniel: false,
      webcamDeclines: 0,
    },
    story: {
      nodeId: "s0",
      route: "undecided",
      visited: [],
      choiceHistory: [],
      choices: [],
    },
    webcam: { status: "unavailable", scriptVariant: null, script: null },
    completed: false,
    processedKeys: [],
    msnOpened: false,
    firstMessageSent: false,
    chapterTwo: {
      stage: "locked",
      chapterOneOutcome: "undecided",
      activeContact: "sleepless_17",
      fileTransferDecision: "pending",
      exposureStage: 0,
      knownEvidence: [],
      completedContacts: [],
      contactTrust: {
        sleepless_17: 0,
        mike_sk8: 0,
        sarahlou_x: 0,
        tom_d: 0,
      },
      contactThreads: {
        sleepless_17: { nodeId: "c2-emily0", visited: [], choices: [], opened: false, completed: false },
        mike_sk8: { nodeId: "mike0", visited: [], choices: [], opened: false, completed: false },
        sarahlou_x: { nodeId: "sarah0", visited: [], choices: [], opened: false, completed: false },
        tom_d: { nodeId: "tom0", visited: [], choices: [], opened: false, completed: false },
      },
      finalDecision: null,
    },
  };
  state.story.choices = choicesFor(state);
  return state;
}
