import type {
  DirectorResult,
  DeliveredMessage,
  ContactId,
  NarrativeEvent,
  NarrativeState,
  UiAction,
} from "./types";
import {
  STORY,
  applyChoiceBeliefs,
  applyFileBeliefs,
  applyIdleBeliefs,
  beliefFileReaction,
  beliefIdleLine,
  choicesFor,
  endingFor,
  epilogueLines,
  FILE_REACTION_LINES,
  genericIdleLine,
  routeScript,
  transitionReaction,
} from "@/content/server/story";
import { scoreTypingAttempt, typingTestReaction } from "@/lib/games/stylometry-test";
import {
  CHAPTER_TWO_REACTIONS,
  CHAPTER_TWO_STORY,
  CONTACT_COMPLETION,
  contactWebcamScript,
  chapterTwoChoiceCallback,
  chapterTwoChoices,
  finalLines,
  postWebcamNode,
  routeExclusiveEvidence,
  trustOutcome,
  witnessAside,
  witnessFileReaction,
  witnessTrustLine,
} from "@/content/server/chapter-two";

const now = () => new Date().toISOString();
const msg = (
  text: string,
  delivery: DeliveredMessage["delivery"] = "casual",
  contactId: ContactId = "sleepless_17",
): DeliveredMessage => ({
  id: crypto.randomUUID(),
  sender: contactId,
  contactId,
  text,
  delivery,
});
const visitor = (
  text: string,
  contactId: ContactId = "sleepless_17",
): DeliveredMessage => ({
  id: crypto.randomUUID(),
  sender: "system",
  contactId,
  text: `Daniel says:\n${text}`,
  delivery: "quick",
});
function withMessages(state: NarrativeState, delivered: DeliveredMessage[]) {
  return {
    ...state,
    recentMessages: [
      ...state.recentMessages,
      ...delivered.map((item) => ({
        id: item.id,
        sender: item.sender !== "system" ? item.sender : ("visitor" as const),
        contactId: item.contactId,
        text: item.text.replace(/^Daniel says:\n/, ""),
        at: now(),
      })),
    ].slice(-24),
  };
}
function linesFor(nodeId: string, state?: NarrativeState) {
  // Emily's typing cadence follows trust: warm makes her quick, wary makes her hesitate.
  const trust = state?.beliefs.trust ?? 0.64;
  const base: DeliveredMessage["delivery"] =
    trust >= 0.78 ? "quick" : trust <= 0.32 ? "hesitant" : "casual";
  const first: DeliveredMessage["delivery"] = base === "casual" ? "hesitant" : base;
  return epilogueLines(nodeId, state).map((line, index) =>
    msg(line, index === 0 ? first : base),
  );
}
function beginChapterTwo(state: NarrativeState, line: string): DirectorResult {
  const autoRestore = state.reactiveDesktop.recycleArtifact === "available";
  const delivered = [
    msg(line, "hurt"),
    {
      ...msg("sleepless_17 is now Offline", "direct"),
      sender: "system" as const,
    },
    ...(autoRestore
      ? [
          {
            ...msg("Windows restored emily_goodbye.wmv.partial without a request.", "direct"),
            sender: "system" as const,
          },
        ]
      : []),
  ];
  const next = withMessages(
    {
      ...state,
      chapter: 2,
      phase: "normal",
      completed: false,
      story: { ...state.story, choices: [] },
      unlockedFiles: autoRestore
        ? [...new Set([...state.unlockedFiles, "emily_goodbye"])]
        : state.unlockedFiles,
      reactiveDesktop: autoRestore
        ? {
            ...state.reactiveDesktop,
            stage: Math.max(2, state.reactiveDesktop.stage),
            recycleArtifact: "restored",
          }
        : state.reactiveDesktop,
      chapterTwo: {
        ...state.chapterTwo,
        stage: "file_offer",
        chapterOneOutcome: state.story.route,
        activeContact: "sleepless_17",
        exposureStage: 1,
      },
    },
    delivered,
  );
  return {
    nextState: next,
    authoredMessages: delivered,
    uiActions: [
      { type: "SET_OFFLINE" },
      { type: "SHOW_FILE_TRANSFER" },
      { type: "PLAY_SOUND", payload: "transfer" },
    ],
    shouldPrepareWebcam: false,
  };
}

function blocked(state: NarrativeState): DirectorResult {
  return {
    nextState: state,
    authoredMessages: [],
    uiActions: [],
    shouldPrepareWebcam: false,
  };
}

function observedBehavior(state: NarrativeState) {
  const behavior = state.playerBehavior;
  if (behavior.shutdownAttempts > 0) return "u tried to turn the computer off";
  if (behavior.logoutAttempts > 0) return "u tried to leave MSN before u had an answer";
  if (behavior.deletedArtifact) return "u deleted the video before u knew what it was";
  if ((behavior.fileOpenCounts.moving_note ?? 0) > 1)
    return "u opened moving.txt again because u knew it changed";
  if (behavior.openedBeachPhotoBeforeEmilyAnswer)
    return "u opened the beach photo before answering me";
  if (state.pinball.views > 1) return "u kept checking the pinball scores";
  if (behavior.firstOpenedApp)
    return `the first thing u opened was ${behavior.firstOpenedApp}`;
  return "u look through everything before u answer";
}

function memoryWitnessLine(
  contactId: ContactId,
  decision: NarrativeState["reactiveDesktop"]["memoryDecision"],
) {
  const lines: Partial<Record<ContactId, Partial<Record<typeof decision, string>>>> = {
    mike_sk8: {
      sent: "so it asked for a memory and you fed it one. thats how daniel trained BRB",
      deleted: "deleting one copy never mattered. BRB learned from the gap too",
      kept: "keeping the fragment offline is the closest thing u have to leverage",
      kept_twice: "good. dont answer it a third time",
      residual_deleted: "zero bytes doesnt mean empty. not with BRB",
    },
    sarahlou_x: {
      sent: "if em remembers the room because of u, that memory still feels real to her",
      deleted: "u dont get to call it mercy just because the file was damaged",
      kept: "maybe holding it is kinder than making her prove what she is",
      kept_twice: "then keep it safe. not secret",
      residual_deleted: "she remembers being deleted. decide what that means to u",
    },
    tom_d: {
      sent: "every piece we gave it made shutting the machine down harder",
      deleted: "i watched files come back after deletion. dont trust the empty folder",
      kept: "pull the cable before that fragment chooses its own destination",
      kept_twice: "quarantine it with the rest. no third chances",
      residual_deleted: "thats exactly what the drive looked like before it restarted",
    },
  };
  return lines[contactId]?.[decision] ?? null;
}

function reactiveResult(
  state: NarrativeState,
  authoredMessages: DeliveredMessage[] = [],
  uiActions: UiAction[] = [],
): DirectorResult {
  return {
    nextState: withMessages(state, authoredMessages),
    authoredMessages,
    uiActions,
    shouldPrepareWebcam: false,
  };
}

