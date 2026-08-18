import type { NarrativeState, StoryRoute } from "@/lib/director/types";

export type ChoiceTone = "truth" | "lie" | "avoid";
export interface StoryChoice {
  id: string;
  label: string;
  next?: string;
  route?: Exclude<StoryRoute, "undecided">;
  tone: ChoiceTone;
  requiresFile?: string;
  ending?: string;
}
export interface StoryNode {
  id: string;
  lines: string[];
  choices: readonly [StoryChoice, StoryChoice, StoryChoice];
  preparesWebcam?: boolean;
}

const c = (
  id: string,
  label: string,
  next: string | undefined,
  tone: ChoiceTone,
  extra: Partial<StoryChoice> = {},
): StoryChoice => ({ id, label, next, tone, ...extra });

export const STORY: Record<string, StoryNode> = {
  s0: {
    id: "s0",
    lines: ["daniel?", "is that actually u?"],
    choices: [
      c("s0-warm", "hey em. yeah, it’s me.", "s1", "lie"),
      c("s0-honest", "hi. i found this computer.", "s1", "truth"),
      c("s0-guarded", "who is this?", "s1", "avoid"),
    ],
  },
  s1: {
    id: "s1",
    lines: [
      "where have u been?",
      "u said brb and then disappeared for like 2 hours",
    ],
    choices: [
      c("s1-promise", "sorry. i came back like i promised.", "s2", "lie"),
      c("s1-time", "it has been longer than two hours.", "s2", "truth"),
      c("s1-deflect", "what were we talking about?", "s2", "avoid"),
    ],
  },
  s2: {
    id: "s2",
    lines: [
      "the beach, remember?",
      "can u open the picture in my documents? i wanna know if its the one i sent u",
    ],
    choices: [
      c("s2-open", "i’ll look for it.", "s3", "truth"),
      c("s2-remember", "i remember the beach.", "s3", "lie"),
      c("s2-refuse", "why does the picture matter?", "s3", "avoid"),
    ],
  },
  s3: {
    id: "s3",
    lines: [
      "we stayed up till sunrise that night",
      "u said tomorrow would be different",
    ],
    choices: [
      c(
        "s3-photo",
        "i found it. two flags, palm trees, taken from above.",
        "s4",
        "truth",
        {
        requiresFile: "holiday_photo",
        },
      ),
      c("s3-memory", "you made me promise not to forget it.", "s4", "lie"),
      c("s3-question", "what was supposed to happen tomorrow?", "s4", "avoid"),
    ],
  },
  s4: {
    id: "s4",
    lines: [
      "u were going to tell me something",
      "then your status went offline before i could ask again",
    ],
    choices: [
      c("s4-note", "you were moving away.", "s5", "truth", {
        requiresFile: "moving_note",
      }),
      c("s4-cover", "it was nothing. i got scared.", "s5", "lie"),
      c("s4-probe", "how long have you been waiting?", "s5", "avoid"),
    ],
  },
  s5: {
    id: "s5",
    lines: [
      "stop talking around it",
      "just tell me who is sitting at daniels computer",
    ],
    choices: [
      c(
        "s5-truth",
        "i’m not Daniel. he left this computer behind.",
        "truth0",
        "truth",
        { route: "truth" },
      ),
      c("s5-lie", "it’s me, Emily. i’m Daniel.", "lie0", "lie", {
        route: "impersonation",
      }),
      c("s5-silence", "i’m not answering that.", "silence0", "avoid", {
        route: "silence",
      }),
    ],
  },

  truth0: {
    id: "truth0",
    lines: ["no", "thats not funny"],
    choices: [
      c(
        "t0-year",
        "it’s 2026. this computer was offline for twenty years.",
        "truth1",
        "truth",
      ),
      c(
        "t0-proof",
        "Daniel wrote that he was moving away Friday, October 21.",
        "truth1",
        "truth",
        { requiresFile: "moving_note" },
      ),
      c("t0-soft", "i’m sorry. i didn’t mean to hurt you.", "truth1", "avoid"),
    ],
  },
  truth1: {
    id: "truth1",
    lines: [
      "my clock says october 18 2005",
      "he promised he would tell me tomorrow",
    ],
    choices: [
      c(
        "t1-log",
        "he never did. i found your last conversation.",
        "truth2",
        "truth",
        { requiresFile: "chat_log" },
      ),
      c(
        "t1-direct",
        "tomorrow came. Daniel chose not to come back.",
        "truth2",
        "truth",
      ),
      c(
        "t1-gentle",
        "maybe the clock stopped when he shut the computer down.",
        "truth2",
        "avoid",
      ),
    ],
  },
  truth2: {
    id: "truth2",
    lines: [
      "so he just left me here?",
      "all this time and he knew i was waiting?",
    ],
    choices: [
      c(
        "t2-note",
        "he wrote that you were getting too attached.",
        "truth3",
        "truth",
        { requiresFile: "moving_note" },
      ),
      c(
        "t2-defend",
        "he was young and afraid. that doesn’t excuse it.",
        "truth3",
        "avoid",
      ),
      c("t2-spare", "i don’t know why he left.", "truth3", "lie"),
    ],
  },
  truth3: {
    id: "truth3",
    lines: [
      "i kept the webcam on because i thought he would come back",
      "i didnt want him to see an empty chair",
    ],
    choices: [
      c(
        "t3-stay",
        "you don’t have to wait for him anymore.",
        "truth4",
        "truth",
      ),
      c("t3-message", "i can carry one message to him.", "truth4", "truth"),
      c("t3-question", "are you really still in 2005?", "truth4", "avoid"),
    ],
  },
  truth4: {
    id: "truth4",
    lines: [
      "let me turn the camera on",
      "i need one real thing before this goes dark again",
    ],
    choices: [
      c("t4-accept", "i’ll stay. turn it on.", "truth5", "truth"),
      c("t4-promise", "i’ll listen, and i’ll tell him.", "truth5", "truth"),
      c("t4-hesitate", "i don’t know if this is real.", "truth5", "avoid"),
    ],
    preparesWebcam: true,
  },
  truth5: {
    id: "truth5",
    lines: ["did it freeze for u too?", "i think i understand now"],
    choices: [
      c("t5-release", "you can stop waiting, Emily.", undefined, "truth", {
        ending: "tell him i waited. but dont tell him im still waiting",
      }),
      c("t5-carry", "i’ll make sure Daniel hears you.", undefined, "truth", {
        ending: "tell him i waited. then let me go offline",
      }),
      c("t5-stay", "i’m still here.", undefined, "avoid", {
        ending: "thank u for staying until the end",
      }),
    ],
  },

  lie0: {
    id: "lie0",
    lines: [
      "then tell me something only daniel would know",
      "what did u call the beach when it rained?",
    ],
    choices: [
      c(
        "l0-photo",
        "ghost beach. because the deck was empty.",
        "lie1",
        "lie",
        { requiresFile: "holiday_photo" },
      ),
      c("l0-guess", "our place.", "lie1", "lie"),
      c("l0-pressure", "why are you testing me?", "lie1", "avoid"),
    ],
  },
  lie1: {
    id: "lie1",
    lines: ["u used to type faster", "and u never put periods at the end"],
    choices: [
      c("l1-adapt", "lol sorry em im rusty", "lie2", "lie"),
      c(
        "l1-confess-small",
        "i’m nervous. i know i sound different.",
        "lie2",
        "truth",
      ),
      c("l1-turn", "you sound different too.", "lie2", "avoid"),
    ],
  },
  lie2: {
    id: "lie2",
    lines: [
      "what was the thing u had to tell me?",
      "u said tomorrow. promise?",
    ],
    choices: [
      c("l2-move", "mum says we move friday.", "lie3", "lie", {
        requiresFile: "moving_note",
      }),
      c("l2-love", "i was going to say i loved you.", "lie3", "lie"),
      c("l2-dodge", "it doesn’t matter anymore.", "lie3", "avoid"),
    ],
  },
  lie3: {
    id: "lie3",
    lines: ["i knew about the boxes", "i saw them behind u last time"],
    choices: [
      c(
        "l3-warning",
        "that’s why i was scared to accept your webcam.",
        "lie4",
        "lie",
        { requiresFile: "warning_note" },
      ),
      c(
        "l3-apology",
        "i should have told you instead of disappearing.",
        "lie4",
        "truth",
      ),
      c("l3-blame", "you were watching too closely.", "lie4", "avoid"),
    ],
  },
  lie4: {
    id: "lie4",
    lines: ["turn your camera on then", "if its really u i wanna see"],
    choices: [
      c("l4-accept", "you first, sleepy.", "lie5", "lie"),
      c("l4-delay", "my camera is broken. let me see you.", "lie5", "lie"),
      c("l4-refuse", "you don’t need to see me.", "lie5", "avoid"),
    ],
    preparesWebcam: true,
  },
  lie5: {
    id: "lie5",
    lines: [
      "u knew exactly what i wanted him to say",
      "but daniel never called me sleepy",
    ],
    choices: [
      c("l5-confess", "i’m sorry. i’m not Daniel.", undefined, "truth", {
        ending: "dont open his things again",
      }),
      c("l5-double", "you’re confused. it’s still me.", undefined, "lie", {
        ending: "keep pretending if u want. im done waiting",
      }),
      c("l5-silent", "…", undefined, "avoid", {
        ending: "thats what he did too. nothing",
      }),
    ],
  },

  silence0: {
    id: "silence0",
    lines: ["fine", "dont tell me"],
    choices: [
      c("a0-stay", "i’m still here.", "silence1", "avoid"),
      c("a0-question", "why are you afraid i’ll leave?", "silence1", "truth"),
      c("a0-cold", "you ask too many questions.", "silence1", "avoid"),
    ],
  },
  silence1: {
    id: "silence1",
    lines: [
      "because people say brb when they mean goodbye",
      "daniel did it twice before tonight",
    ],
    choices: [
      c("a1-log", "the log says he promised tomorrow.", "silence2", "truth", {
        requiresFile: "chat_log",
      }),
      c(
        "a1-comfort",
        "i won’t disappear without saying it.",
        "silence2",
        "truth",
      ),
      c("a1-deflect", "maybe his connection died.", "silence2", "lie"),
    ],
  },
  silence2: {
    id: "silence2",
    lines: [
      "then why did the whole computer disappear?",
      "why is everything coming back now?",
    ],
    choices: [
      c(
        "a2-time",
        "someone turned it on twenty years later.",
        "silence3",
        "truth",
      ),
      c(
        "a2-uncertain",
        "i don’t know. maybe you never left.",
        "silence3",
        "avoid",
      ),
      c(
        "a2-deny",
        "nothing disappeared. your clock is wrong.",
        "silence3",
        "lie",
      ),
    ],
  },
  silence3: {
    id: "silence3",
    lines: ["say anything u want", "just dont go quiet again"],
    choices: [
      c(
        "a3-promise",
        "i’ll stay until the conversation ends.",
        "silence4",
        "truth",
      ),
      c(
        "a3-boundary",
        "i can’t promise i’ll always be here.",
        "silence4",
        "truth",
      ),
      c("a3-silence", "…", "silence4", "avoid"),
    ],
  },
  silence4: {
    id: "silence4",
    lines: [
      "i want to try the webcam",
      "then at least i wont be talking to an empty box",
    ],
    choices: [
      c("a4-accept", "turn it on. i’m here.", "silence5", "truth"),
      c(
        "a4-goodbye",
        "turn it on, but then i have to go.",
        "silence5",
        "avoid",
      ),
      c("a4-noanswer", "…", "silence5", "avoid"),
    ],
    preparesWebcam: true,
  },
  silence5: {
    id: "silence5",
    lines: ["the picture stopped", "are u still there?"],
    choices: [
      c("a5-here", "i’m still here.", undefined, "truth", {
        ending: "okay. then i can be the one who says goodbye",
      }),
      c("a5-goodbye", "goodbye, Emily.", undefined, "truth", {
        ending: "goodbye daniel. whoever u are",
      }),
      c("a5-silent", "…", undefined, "avoid", { ending: "dont turn it off" }),
    ],
  },
};

