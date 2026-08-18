import type {
  DirectorResult,
  DeliveredMessage,
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

const now = () => new Date().toISOString();
const msg = (
  text: string,
  delivery: DeliveredMessage["delivery"] = "casual",
): DeliveredMessage => ({
  id: crypto.randomUUID(),
  sender: "sleepless_17",
  text,
  delivery,
});
const visitor = (text: string): DeliveredMessage => ({
  id: crypto.randomUUID(),
  sender: "system",
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
        sender:
          item.sender === "sleepless_17"
            ? ("sleepless_17" as const)
            : ("visitor" as const),
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
function finish(state: NarrativeState, line: string): DirectorResult {
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
      phase: "complete",
      completed: true,
      story: { ...state.story, choices: [] },
    },
    delivered,
  );
  return {
    nextState: next,
    authoredMessages: delivered,
    uiActions: [{ type: "SET_OFFLINE" }, { type: "DISABLE_INPUT" }],
    shouldPrepareWebcam: false,
    actorObjective: null,
  };
}

export function reduceNarrative(
  state: NarrativeState,
  event: NarrativeEvent,
): DirectorResult {
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
      ui.push(
        { type: "OPEN_CONVERSATION" },
        { type: "PLAY_SOUND", payload: "message" },
      );
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
      const finished = finish(
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
    return finish(
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
    ["normal", "temporal_curiosity", "identity_suspicion", "post_webcam"].includes(
      state.phase,
    )
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