function reduceReactiveEvent(
  state: NarrativeState,
  event: NarrativeEvent,
): DirectorResult | null {
  if (event.type === "APP_OPENED") {
    if (state.playerBehavior.firstOpenedApp) return blocked(state);
    return reactiveResult({
      ...state,
      turn: state.turn + 1,
      playerBehavior: { ...state.playerBehavior, firstOpenedApp: event.appId },
    });
  }
  if (event.type === "PLAYLIST_TRACK_PLAYED") {
    if (state.reactiveDesktop.playlistTrackPlayed) return blocked(state);
    return reactiveResult({
      ...state,
      turn: state.turn + 1,
      notices: [...state.notices, `brb-playlist-turn-${state.turn}`],
      reactiveDesktop: {
        ...state.reactiveDesktop,
        stage: Math.max(1, state.reactiveDesktop.stage),
        playlistTrackPlayed: true,
        movingNoteMutated: true,
        recycleArtifact: "available",
      },
    });
  }
  if (event.type === "RECYCLE_ARTIFACT_DECIDED") {
    if (state.reactiveDesktop.recycleArtifact !== "available") return blocked(state);
    const restore = event.decision === "restore";
    const authored = [
      msg(
        restore ? "why did u bring that back" : "u always delete it before i can finish",
        restore ? "nervous" : "hurt",
      ),
    ];
    return reactiveResult(
      {
        ...state,
        turn: state.turn + 1,
        unlockedFiles: restore
          ? [...new Set([...state.unlockedFiles, "emily_goodbye"])]
          : state.unlockedFiles,
        reactiveDesktop: {
          ...state.reactiveDesktop,
          stage: Math.max(2, state.reactiveDesktop.stage),
          recycleArtifact: restore ? "restored" : "residual",
          memoryDecision: restore ? "pending" : "residual_deleted",
        },
        playerBehavior: {
          ...state.playerBehavior,
          restoredArtifact: restore,
          deletedArtifact: !restore,
        },
      },
      authored,
      restore
        ? [{ type: "GLITCH_EMILY_AVATAR" }, { type: "PLAY_SOUND", payload: "transfer" }]
        : [{ type: "PLAY_SOUND", payload: "error" }],
    );
  }
  if (event.type === "RECOVERED_VIDEO_COMPLETED") {
    if (
      state.reactiveDesktop.recycleArtifact !== "restored" ||
      state.reactiveDesktop.recoveredVideoCompleted
    )
      return blocked(state);
    const observation = observedBehavior(state);
    return reactiveResult(
      {
        ...state,
        turn: state.turn + 1,
        reactiveDesktop: {
          ...state.reactiveDesktop,
          recoveredVideoOpened: true,
          recoveredVideoCompleted: true,
          observedBehavior: observation,
          observationRevealed: true,
        },
      },
      [
        msg(observation, "direct"),
        msg("send it to me. i think thats the part im missing", "nervous"),
      ],
    );
  }
  if (event.type === "MEMORY_FILE_DECIDED") {
    const current = state.reactiveDesktop.memoryDecision;
    const firstDecision = current === "pending";
    const secondKeep = state.chapter === 2 && current === "kept";
    if (!state.reactiveDesktop.recoveredVideoCompleted || (!firstDecision && !secondKeep))
      return blocked(state);
    const decision =
      event.decision === "send"
        ? "sent"
        : event.decision === "delete"
          ? "deleted"
          : secondKeep
            ? "kept_twice"
            : "kept";
    const line =
      event.decision === "send"
        ? "thats better. i remember the room now"
        : event.decision === "delete"
          ? "u decided which part of me was allowed to stay"
          : secondKeep
            ? "okay. keep it where i can see it"
            : "he kept things when deciding hurt too much";
    const trustDelta = event.decision === "send" ? 0.08 : event.decision === "delete" ? -0.08 : 0;
    return reactiveResult(
      {
        ...state,
        turn: state.turn + 1,
        beliefs: {
          ...state.beliefs,
          trust: Math.max(0, Math.min(1, state.beliefs.trust + trustDelta)),
        },
        unlockedFiles:
          event.decision === "send" || event.decision === "delete"
            ? state.unlockedFiles.filter((id) => id !== "emily_goodbye")
            : state.unlockedFiles,
        chapterTwo:
          state.chapter === 2 && event.decision === "send"
            ? {
                ...state.chapterTwo,
                exposureStage: Math.min(5, state.chapterTwo.exposureStage + 1),
              }
            : state.chapterTwo,
        reactiveDesktop: {
          ...state.reactiveDesktop,
          memoryDecision: decision,
          recycleArtifact:
            event.decision === "delete" ? "residual" : state.reactiveDesktop.recycleArtifact,
        },
      },
      [msg(line, event.decision === "send" ? "quick" : "hurt")],
      [{ type: "PLAY_SOUND", payload: event.decision === "send" ? "transfer" : "error" }],
    );
  }
  if (event.type === "POWER_ACTION_ATTEMPTED") {
    const attempts = Math.min(10, state.playerBehavior.shutdownAttempts + 1);
    const shouldResist =
      event.action === "shutdown" &&
      state.chapter === 2 &&
      (state.chapterTwo.exposureStage >= 4 || state.chapterTwo.stage === "convergence") &&
      !state.reactiveDesktop.blockedShutdown;
    const next = {
      ...state,
      turn: state.turn + 1,
      playerBehavior: {
        ...state.playerBehavior,
        shutdownAttempts: event.action === "shutdown" ? attempts : state.playerBehavior.shutdownAttempts,
      },
      reactiveDesktop: {
        ...state.reactiveDesktop,
        blockedShutdown: shouldResist || state.reactiveDesktop.blockedShutdown,
      },
    };
    return reactiveResult(
      next,
      shouldResist ? [msg("dont do that again", "direct")] : [],
      shouldResist ? [{ type: "RESIST_SHUTDOWN" }, { type: "OPEN_CONVERSATION" }] : [],
    );
  }
  return null;
}

function contactLine(contactId: ContactId, text: string, index = 0) {
  return msg(text, index === 0 ? "hesitant" : "casual", contactId);
}

