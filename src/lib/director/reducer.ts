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
  choicesFor,
  endingFor,
  epilogueLines,
  routeScript,
  transitionReaction,
} from "@/content/server/story";
import {
  CHAPTER_TWO_REACTIONS,
  CHAPTER_TWO_STORY,
  CONTACT_COMPLETION,
  CONTACT_WEBCAM_SCRIPTS,
  chapterTwoChoices,
  finalLines,
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
  return epilogueLines(nodeId, state).map((line, index) =>
    msg(line, index === 0 ? "hesitant" : "casual"),
  );
}
function beginChapterTwo(state: NarrativeState, line: string): DirectorResult {
  const delivered = [
    msg(line, "hurt"),
    {
      ...msg("sleepless_17 is now Offline", "direct"),
      sender: "system" as const,
    },
  ];
  const next = withMessages(
    {
      ...state,
      chapter: 2,
      phase: "normal",
      completed: false,
      story: { ...state.story, choices: [] },
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
    actorObjective: null,
  };
}

function blocked(state: NarrativeState): DirectorResult {
  return {
    nextState: state,
    authoredMessages: [],
    uiActions: [],
    shouldPrepareWebcam: false,
    actorObjective: null,
  };
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
  const completedContacts = state.chapterTwo.completedContacts.includes(
    contactId,
  )
    ? state.chapterTwo.completedContacts
    : [...state.chapterTwo.completedContacts, contactId];
  const convergence = ["mike_sk8", "sarahlou_x", "tom_d"].every((id) =>
    completedContacts.includes(id as ContactId),
  );
  const delivered = completion.lines.map((line, index) =>
    index === completion.lines.length - 1
      ? { ...contactLine(contactId, line, index), sender: "system" as const }
      : contactLine(contactId, line, index),
  );
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
  return {
    nextState: next,
    authoredMessages: delivered,
    uiActions: [{ type: "SET_OFFLINE", payload: contactId }],
    shouldPrepareWebcam: false,
    actorObjective: null,
  };
}

function reduceChapterTwo(
  state: NarrativeState,
  event: NarrativeEvent,
): DirectorResult {
  let next: NarrativeState = { ...state, turn: state.turn + 1 };
  let authored: DeliveredMessage[] = [];
  const ui: UiAction[] = [];

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
    if (!thread.opened)
      authored = CHAPTER_TWO_STORY[thread.nodeId].lines.map((line, index) =>
        contactLine(event.contactId, line, index),
      );
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
    next = {
      ...next,
      chapterTwo: {
        ...next.chapterTwo,
        contactTrust: { ...next.chapterTwo.contactTrust, [contactId]: trust },
      },
    };
    if (node.preparesWebcam) {
      if (contactId === "sleepless_17") return blocked(state);
      next = {
        ...next,
        phase: "webcam_preparing",
        webcam: {
          status: "script_ready",
          scriptVariant: contactId,
          script: CONTACT_WEBCAM_SCRIPTS[contactId],
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
        actorObjective: null,
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
    const result = completeChapterTwoContact(
      next,
      contactId,
      event.type === "LTX_COMPLETED"
        ? "completed"
        : event.type === "WEBCAM_DECLINED"
          ? "declined"
          : "failed",
    );
    if (event.type !== "LTX_COMPLETED") {
      const fallback = contactLine(
        contactId,
        event.type === "WEBCAM_DECLINED"
          ? "fine. ill type what the camera would have shown"
          : "video cut out. the important part is still here",
        0,
      );
      result.authoredMessages.unshift(fallback);
      result.nextState = withMessages(result.nextState, [fallback]);
    }
    return result;
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
    next = {
      ...next,
      completed: true,
      phase: "complete",
      unlockedFiles:
        event.decision === "erase"
          ? [...new Set([...next.unlockedFiles, "brb_final"])]
          : next.unlockedFiles,
      story: { ...next.story, choices: [] },
      chapterTwo: {
        ...next.chapterTwo,
        stage: "complete",
        finalDecision: event.decision,
        exposureStage:
          event.decision === "release" ? 5 : next.chapterTwo.exposureStage,
      },
    };
    ui.push({ type: "DISABLE_INPUT" });
  } else {
    return blocked(state);
  }
  next = withMessages(next, authored);
  return {
    nextState: next,
    authoredMessages: authored,
    uiActions: ui,
    shouldPrepareWebcam: false,
    actorObjective: null,
  };
}

export function reduceNarrative(
  state: NarrativeState,
  event: NarrativeEvent,
): DirectorResult {
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
        actorObjective: null,
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
    if (node.preparesWebcam) {
      next = {
        ...next,
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
      authored.push(...linesFor(target.id));
    }
  }

  if (event.type === "FILE_OPENED") {
    if (!next.discoveredFiles.includes(event.fileId))
      next.discoveredFiles = [...next.discoveredFiles, event.fileId];
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
        actorObjective: null,
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
    const idleLines = [
      "u still there?",
      "did u leave the computer again",
      "just pick something. anything",
      "im not waiting all night again",
      "fine. message me if u come back",
    ];
    const count = Math.min(state.idlePromptCount + 1, 5);
    next.idlePromptCount = count;
    authored.push(msg(idleLines[count - 1], count === 5 ? "hurt" : "hesitant"));
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
    actorObjective: null,
  };
}
