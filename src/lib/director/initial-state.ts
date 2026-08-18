import { randomUUID } from "node:crypto";
import type { NarrativeState } from "./types";
import { choicesFor } from "@/content/server/story";

export function createInitialState(
  sessionId: string = randomUUID(),
): NarrativeState {
  const state: NarrativeState = {
    version: 1,
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
  };
  state.story.choices = choicesFor(state);
  return state;
}