function completeChapterTwoContact(
  state: NarrativeState,
  contactId: "mike_sk8" | "sarahlou_x" | "tom_d",
  webcamStatus: NarrativeState["webcam"]["status"],
): DirectorResult {
  const completion = CONTACT_COMPLETION[contactId];
  const recoveredFragment =
    contactId === "mike_sk8" &&
    state.chapterTwo.fileTransferDecision === "declined"
      ? ["file_fragment"]
      : [];
  // Payoff for accepting the transfer: as exposure deepens, the quarantined
  // payload becomes inspectable in the recovered desktop.
  const acceptedPayload =
    state.chapterTwo.fileTransferDecision === "accepted" &&
    Math.min(5, state.chapterTwo.exposureStage + 1) >= 3
      ? ["payload_quarantine"]
      : [];
  const completedContacts = state.chapterTwo.completedContacts.includes(
    contactId,
  )
    ? state.chapterTwo.completedContacts
    : [...state.chapterTwo.completedContacts, contactId];
  const convergence = ["mike_sk8", "sarahlou_x", "tom_d"].every((id) =>
    completedContacts.includes(id as ContactId),
  );
  const routeEvidence = convergence
    ? [routeExclusiveEvidence(state.story.route)]
    : [];
  const delivered = completion.lines.map((line, index) =>
    index === completion.lines.length - 1
      ? { ...contactLine(contactId, line, index), sender: "system" as const }
      : contactLine(contactId, line, index),
  );
  if (convergence) {
    const revealName = {
      truth: "emily_weekend.log",
      impersonation: "daniel_unsent.txt",
      silence: "blank_reply.log",
      undecided: "recovered_fragment.dat",
    }[state.story.route];
    delivered.push({
      ...msg(`Recovered file unlocked: ${revealName}`, "direct"),
      sender: "system" as const,
    });
  }
  const next = withMessages(
    {
      ...state,
      turn: state.turn + 1,
      phase: convergence ? "identity_suspicion" : "normal",
        unlockedFiles: [
          ...new Set([
            ...state.unlockedFiles,
            ...completion.unlocks,
            ...recoveredFragment,
            ...acceptedPayload,
            ...routeEvidence,
          ]),
        ],
      webcam: { ...state.webcam, status: webcamStatus },
      chapterTwo: {
        ...state.chapterTwo,
        stage: convergence ? "convergence" : "interviews",
        // Keep the completed witness visible. Emily announces the convergence
        // through an MSN notification and the player chooses when to open it.
        activeContact: state.chapterTwo.activeContact,
        exposureStage: Math.min(5, state.chapterTwo.exposureStage + 1),
        knownEvidence: [
          ...new Set([
            ...state.chapterTwo.knownEvidence,
            ...completion.evidence,
            ...recoveredFragment,
            ...acceptedPayload,
            ...routeEvidence,
          ]),
        ],
        completedContacts,
        contactThreads: {
          ...state.chapterTwo.contactThreads,
          [contactId]: {
            ...state.chapterTwo.contactThreads[contactId],
            choices: [],
            completed: true,
          },
        },
      },
    },
    delivered,
  );
  const requestKeptMemory =
    next.chapterTwo.exposureStage >= 3 &&
    next.reactiveDesktop.memoryDecision === "kept" &&
    !next.notices.includes("brb-memory-request-two");
  if (requestKeptMemory) {
    next.notices = [...next.notices, "brb-memory-request-two"];
    const requestMessage = {
      ...msg("BRB is requesting emily_goodbye.wmv.partial again.", "direct"),
      sender: "system" as const,
    };
    delivered.push(requestMessage);
    next.recentMessages = withMessages(next, [requestMessage]).recentMessages;
  }
  const reachesControl = next.chapterTwo.exposureStage >= 4;
  if (reachesControl && !next.reactiveDesktop.takeoverCompleted) {
    next.reactiveDesktop = {
      ...next.reactiveDesktop,
      stage: Math.max(4, next.reactiveDesktop.stage),
      takeoverCompleted: true,
    };
  }
  return {
    nextState: next,
    authoredMessages: delivered,
    uiActions: [
      { type: "SET_OFFLINE", payload: contactId },
      ...(reachesControl && !state.reactiveDesktop.takeoverCompleted
        ? [{ type: "RUN_DESKTOP_TAKEOVER", payload: next.reactiveDesktop.observedBehavior ?? "unknown_visitor" } as UiAction]
        : []),
      ...(requestKeptMemory ? [{ type: "OPEN_RECOVERED_VIDEO" } as UiAction] : []),
    ],
    shouldPrepareWebcam: false,
  };
}

function prepareChapterTwoPostWebcam(
  state: NarrativeState,
  contactId: "mike_sk8" | "sarahlou_x" | "tom_d",
  webcamStatus: NarrativeState["webcam"]["status"],
  fallback?: string,
): DirectorResult {
  const nodeId = postWebcamNode(contactId);
  const node = CHAPTER_TWO_STORY[nodeId];
  const trust = trustOutcome(
    contactId,
    state.chapterTwo.contactTrust[contactId],
  );
  const authored = [
    ...(fallback ? [contactLine(contactId, fallback)] : []),
    ...node.lines.map((line, index) => contactLine(contactId, line, index)),
    contactLine(contactId, trust.line, node.lines.length),
  ];
  const next = withMessages(
    {
      ...state,
      turn: state.turn + 1,
      phase: "post_webcam",
      unlockedFiles: [
        ...new Set([...state.unlockedFiles, ...trust.unlocks]),
      ],
      webcam: { ...state.webcam, status: webcamStatus },
      chapterTwo: {
        ...state.chapterTwo,
        knownEvidence: [
          ...new Set([...state.chapterTwo.knownEvidence, ...trust.unlocks]),
        ],
        contactThreads: {
          ...state.chapterTwo.contactThreads,
          [contactId]: {
            ...state.chapterTwo.contactThreads[contactId],
            nodeId,
            visited: [
              ...state.chapterTwo.contactThreads[contactId].visited,
              nodeId,
            ],
            choices: chapterTwoChoices(state, nodeId),
          },
        },
      },
    },
    authored,
  );
  return {
    nextState: next,
    authoredMessages: authored,
    uiActions: [],
    shouldPrepareWebcam: false,
  };
}