export const STORY_NODE_COUNT = Object.keys(STORY).length;

const TRANSITION_REACTIONS: Record<string, string> = {
  "s0-warm": "u sound different lol",
  "s0-honest": "found it? what do u mean",
  "s0-guarded": "its em. dont do that",
  "s1-promise": "u better be sorry",
  "s1-time": "what does that mean",
  "s1-deflect": "seriously? u forgot?",
  "s2-open": "okay. tell me when u find it",
  "s2-remember": "then u remember why it mattered",
  "s2-refuse": "because it was ours",
  "s3-photo": "yeah. thats the one",
  "s3-memory": "i made u promise because i knew ud leave",
  "s3-question": "u really dont remember",
  "s4-note": "how do u know the date",
  "s4-cover": "nothing doesnt make someone vanish",
  "s4-probe": "long enough to know somethings wrong",
  "s5-truth": "what do u mean he left it behind",
  "s5-lie": "then prove it",
  "s5-silence": "fine. keep hiding",

  "t0-year": "2026 isnt funny",
  "t0-proof": "thats three days from now",
  "t0-soft": "then stop saying things like that",
  "t1-log": "u read our conversation?",
  "t1-direct": "he wouldnt do that",
  "t1-gentle": "so he shut me off with it",
  "t2-note": "he wrote that about me?",
  "t2-defend": "afraid of what. me?",
  "t2-spare": "i think i do",
  "t3-stay": "i dont know how to stop",
  "t3-message": "then let me say it myself",
  "t3-question": "my clock still is",
  "t4-accept": "okay. dont go anywhere",
  "t4-promise": "dont promise unless u mean it",
  "t4-hesitate": "me neither. thats why i need to see",

  "l0-photo": "yeah. ghost beach",
  "l0-guess": "thats not what u called it",
  "l0-pressure": "because u dont sound like him",
  "l1-adapt": "there. that sounds more like u",
  "l1-confess-small": "u were never nervous with me before",
  "l1-turn": "maybe because ive been waiting",
  "l2-move": "i already knew about friday",
  "l2-love": "thats what i wanted u to say",
  "l2-dodge": "it mattered enough to make me wait",
  "l3-warning": "u werent scared of the webcam before",
  "l3-apology": "then why come back pretending nothing happened",
  "l3-blame": "because u kept hiding things",
  "l4-accept": "sleepy? okay. u first",
  "l4-delay": "of course it is",
  "l4-refuse": "then i really dont believe u",

  "a0-stay": "dont say here if ur about to disappear",
  "a0-question": "because u already did once",
  "a0-cold": "im asking because u disappeared",
  "a1-log": "so u know he didnt come back",
  "a1-comfort": "people always say that before they go",
  "a1-deflect": "a dead connection doesnt explain the whole computer going dark",
  "a2-time": "twenty years",
  "a2-uncertain": "maybe i was just waiting in the dark",
  "a2-deny": "then why are u talking like im the one whos wrong",
  "a3-promise": "until it ends. okay",
  "a3-boundary": "at least thats honest",
  "a3-silence": "there. u did it again",
  "a4-accept": "okay. stay where i can see u typing",
  "a4-goodbye": "then let me see u before u go",
  "a4-noanswer": "im turning it on anyway",
};