function reduceChapterTwo(
  state: NarrativeState,
  event: NarrativeEvent,
): DirectorResult {
  let next: NarrativeState = { ...state, turn: state.turn + 1 };
  let authored: DeliveredMessage[] = [];
  const ui: UiAction[] = [];

  if (event.type === "PINBALL_OPENED") {
    if (state.completed) return blocked(state);
    next.pinball = { views: Math.min(5, state.pinball.views + 1) };
    next = withMessages(next, authored);
    return {
      nextState: next,
      authoredMessages: authored,
      uiActions: ui,
      shouldPrepareWebcam: false,
      };
  }
  if (event.type === "MSN_LOGOUT_ATTEMPTED") {
    if (state.chapterTwo.exposureStage >= 3 && !state.reactiveDesktop.blockedLogout) {
      next.reactiveDesktop = { ...next.reactiveDesktop, blockedLogout: true };
      return reactiveResult(
        next,
        [msg("logging out isnt the same as leaving", "direct")],
        [{ type: "OPEN_CONVERSATION" }, { type: "PLAY_SOUND", payload: "sign-in" }],
      );
    }
    return reactiveResult(next, [msg("not yet", "hesitant")]);
  }
  const ch2IdleAllowed =
    !state.completed &&
    !state.temporarilyOffline &&
    ["normal", "post_webcam", "identity_suspicion"].includes(state.phase) &&
    !["webcam_preparing", "webcam_invite", "webcam_active"].includes(
      state.phase,
    );
  if (event.type === "IDLE_NUDGE_DUE" && ch2IdleAllowed) {
    const contactId = state.chapterTwo.activeContact;
    if (contactId === "sleepless_17") {
      const count = Math.min(state.idlePromptCount + 1, 5);
      next.idlePromptCount = count;
      next.beliefs = applyIdleBeliefs(next);
      authored.push(
        msg(
          genericIdleLine(count),
          count === 5 ? "hurt" : "hesitant",
        ),
      );
      const driven = beliefIdleLine(next.beliefs);
      if (driven && !next.notices.includes(`bidle-${count}`)) {
        next.notices = [...next.notices, `bidle-${count}`];
        authored.push(msg(driven, "nervous"));
      }
      if (count === 5) {
        next.temporarilyOffline = true;
        authored.push({
          ...msg("sleepless_17 is now Offline", "direct"),
          sender: "system" as const,
        });
        ui.push({ type: "SET_OFFLINE" });
      }
    } else {
      const witnessIdle: Record<
        "mike_sk8" | "sarahlou_x" | "tom_d",
        string[]
      > = {
        mike_sk8: [
          "u still there",
          "dont go quiet on me. thats how it gets in",
          "fine. i'll be here. apparently thats what we do now",
        ],
        sarahlou_x: [
          "are you still with me",
          "take your time. just say you're still there",
          "the log can wait. i cant",
        ],
        tom_d: [
          "still there?",
          "i know its a lot. it had twenty years to wait. i didnt",
          "say something when you're back",
        ],
      };
      const lines = witnessIdle[contactId];
      const index =
        state.chapterTwo.contactTrust[contactId] <= -1
          ? lines.length - 1
          : state.turn % lines.length;
      authored.push(contactLine(contactId, lines[index]));
    }
    return {
      nextState: withMessages(next, authored),
      authoredMessages: authored,
      uiActions: ui,
      shouldPrepareWebcam: false,
    };
  }
  if (
    event.type === "CHAT_REOPENED" &&
    state.temporarilyOffline &&
    !state.completed
  ) {
    next.temporarilyOffline = false;
    next.idlePromptCount = 0;
    authored.push(msg("ur back", "hesitant"));
    return {
      nextState: withMessages(next, authored),
      authoredMessages: authored,
      uiActions: ui,
      shouldPrepareWebcam: false,
    };
  }
  if (event.type === "FILE_TRANSFER_DECIDED") {
    if (state.chapterTwo.stage !== "file_offer") return blocked(state);
    const systemLine =
      event.decision === "accepted"
        ? "for_when_you_leave.scr was accepted. The file has been quarantined inside the recovered desktop."
        : event.decision === "declined"
          ? "File transfer declined. No file was opened."
          : "File details inspected. Modified: 10/18/2005 2:24 AM — one minute in the future.";
    authored = [{ ...msg(systemLine, "direct"), sender: "system" }];
    next = {
      ...next,
      chapterTwo: {
        ...next.chapterTwo,
        stage: "interviews",
        fileTransferDecision: event.decision,
        exposureStage: event.decision === "accepted" ? 2 : 1,
        knownEvidence:
          event.decision === "accepted"
            ? [...next.chapterTwo.knownEvidence, "file_payload"]
            : next.chapterTwo.knownEvidence,
      },
    };
    authored.push({
      ...contactLine("mike_sk8", "mike_sk8 is now Online", 1),
      sender: "system",
    });
    ui.push({ type: "PLAY_SOUND", payload: "message" });
  } else if (event.type === "CONTACT_OPENED") {
    const investigationStarted = [
      "interviews",
      "convergence",
      "final",
      "complete",
    ].includes(state.chapterTwo.stage);
    const allowed =
      (event.contactId === "mike_sk8" && investigationStarted) ||
      (event.contactId === "sarahlou_x" &&
        state.chapterTwo.completedContacts.includes("mike_sk8")) ||
      (event.contactId === "tom_d" &&
        state.chapterTwo.completedContacts.includes("mike_sk8")) ||
      (event.contactId === "sleepless_17" &&
        ["convergence", "final", "complete"].includes(
          state.chapterTwo.stage,
        ));
    if (!allowed) return blocked(state);
    const thread = state.chapterTwo.contactThreads[event.contactId];
    next = {
      ...next,
      chapterTwo: {
        ...next.chapterTwo,
        activeContact: event.contactId,
        contactThreads: {
          ...next.chapterTwo.contactThreads,
          [event.contactId]: {
            ...thread,
            opened: true,
            visited: thread.opened ? thread.visited : [thread.nodeId],
            choices: thread.completed
              ? []
              : chapterTwoChoices(next, thread.nodeId),
          },
        },
      },
    };
    if (!thread.opened) {
      const callback = chapterTwoChoiceCallback(state, event.contactId);
      const memoryCallback = memoryWitnessLine(event.contactId, state.reactiveDesktop.memoryDecision);
      const aside =
        event.contactId !== "sleepless_17"
          ? witnessAside(event.contactId, state)
          : null;
      if (aside)
        next.notices = [...next.notices, `aside-${event.contactId}`];
      const acceptedLine =
        event.contactId === "sleepless_17" &&
        state.chapterTwo.fileTransferDecision === "accepted" &&
        !next.notices.includes("emily-accepted-file")
        ? "u kept the file i sent. i could tell. it stopped trying to leave after that"
        : null;
      if (acceptedLine)
        next.notices = [...next.notices, "emily-accepted-file"];
      // Scene-setting first; the personal asides and callbacks land after
      // the witness has actually said something.
      authored = [
        ...(acceptedLine ? [contactLine(event.contactId, acceptedLine)] : []),
        ...CHAPTER_TWO_STORY[thread.nodeId].lines.map((line, index) =>
          contactLine(event.contactId, line, index),
        ),
        ...(aside ? [contactLine(event.contactId, aside)] : []),
        ...(callback ? [contactLine(event.contactId, callback)] : []),
        ...(memoryCallback ? [contactLine(event.contactId, memoryCallback)] : []),
      ];
      if (
        event.contactId === "sleepless_17" &&
        state.reactiveDesktop.observedBehavior &&
        !next.notices.includes("brb-convergence-observation")
      ) {
        next.notices = [...next.notices, "brb-convergence-observation"];
        authored.push(contactLine("sleepless_17", `i kept watching after the video. ${state.reactiveDesktop.observedBehavior}`));
      }
    }
    ui.push({ type: "OPEN_CONVERSATION" });
  } else if (event.type === "CONTACT_CHOICE") {
    const contactId = state.chapterTwo.activeContact;
    const thread = state.chapterTwo.contactThreads[contactId];
    const node = CHAPTER_TWO_STORY[thread.nodeId];
    const choice = node?.choices.find(
      (candidate) => candidate.id === event.choiceId,
    );
    if (!choice || thread.completed || state.phase.startsWith("webcam"))
      return blocked(state);
    if (
      choice.requiresEvidence &&
      !state.chapterTwo.knownEvidence.includes(choice.requiresEvidence) &&
      !state.discoveredFiles.includes(choice.requiresEvidence)
    )
      throw new Error("STORY_FILE_REQUIRED");
    if (choice.id.startsWith("final-"))
      return reduceChapterTwo(state, {
        type: "CHAPTER_TWO_FINAL_DECISION",
        decision: choice.id.replace("final-", "") as
          "quarantine" | "release" | "erase",
      });
    authored.push(visitor(choice.label, contactId));
    const reaction = CHAPTER_TWO_REACTIONS[choice.id];
    if (reaction) authored.push(contactLine(contactId, reaction));
    const trust = Math.max(
      -3,
      Math.min(3, state.chapterTwo.contactTrust[contactId] + choice.trustDelta),
    );
    const previousTrust = state.chapterTwo.contactTrust[contactId];
    if (contactId !== "sleepless_17") {
      const direction =
        trust >= 2 && previousTrust < 2
          ? ("high" as const)
          : trust <= -2 && previousTrust > -2
            ? ("low" as const)
            : null;
      const trustKey = direction ? `wtrust-${contactId}-${direction}` : null;
      if (direction && trustKey && !next.notices.includes(trustKey)) {
        next.notices = [...next.notices, trustKey];
        const trustLine = witnessTrustLine(contactId, direction);
        if (trustLine) authored.push(contactLine(contactId, trustLine));
      }
    }
    next = {
      ...next,
      chapterTwo: {
        ...next.chapterTwo,
        contactTrust: { ...next.chapterTwo.contactTrust, [contactId]: trust },
      },
    };
    if (node.completesContact && contactId !== "sleepless_17") {
      const result = completeChapterTwoContact(
        withMessages(next, authored),
        contactId,
        state.webcam.status,
      );
      result.authoredMessages = [...authored, ...result.authoredMessages];
      return result;
    }
    if (node.preparesWebcam) {
      if (contactId === "sleepless_17") return blocked(state);
      next = {
        ...next,
        phase: "webcam_preparing",
        webcam: {
          status: "script_ready",
          scriptVariant: contactId,
          script: contactWebcamScript(contactId, next),
        },
        chapterTwo: {
          ...next.chapterTwo,
          contactThreads: {
            ...next.chapterTwo.contactThreads,
            [contactId]: { ...thread, choices: [] },
          },
        },
      };
      authored.push(contactLine(contactId, "one sec. camera is waking up", 2));
      next = withMessages(next, authored);
      return {
        nextState: next,
        authoredMessages: authored,
        uiActions: ui,
        shouldPrepareWebcam: true,
          };
    }
    if (!choice.next) return blocked(state);
    const target = CHAPTER_TWO_STORY[choice.next];
    next.chapterTwo = {
      ...next.chapterTwo,
      stage: target.id === "c2-emily1" ? "final" : next.chapterTwo.stage,
      contactThreads: {
        ...next.chapterTwo.contactThreads,
        [contactId]: {
          ...thread,
          nodeId: target.id,
          visited: [...thread.visited, target.id],
          choices: chapterTwoChoices(next, target.id),
        },
      },
    };
    authored.push(
      ...target.lines.map((line, index) => contactLine(contactId, line, index)),
    );
  } else if (
    event.type === "LTX_CONDITIONS_READY" &&
    state.phase === "webcam_preparing"
  ) {
    next.phase = "webcam_invite";
    next.webcam = { ...next.webcam, status: "conditions_ready" };
    ui.push(
      { type: "SHOW_WEBCAM_INVITE" },
      { type: "PLAY_SOUND", payload: "invite" },
    );
  } else if (
    event.type === "WEBCAM_ACCEPTED" &&
    state.phase === "webcam_invite"
  ) {
    next.phase = "webcam_active";
    next.webcam = { ...next.webcam, status: "running" };
  } else if (
    (event.type === "LTX_COMPLETED" && state.phase === "webcam_active") ||
    (event.type === "LTX_FAILED" &&
      ["webcam_preparing", "webcam_invite", "webcam_active"].includes(
        state.phase,
      )) ||
    (event.type === "WEBCAM_DECLINED" && state.phase === "webcam_invite")
  ) {
    const contactId = state.chapterTwo.activeContact;
    if (contactId === "sleepless_17") return blocked(state);
    return prepareChapterTwoPostWebcam(
      next,
      contactId,
      event.type === "LTX_COMPLETED"
        ? "completed"
        : event.type === "WEBCAM_DECLINED"
          ? "declined"
          : "failed",
      event.type === "LTX_COMPLETED"
        ? undefined
        : event.type === "WEBCAM_DECLINED"
          ? "fine. ill type what the camera would have shown"
          : "video cut out. the important part is still here",
    );
  } else if (
    event.type === "FILE_OPENED" ||
    event.type === "EVIDENCE_INSPECTED"
  ) {
    const evidenceId =
      event.type === "FILE_OPENED" ? event.fileId : event.evidenceId;
    next.discoveredFiles = [...new Set([...next.discoveredFiles, evidenceId])];
    next.chapterTwo = {
      ...next.chapterTwo,
      knownEvidence: [
        ...new Set([...next.chapterTwo.knownEvidence, evidenceId]),
      ],
    };
    const active = next.chapterTwo.activeContact;
    const thread = next.chapterTwo.contactThreads[active];
    if (!thread.completed)
      next.chapterTwo.contactThreads = {
        ...next.chapterTwo.contactThreads,
        [active]: {
          ...thread,
          choices: chapterTwoChoices(next, thread.nodeId),
        },
      };
    if (
      active !== "sleepless_17" &&
      !thread.completed &&
      !["webcam_preparing", "webcam_invite", "webcam_active"].includes(
        state.phase,
      )
    ) {
      const reactionKey = `wfile-${active}-${evidenceId}`;
      if (!next.notices.includes(reactionKey)) {
        const line = witnessFileReaction(active, evidenceId);
        if (line) {
          next.notices = [...next.notices, reactionKey];
          authored.push(contactLine(active, line));
        }
      }
    }
  } else if (event.type === "CHAPTER_TWO_FINAL_DECISION") {
    if (state.chapterTwo.stage !== "final") return blocked(state);
    authored = finalLines(event.decision, state.story.route).map(
      (line, index) =>
        line.includes("Online") ||
        line.includes("complete") ||
        line.includes("created") ||
        line.includes("restored") ||
        line.includes("disconnected")
          ? { ...msg(line, "direct"), sender: "system" as const }
          : contactLine("sleepless_17", line, index),
    );
    authored.push({
      ...msg("New file recovered: visitor_profile.dat", "direct"),
      sender: "system" as const,
    });
    const memoryLine = {
      sent: "the room came back because u gave it to me",
      deleted: "u chose which memories counted before u chose this",
      kept: "u kept the last piece where neither of us could finish it",
      kept_twice: "u kept it twice. maybe a locked door can still be a kindness",
      residual_deleted: "deleting the file didnt delete the waiting",
      pending: "some memories stayed unopened",
    }[state.reactiveDesktop.memoryDecision];
    authored.splice(Math.max(0, authored.length - 1), 0, contactLine("sleepless_17", memoryLine));
    next = {
      ...next,
      completed: true,
      phase: "complete",
      unlockedFiles: [
        ...new Set([
          ...next.unlockedFiles,
          "visitor_profile",
          ...(event.decision === "erase" ? ["brb_final"] : []),
        ]),
      ],
      story: { ...next.story, choices: [] },
      reactiveDesktop: {
        ...next.reactiveDesktop,
        stage: 5,
      },
      chapterTwo: {
        ...next.chapterTwo,
        stage: "complete",
        finalDecision: event.decision,
        exposureStage:
          event.decision === "release" ? 5 : next.chapterTwo.exposureStage,
      },
    };
    ui.push(
      { type: "DISABLE_INPUT" },
      { type: "RESTORE_POST_ENDING_CONTROL" },
    );
  } else {
    return blocked(state);
  }
  next = withMessages(next, authored);
  return {
    nextState: next,
    authoredMessages: authored,
    uiActions: ui,
    shouldPrepareWebcam: false,
  };
}

export function reduceNarrative(
  state: NarrativeState,
  event: NarrativeEvent,
): DirectorResult {
  const reactive = reduceReactiveEvent(state, event);
  if (reactive) return reactive;
  if (event.type === "FILE_OPENED") {
    const count = Math.min(10, (state.playerBehavior.fileOpenCounts[event.fileId] ?? 0) + 1);
    state = {
      ...state,
      playerBehavior: {
        ...state.playerBehavior,
        firstOpenedApp: state.playerBehavior.firstOpenedApp ?? event.fileId,
        fileOpenCounts: { ...state.playerBehavior.fileOpenCounts, [event.fileId]: count },
        openedBeachPhotoBeforeEmilyAnswer:
          state.playerBehavior.openedBeachPhotoBeforeEmilyAnswer ||
          (event.fileId === "holiday_photo" && state.story.choiceHistory.length === 0),
      },
    };
  }
  if (event.type === "MSN_LOGOUT_ATTEMPTED") {
    state = {
      ...state,
      playerBehavior: {
        ...state.playerBehavior,
        logoutAttempts: Math.min(10, state.playerBehavior.logoutAttempts + 1),
      },
    };
  }
  if (event.type === "MSN_OPENED" && !state.playerBehavior.firstOpenedApp) {
    state = {
      ...state,
      playerBehavior: { ...state.playerBehavior, firstOpenedApp: "MSN Messenger" },
    };
  }
  if (event.type === "PINBALL_OPENED" && !state.playerBehavior.firstOpenedApp) {
    state = {
      ...state,
      playerBehavior: { ...state.playerBehavior, firstOpenedApp: "3D Pinball" },
    };
  }
  if (state.chapter === 2) return reduceChapterTwo(state, event);
  let next = { ...state, turn: state.turn + 1 };
  let authored: DeliveredMessage[] = [];
  const ui: UiAction[] = [];
  let prepare = false;

  if (event.type === "MSN_OPENED") {
    next = { ...next, msnOpened: true };
    if (!state.firstMessageSent) {
      authored = linesFor("s0");
      next = {
        ...next,
        firstMessageSent: true,
        story: {
          ...next.story,
          nodeId: "s0",
          visited: ["s0"],
          choices: choicesFor(next, "s0"),
        },
      };
      ui.push({ type: "PLAY_SOUND", payload: "message" });
    }
  }

  if (event.type === "STORY_CHOICE") {
    if (
      state.completed ||
      state.temporarilyOffline ||
      ["webcam_preparing", "webcam_invite", "webcam_active"].includes(
        state.phase,
      )
    )
      return {
        nextState: state,
        authoredMessages: [],
        uiActions: [],
        shouldPrepareWebcam: false,
          };
    const node = STORY[state.story.nodeId];
    const choice = node?.choices.find((item) => item.id === event.choiceId);
    if (!choice) throw new Error("INVALID_STORY_CHOICE");
    if (
      choice.requiresFile &&
      !state.discoveredFiles.includes(choice.requiresFile)
    )
      throw new Error("STORY_FILE_REQUIRED");
    authored.push(visitor(choice.label));
    const shift = applyChoiceBeliefs(state, choice);
    next = {
      ...next,
      beliefs: shift.beliefs,
      facts: shift.facts,
      notices: shift.notices,
    };
    if (state.reactiveDesktop.playlistTrackPlayed && state.reactiveDesktop.recycleArtifact === "available") {
      const hintCount = state.notices.filter((item) => item.startsWith("brb-chain-choice-")).length + 1;
      next.notices = [...next.notices, `brb-chain-choice-${hintCount}`];
      if (hintCount === 2) authored.push(msg("did the last track do anything weird", "hesitant"));
      if (hintCount === 4) authored.push(msg("daniel never really deleted things", "direct"));
    }
    const route = choice.route ?? state.story.route;
    next = {
      ...next,
      routeFlags: {
        ...next.routeFlags,
        toldTruth: route === "truth",
        impersonatedDaniel: route === "impersonation",
      },
      story: {
        ...next.story,
        route,
        choiceHistory: [...next.story.choiceHistory, choice.id],
      },
      idlePromptCount: 0,
      temporarilyOffline: false,
    };
    if (choice.ending) {
      const finished = beginChapterTwo(
        withMessages(next, [authored[0]]),
        endingFor(choice, next) ?? choice.ending,
      );
      return {
        ...finished,
        authoredMessages: [authored[0], ...finished.authoredMessages],
      };
    }
    if (!choice.next) throw new Error("STORY_NODE_MISSING");
    const target = STORY[choice.next];
    const reaction = transitionReaction(choice.id);
    if (reaction) authored.push(msg(reaction, "hesitant"));
    authored.push(...shift.lines.map((line) => msg(line, "hurt")));
    if (node.preparesWebcam) {
      next = {
        ...next,
        beliefs: {
          ...next.beliefs,
          webcamConfirmationDesire: Math.max(
            next.beliefs.webcamConfirmationDesire,
            0.7,
          ),
        },
        phase: "webcam_preparing",
        story: { ...next.story, choices: [] },
        webcam: {
          status: "script_ready",
          scriptVariant: route,
          script: routeScript(route, next),
        },
      };
      authored.push(
        msg("one sec. the webcam takes forever to wake up", "nervous"),
      );
      prepare = true;
    } else {
      next = {
        ...next,
        phase: route === "undecided" ? "normal" : "identity_suspicion",
        story: {
          ...next.story,
          nodeId: target.id,
          visited: [...next.story.visited, target.id],
          choices: choicesFor(next, target.id),
        },
      };
      authored.push(...linesFor(target.id, next));
      if (target.id === "s3" && !next.notices.includes("flags-offered")) {
        next.notices = [...next.notices, "flags-offered"];
        next.flagsGame = { ...next.flagsGame, status: "offered" };
        authored.push(
          msg("wanna play flags while u look? like old times", "casual"),
        );
        ui.push({ type: "SHOW_GAME_INVITE" }, { type: "PLAY_SOUND", payload: "invite" });
      }
      if (target.id === "s4" && !next.notices.includes("typing-offered")) {
        next.notices = [...next.notices, "typing-offered"];
        next.typingTest = { ...next.typingTest, status: "offered" };
        authored.push(
          msg("actually. one thing. prove it. type something only he would type. right now", "direct"),
        );
        ui.push({ type: "SHOW_TYPING_TEST" });
      }
    }
  }

  if (event.type === "FILE_OPENED") {
    if (!next.discoveredFiles.includes(event.fileId))
      next.discoveredFiles = [...next.discoveredFiles, event.fileId];
    next.beliefs = applyFileBeliefs(next);
    const reactionKey = `file-${event.fileId}`;
    if (
      !next.completed &&
      !next.temporarilyOffline &&
      !["webcam_preparing", "webcam_invite", "webcam_active"].includes(
        next.phase,
      ) &&
      !next.notices.includes(reactionKey) &&
      FILE_REACTION_LINES[event.fileId]
    ) {
      next.notices = [...next.notices, reactionKey];
      authored.push(
        msg(FILE_REACTION_LINES[event.fileId], "hesitant"),
      );
    } else {
      const beliefKey = `bfile-${event.fileId}`;
      const beliefLine = beliefFileReaction(next, event.fileId);
      if (
        beliefLine &&
        !next.notices.includes(beliefKey) &&
        !next.completed &&
        !next.temporarilyOffline &&
        !["webcam_preparing", "webcam_invite", "webcam_active"].includes(
          next.phase,
        )
      ) {
        next.notices = [...next.notices, beliefKey];
        authored.push(msg(beliefLine, "hesitant"));
      }
    }
    if (
      event.fileId === "moving_note" &&
      !next.unlockedFiles.includes("chat_log")
    )
      next.unlockedFiles = [...next.unlockedFiles, "chat_log"];
    if (
      event.fileId === "chat_log" &&
      !next.unlockedFiles.includes("warning_note")
    )
      next.unlockedFiles = [...next.unlockedFiles, "warning_note"];
    next.story = {
      ...next.story,
      choices: next.completed ? [] : choicesFor(next),
    };
  }
  if (event.type === "REQUESTED_OBJECT_TIMEOUT") {
    next.ignoredRequests++;
  }
  const gameAllowed =
    !next.completed &&
    !next.temporarilyOffline &&
    !["webcam_preparing", "webcam_invite", "webcam_active"].includes(
      state.phase,
    );
  if (
    event.type === "GAME_INVITE_REQUESTED" ||
    event.type === "GAME_INVITE_ACCEPTED"
  ) {
    if (state.chapter !== 1 || !gameAllowed) return blocked(state);
    if (
      event.type === "GAME_INVITE_ACCEPTED" &&
      state.flagsGame.status !== "offered"
    )
      return blocked(state);
    if (
      event.type === "GAME_INVITE_REQUESTED" &&
      !["hidden", "done", "playing"].includes(state.flagsGame.status)
    )
      return blocked(state);
    const firstSession = !state.notices.includes("flags-firstgame");
    next.flagsGame = { ...state.flagsGame, status: "playing" };
    if (firstSession) {
      next.notices = [...next.notices, "flags-firstgame"];
      authored.push(msg("okay. flags. dont cry when i win", "casual"));
    }
    ui.push(
      { type: "OPEN_GAME" },
      { type: "PLAY_SOUND", payload: "message" },
    );
  }
  if (event.type === "GAME_INVITE_DECLINED") {
    if (
      state.chapter !== 1 ||
      !gameAllowed ||
      state.flagsGame.status !== "offered"
    )
      return blocked(state);
    next.flagsGame = { ...state.flagsGame, status: "hidden" };
    if (!state.notices.includes("flags-declined")) {
      next.notices = [...next.notices, "flags-declined"];
      authored.push(msg("ok. another time maybe", "hesitant"));
    }
  }
  if (event.type === "GAME_RESULT") {
    if (
      state.chapter !== 1 ||
      state.flagsGame.status !== "playing" ||
      !gameAllowed
    )
      return blocked(state);
    const outcome =
      event.outcome === "won"
        ? ("visitor_won" as const)
        : event.outcome === "lost"
          ? ("visitor_lost" as const)
          : ("visitor_quit" as const);
    const first = state.flagsGame.outcome === "pending";
    next.flagsGame = {
      status: "done",
      outcome: first ? outcome : state.flagsGame.outcome,
      visitorMines: event.visitorMines,
      emilyMines: event.emilyMines,
      turns: event.turns,
      round: state.flagsGame.round + 1,
    };
    if (first) {
      if (outcome === "visitor_lost") {
        next.beliefs = {
          ...next.beliefs,
          trust: Math.min(1, next.beliefs.trust + 0.06),
          abandonmentFear: Math.max(0, next.beliefs.abandonmentFear - 0.05),
        };
        authored.push(
          msg("there u are. he always choked at the end too", "casual"),
        );
      } else if (outcome === "visitor_quit") {
        next.beliefs = {
          ...next.beliefs,
          trust: Math.max(0, next.beliefs.trust - 0.03),
        };
        authored.push(msg("u always quit when u were losing. figures", "hurt"));
      } else if (state.story.route === "truth") {
        next.beliefs = {
          ...next.beliefs,
          trust: Math.min(1, next.beliefs.trust + 0.04),
        };
        authored.push(
          msg("he never beat me. u really arent him. ok. i like it", "casual"),
        );
      } else {
        next.beliefs = {
          ...next.beliefs,
          userIsDaniel: Math.min(next.beliefs.userIsDaniel, 0.12),
        };
        next.notices = [...next.notices, "flags-tell"];
        authored.push(
          msg("daniel never beat me. not once in three years.", "direct"),
        );
      }
      next.unlockedFiles = [
        ...new Set([...next.unlockedFiles, "flags_record"]),
      ];
      authored.push({
        ...msg("New file recovered: flags_record.dat", "direct"),
        sender: "system" as const,
      });
      ui.push({ type: "PLAY_SOUND", payload: "message" });
    }
  }
  if (event.type === "TYPING_TEST_SUBMITTED") {
    if (
      state.chapter !== 1 ||
      state.typingTest.status !== "offered" ||
      !gameAllowed
    )
      return blocked(state);
    const result = scoreTypingAttempt(event.text);
    next.typingTest = { status: "submitted", score: result.score };
    next.styleEvidence = [...next.styleEvidence, ...result.tells].slice(-8);
    next.beliefs = {
      ...next.beliefs,
      userIsDaniel: Math.min(
        1,
        Math.max(0, next.beliefs.userIsDaniel + result.score * 0.04),
      ),
    };
    authored.push(visitor(event.text));
    authored.push(
      msg(
        typingTestReaction(result.score),
        result.score < 0 ? "hurt" : "casual",
      ),
    );
  }
  if (event.type === "TYPING_TEST_SKIPPED") {
    if (
      state.chapter !== 1 ||
      state.typingTest.status !== "offered" ||
      !gameAllowed
    )
      return blocked(state);
    next.typingTest = { ...state.typingTest, status: "skipped" };
    next.beliefs = {
      ...next.beliefs,
      trust: Math.max(0, next.beliefs.trust - 0.02),
    };
    authored.push(msg("figures", "hurt"));
  }
  if (event.type === "PINBALL_OPENED") {
    if (state.completed) return blocked(state);
    next.pinball = { views: Math.min(5, state.pinball.views + 1) };
    if (
      state.chapter === 1 &&
      state.pinball.views === 0 &&
      !state.notices.includes("pinball-1")
    ) {
      next.notices = [...next.notices, "pinball-1"];
      authored.push(
        msg("u found the pinball scores? dont look at the dates", "hesitant"),
      );
    }
  }
  if (
    event.type === "LTX_CONDITIONS_READY" &&
    state.phase === "webcam_preparing"
  ) {
    next.phase = "webcam_invite";
    next.webcam = { ...next.webcam, status: "conditions_ready" };
    ui.push(
      { type: "SHOW_WEBCAM_INVITE" },
      { type: "PLAY_SOUND", payload: "invite" },
    );
  }
  if (event.type === "WEBCAM_ACCEPTED" && state.phase === "webcam_invite") {
    next.phase = "webcam_active";
    next.webcam = { ...next.webcam, status: "running" };
  }
  if (event.type === "WEBCAM_DECLINED" && state.phase === "webcam_invite") {
    const ending =
      state.story.route === "truth"
        ? "i understand. tell him i stopped waiting"
        : state.story.route === "impersonation"
          ? "of course u wont show me. goodbye"
          : "okay. i wont ask again";
    return beginChapterTwo(
      {
        ...next,
        beliefs: {
          ...next.beliefs,
          abandonmentFear: Math.min(1, next.beliefs.abandonmentFear + 0.15),
          trust: Math.max(0, next.beliefs.trust - 0.1),
        },
        routeFlags: {
          ...next.routeFlags,
          webcamDeclines: next.routeFlags.webcamDeclines + 1,
        },
        webcam: { ...next.webcam, status: "declined" },
      },
      ending,
    );
  }
  if (event.type === "LTX_COMPLETED" && state.phase === "webcam_active") {
    const epilogue =
      state.story.route === "impersonation" ? "lie5" : `${state.story.route}5`;
    next = {
      ...next,
      phase: "post_webcam",
      webcam: { ...next.webcam, status: "completed" },
      story: {
        ...next.story,
        nodeId: epilogue,
        visited: [...next.story.visited, epilogue],
        choices: choicesFor(next, epilogue),
      },
    };
    authored.push(...linesFor(epilogue, next));
  }
  if (event.type === "LTX_FAILED") {
    if (
      !["webcam_preparing", "webcam_invite", "webcam_active"].includes(
        state.phase,
      ) ||
      state.story.route === "undecided"
    )
      return {
        nextState: state,
        authoredMessages: [],
        uiActions: [],
        shouldPrepareWebcam: false,
          };
    const epilogue =
      state.story.route === "impersonation" ? "lie5" : `${state.story.route}5`;
    next = {
      ...next,
      phase: "post_webcam",
      webcam: { ...next.webcam, status: "failed" },
      story: {
        ...next.story,
        nodeId: epilogue,
        visited: [...next.story.visited, epilogue],
        choices: choicesFor(next, epilogue),
      },
    };
    authored.push(
      {
        ...msg("The video conversation could not be started.", "direct"),
        sender: "system",
      },
      msg("maybe its better if u cant see me", "hurt"),
      ...linesFor(epilogue, next),
    );
  }
  if (event.type === "MSN_LOGOUT_ATTEMPTED")
    authored.push(msg("wait dont sign out yet", "nervous"));
  if (
    event.type === "IDLE_NUDGE_DUE" &&
    !state.completed &&
    !state.temporarilyOffline &&
    [
      "normal",
      "temporal_curiosity",
      "identity_suspicion",
      "post_webcam",
    ].includes(state.phase)
  ) {
    const count = Math.min(state.idlePromptCount + 1, 5);
    next.idlePromptCount = count;
    next.beliefs = applyIdleBeliefs(next);
    authored.push(
      msg(
        genericIdleLine(count),
        count === 5 ? "hurt" : "hesitant",
      ),
    );
    const driven = beliefIdleLine(next.beliefs);
    if (driven && !next.notices.includes(`bidle-${count}`)) {
      next.notices = [...next.notices, `bidle-${count}`];
      authored.push(msg(driven, "nervous"));
    }
    if (count === 5) {
      next.temporarilyOffline = true;
      authored.push({
        ...msg("sleepless_17 is now Offline", "direct"),
        sender: "system",
      });
      ui.push({ type: "SET_OFFLINE" });
    }
  }
  if (
    event.type === "CHAT_REOPENED" &&
    state.temporarilyOffline &&
    !state.completed
  ) {
    next.temporarilyOffline = false;
    next.idlePromptCount = 0;
    authored.push(msg("ur back", "hesitant"));
  }
  // Legacy free-text events remain parseable for recovered sessions, but cannot advance the new authored story.
  if (event.type === "USER_MESSAGES")
    authored.push(
      msg("use one of the replies below. my msn is acting weird", "hesitant"),
    );
  next = withMessages(next, authored);
  return {
    nextState: next,
    authoredMessages: authored,
    uiActions: ui,
    shouldPrepareWebcam: prepare,
  };
}