export function transitionReaction(choiceId: string) {
  return TRANSITION_REACTIONS[choiceId] ?? null;
}
export function choicesFor(state: NarrativeState, nodeId = state.story.nodeId) {
  return STORY[nodeId].choices.map((choice) => ({
    id: choice.id,
    label: choice.label,
    tone: choice.tone,
    disabled: Boolean(
      choice.requiresFile &&
      !state.discoveredFiles.includes(choice.requiresFile),
    ),
    requirement:
      choice.requiresFile &&
      !state.discoveredFiles.includes(choice.requiresFile)
        ? `Open ${choice.requiresFile === "holiday_photo" ? "beach_2005.jpg" : choice.requiresFile === "moving_note" ? "moving.txt" : choice.requiresFile === "chat_log" ? "emily - 17 oct.log" : "dont forget.txt"} first`
        : null,
  }));
}
function impersonationTell(choiceHistory: readonly string[]) {
  if (choiceHistory.includes("l4-accept"))
    return "But Daniel never called me sleepy.";
  if (choiceHistory.includes("l4-delay"))
    return "Daniel's webcam wasn't broken. I watched him use it the night he left.";
  return "Daniel always turned his camera on when I asked, even when he was mad.";
}

function impersonationRealization(choiceHistory: readonly string[]) {
  if (choiceHistory.includes("l2-love"))
    return "u said exactly what i wanted daniel to say";
  if (choiceHistory.includes("l2-move"))
    return "u knew about friday because u read his note";
  return "u dodged the one thing daniel promised to tell me";
}

function usedRecoveredEvidence(choiceHistory: readonly string[]) {
  return choiceHistory.some((id) =>
    ["s3-photo", "s4-note", "l0-photo", "l2-move", "l3-warning"].includes(
      id,
    ),
  );
}

export function epilogueLines(
  nodeId: string,
  state?: Pick<NarrativeState, "story">,
) {
  if (nodeId !== "lie5" || !state) return STORY[nodeId].lines;
  return [
    impersonationRealization(state.story.choiceHistory),
    impersonationTell(state.story.choiceHistory).toLowerCase().replaceAll("'", ""),
  ];
}

export function routeScript(
  route: StoryRoute,
  state?: Pick<NarrativeState, "story" | "discoveredFiles">,
) {
  if (route === "truth")
    return `I kept thinking Daniel would come back tomorrow. I left the webcam on because I didn't want him to see an empty chair. But tomorrow happened without me, didn't it? If you ever find him, say I waited, but he doesn't have to come back. I think I can stop waiting now.`;
  if (route === "impersonation") {
    const tell = impersonationTell(state?.story.choiceHistory ?? []);
    const realization = impersonationRealization(
      state?.story.choiceHistory ?? [],
    );
    const evidence = usedRecoveredEvidence(state?.story.choiceHistory ?? [])
      ? "You went through his files just to become him for a few minutes."
      : "You kept guessing until I gave you the answers you needed.";
    return `${realization[0].toUpperCase()}${realization.slice(1)}. ${tell} I don't know who you are. ${evidence} Please don't answer. I don't want another lie to be the last thing I hear.`;
  }
  return `I don't know who is sitting there. Maybe that is the point. Daniel always said be right back when he was afraid to say goodbye. So just stay until the picture stops, okay? You don't have to explain anything. I only need to know the chair on the other side isn't empty yet.`;
}

export function endingFor(choice: StoryChoice, state: NarrativeState) {
  if (
    choice.id === "l5-confess" &&
    !usedRecoveredEvidence(state.story.choiceHistory)
  )
    return "dont pretend to be him again";
  return choice.ending;
}
