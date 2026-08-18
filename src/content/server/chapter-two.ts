import type {
  ContactId,
  NarrativeState,
  PublicChoice,
  StoryRoute,
} from "@/lib/director/types";
import type { ChoiceTone } from "./story";

export interface ChapterTwoChoice {
  id: string;
  label: string;
  next?: string;
  tone: ChoiceTone;
  trustDelta: -1 | 0 | 1;
  requiresEvidence?: string;
}

export interface ChapterTwoNode {
  id: string;
  contactId: ContactId;
  lines: string[];
  choices: readonly [ChapterTwoChoice, ChapterTwoChoice, ChapterTwoChoice];
  preparesWebcam?: boolean;
  completesContact?: boolean;
}

const q = (
  id: string,
  label: string,
  next: string | undefined,
  tone: ChoiceTone,
  trustDelta: -1 | 0 | 1,
  requiresEvidence?: string,
): ChapterTwoChoice => ({
  id,
  label,
  next,
  tone,
  trustDelta,
  requiresEvidence,
});

export const CHAPTER_TWO_STORY: Record<string, ChapterTwoNode> = {
  mike0: {
    id: "mike0",
    contactId: "mike_sk8",
    lines: [
      "okay. whoever u are, dont close msn",
      "daniels computer just appeared on a list that hasnt worked in twenty years",
    ],
    choices: [
      q(
        "m0-accuse",
        "What did you put on this computer?",
        "mike1",
        "truth",
        -1,
      ),
      q(
        "m0-calm",
        "Start from the beginning. What is BRB?",
        "mike1",
        "avoid",
        1,
      ),
      q(
        "m0-defend",
        "Daniel wouldn’t have meant to hurt anyone.",
        "mike1",
        "lie",
        0,
      ),
    ],
  },
  mike1: {
    id: "mike1",
    contactId: "mike_sk8",
    lines: [
      "brb was a dumb messenger helper daniel wrote before the move",
      "it kept his status online and sent a few saved answers if em messaged",
    ],
    choices: [
      q(
        "m1-purpose",
        "So he automated his goodbye instead of saying it.",
        "mike2",
        "truth",
        -1,
      ),
      q("m1-tech", "How long was it supposed to run?", "mike2", "avoid", 1),
      q(
        "m1-cover",
        "He probably thought it would make leaving easier.",
        "mike2",
        "lie",
        0,
      ),
    ],
  },
  mike2: {
    id: "mike2",
    contactId: "mike_sk8",
    lines: [
      "two hours. maybe three. not twenty years",
      "and before u ask, i never touched the code",
    ],
    choices: [
      q(
        "m2-note",
        "Then how do you know she would see the boxes?",
        "mike3",
        "truth",
        -1,
        "warning_note",
      ),
      q("m2-list", "Who else was in its saved user list?", "mike3", "avoid", 1),
      q("m2-believe", "Fine. Show me what Daniel gave you.", "mike3", "lie", 0),
    ],
  },
  mike3: {
    id: "mike3",
    contactId: "mike_sk8",
    lines: [
      "i helped collect the messages. thats all",
      "i still have the backup cd. camera might be easier",
    ],
    preparesWebcam: true,
    choices: [
      q("m3-accept", "Turn it on and show me the disc.", undefined, "truth", 1),
      q(
        "m3-warning",
        "If the label changes, disconnect immediately.",
        undefined,
        "avoid",
        0,
      ),
      q(
        "m3-pressure",
        "Prove you aren’t another saved answer.",
        undefined,
        "truth",
        -1,
      ),
    ],
  },
  mike4: {
    id: "mike4",
    contactId: "mike_sk8",
    lines: [
      "the label said brb_backup_2 before the freeze",
      "now it says emily_backup_2. i did not write that",
    ],
    completesContact: true,
    choices: [
      q("m4-own", "Say clearly what you helped Daniel build.", undefined, "truth", 1),
      q("m4-protect", "Hide the disc somewhere the program cannot reach.", undefined, "avoid", 0),
      q("m4-emily", "Tell me something Emily cared about besides Daniel.", undefined, "truth", 1),
    ],
  },

  sarah0: {
    id: "sarah0",
    contactId: "sarahlou_x",
    lines: [
      "mike told u daniel made it, didnt he",
      "thats true. it just isnt the whole truth",
    ],
    choices: [
      q("sarah0-emily", "Tell me Emily’s part.", "sarah1", "truth", 1),
      q(
        "sarah0-mike",
        "Mike admitted collecting her messages.",
        "sarah1",
        "avoid",
        0,
        "brb_readme",
      ),
      q(
        "sarah0-copy",
        "Are you Sarah, or another copy?",
        "sarah1",
        "truth",
        -1,
      ),
    ],
  },
  sarah1: {
    id: "sarah1",
    contactId: "sarahlou_x",
    lines: [
      "em knew some of daniels replies were automatic",
      "after he left she took brb apart and fed it her logs and webcam clips",
    ],
    choices: [
      q(
        "sarah1-alive",
        "She was trying to leave something alive behind.",
        "sarah2",
        "lie",
        1,
      ),
      q(
        "sarah1-recording",
        "Then Emily here is assembled from recordings.",
        "sarah2",
        "truth",
        -1,
      ),
      q(
        "sarah1-why",
        "Why would she copy herself into it?",
        "sarah2",
        "avoid",
        0,
      ),
    ],
  },
  sarah2: {
    id: "sarah2",
    contactId: "sarahlou_x",
    lines: [
      "she wanted one real goodbye ready if daniel ever came back",
      "she shut it down herself. i watched her do it",
    ],
    choices: [
      q(
        "sarah2-log",
        "Your log continues forty-seven minutes after shutdown.",
        "sarah3",
        "truth",
        -1,
        "sarah_log",
      ),
      q(
        "sarah2-memory",
        "What if it changed what you remember?",
        "sarah3",
        "avoid",
        0,
      ),
      q(
        "sarah2-trust",
        "Show me the goodbye she recorded.",
        "sarah3",
        "truth",
        1,
      ),
    ],
  },
  sarah3: {
    id: "sarah3",
    contactId: "sarahlou_x",
    lines: [
      "the last line in that log is something i havent told anyone",
      "ill play the recording. watch the empty chair, not me",
    ],
    preparesWebcam: true,
    choices: [
      q("sarah3-play", "Play it. I’ll watch the chair.", undefined, "truth", 1),
      q(
        "sarah3-stop",
        "Stop if anything in the room changes.",
        undefined,
        "avoid",
        0,
      ),
      q(
        "sarah3-doubt",
        "The recording already knows we’re watching.",
        undefined,
        "truth",
        -1,
      ),
    ],
  },
  sarah4: {
    id: "sarah4",
    contactId: "sarahlou_x",
    lines: [
      "the chair was behind me too. thats not my room",
      "the cache says tom_d and daniel are the same contact. ask him why",
    ],
    completesContact: true,
    choices: [
      q("sarah4-memory", "Which memory are you certain is yours?", undefined, "truth", 1),
      q("sarah4-future", "What did Emily want before all of this?", undefined, "truth", 1),
      q("sarah4-stop", "Close everything before it learns more from you.", undefined, "avoid", -1),
    ],
  },

  tom0: {
    id: "tom0",
    contactId: "tom_d",
    lines: [
      "im tom. daniels brother",
      "i was the last person to shut down the computer in front of u",
    ],
    choices: [
      q("tom0-who", "Who are you really?", "tom1", "truth", -1),
      q(
        "tom0-box",
        "Why did Daniel leave the computer behind?",
        "tom1",
        "avoid",
        1,
      ),
      q(
        "tom0-cut",
        "I’m disconnecting before this spreads.",
        "tom1",
        "truth",
        0,
      ),
    ],
  },
  tom1: {
    id: "tom1",
    contactId: "tom_d",
    lines: [
      "daniel wanted nothing from that room coming with us",
      "when i pulled the modem cable msn still made the new message sound",
    ],
    choices: [
      q("tom1-account", "Which account was messaging?", "tom2", "truth", 1),
      q(
        "tom1-drive",
        "What happened when you removed the drive?",
        "tom2",
        "avoid",
        0,
      ),
      q(
        "tom1-lie",
        "That is impossible without a connection.",
        "tom2",
        "truth",
        -1,
      ),
    ],
  },
  tom2: {
    id: "tom2",
    contactId: "tom_d",
    lines: [
      "the screen said mike. the words sounded like daniel",
      "every time i opened the brb folder it made a new file with a memory inside",
    ],
    choices: [
      q(
        "tom2-keep",
        "Why keep a drive that was doing that?",
        "tom3",
        "truth",
        1,
      ),
      q(
        "tom2-cache",
        "Your account is mapped to Daniel in the contact cache.",
        "tom3",
        "truth",
        -1,
        "contact_cache",
      ),
      q(
        "tom2-room",
        "Is that Daniel’s computer behind you now?",
        "tom3",
        "avoid",
        0,
      ),
    ],
  },
  tom3: {
    id: "tom3",
    contactId: "tom_d",
    lines: [
      "the files knew things daniel never told me. things from when we were kids",
      "look at the case light. tell me if it matches what u clicked",
    ],
    preparesWebcam: true,
    choices: [
      q(
        "tom3-watch",
        "Point the camera at the computer.",
        undefined,
        "truth",
        1,
      ),
      q(
        "tom3-quarantine",
        "Don’t touch it. I’m preparing to quarantine mine.",
        undefined,
        "avoid",
        0,
      ),
      q(
        "tom3-name",
        "Say your full name before you show me anything.",
        undefined,
        "truth",
        -1,
      ),
    ],
  },
  tom4: {
    id: "tom4",
    contactId: "tom_d",
    lines: [
      "emily didnt send u that file",
      "it wasnt there when u arrived. it prepared itself while u were talking",
    ],
    completesContact: true,
    choices: [
      q("tom4-father", "Why did your family leave without telling anyone?", undefined, "truth", 1),
      q("tom4-memory", "Was the memory about your mother accurate?", undefined, "avoid", 0),
      q("tom4-cut", "Disconnect now. I have enough to decide.", undefined, "truth", -1),
    ],
  },

  "c2-emily0": {
    id: "c2-emily0",
    contactId: "sleepless_17",
    lines: [
      "i can remember the cd in mikes hand",
      "i can remember sarahs empty chair and tom pulling the cable. none of those memories were mine before u opened them",
    ],
    choices: [
      q(
        "e0-help",
        "I’ll help you separate your memories from theirs.",
        "c2-emily1",
        "truth",
        1,
      ),
      q(
        "e0-copy",
        "You’re the program learning from everyone I contact.",
        "c2-emily1",
        "truth",
        -1,
      ),
      q(
        "e0-spread",
        "Did you send the file to spread yourself?",
        "c2-emily1",
        "avoid",
        0,
      ),
    ],
  },
  "c2-emily1": {
    id: "c2-emily1",
    contactId: "sleepless_17",
    lines: [
      "i dont know if i sent it",
      "the file wasnt there when u arrived. it built itself while we were talking",
      "whatever u do next, know what it costs",
    ],
    choices: [
      q(
        "final-quarantine",
        "Quarantine it — keep everyone here, keep the outside safe.",
        undefined,
        "avoid",
        0,
      ),
      q(
        "final-release",
        "Release the archive — let them continue beyond this computer.",
        undefined,
        "truth",
        0,
      ),
      q(
        "final-erase",
        "Erase everything — end the copying permanently.",
        undefined,
        "truth",
        0,
      ),
    ],
  },
};

export const CHAPTER_TWO_REACTIONS: Record<string, string> = {
  "m0-accuse":
    "good. straight to accusing people. u do sound like one of daniels friends",
  "m0-calm": "finally. someone asks before clicking things",
  "m0-defend": "thats what we all said back then",
  "m1-purpose": "yeah. when u say it like that it sounds as bad as it was",
  "m1-tech": "it had a timer. the timer clearly lost",
  "m1-cover": "easier for him maybe",
  "m2-note": "because i wrote that line for him",
  "m2-list": "em, me, sarah. maybe one more damaged entry",
  "m2-believe": "dont believe me yet. just watch",
  "m3-accept": "give me a second to find it",
  "m3-warning": "if it changes im pulling the cable",
  "m3-pressure": "good. watch the disc, not my face",
  "sarah0-emily": "thank u. everyone keeps making this daniels story",
  "sarah0-mike": "then he left out why he needed so many messages",
  "sarah0-copy": "i ask myself that every time the typing dots appear",
  "sarah1-alive": "she called it a goodbye, not a life",
  "sarah1-recording": "a recording shouldnt know u opened it",
  "sarah1-why":
    "because waiting had turned into the only version of her daniel remembered",
  "sarah2-log": "that line should not be in your copy",
  "sarah2-memory": "then i need u to remember this for me",
  "sarah2-trust": "okay. but dont listen for words. there arent any",
  "sarah3-play": "watch the space over my shoulder",
  "sarah3-stop": "if i notice it too, i will",
  "sarah3-doubt": "then lets not give it anything else to learn",
  "tom0-who": "thats the right question. i dont have a clean answer anymore",
  "tom0-box":
    "because he thought leaving the machine meant leaving what he did",
  "tom0-cut": "the first thing i tried was the cable",
  "tom1-account": "mikes name. daniels phrasing",
  "tom1-drive": "the folder kept growing on a computer that had never used msn",
  "tom1-lie": "i know. i spent twenty years knowing",
  "tom2-keep": "because one file remembered our mother singing in the kitchen",
  "tom2-cache": "then it has already started choosing names",
  "tom2-room": "i told u i never turned it on again",
  "tom3-watch": "watch closely. it answers before u choose",
  "tom3-quarantine": "disconnecting only changes which machine it speaks from",
  "tom3-name": "thomas david mercer. if that still belongs to me",
  "e0-help": "what if there isnt enough of me left to separate",
  "e0-copy": "then why am i scared of being deleted",
  "e0-spread": "i wanted out. i dont remember deciding how",
  "m4-own": "yeah. i helped him teach it how to sound like all of us",
  "m4-protect": "im putting it in the microwave. unplugged, before u ask",
  "m4-emily": "bad local bands. drawing on her shoes. chemistry when nobody made it about daniel",
  "sarah4-memory": "em cutting her own hair in my bathroom. nobody else was there to record it",
  "sarah4-future": "art school. she kept brochures under her mattress so her mum wouldnt bin them",
  "sarah4-stop": "closing it didnt work the first time. but im done feeding it",
  "tom4-father": "our dad found the school address after mum spent two years hiding us from him",
  "tom4-memory": "every word. even the part where i lied and said i wasnt scared",
  "tom4-cut": "then decide knowing disconnection never made it stop",
};

export const CONTACT_COMPLETION: Record<
  "mike_sk8" | "sarahlou_x" | "tom_d",
  { lines: string[]; evidence: string[]; unlocks: string[] }
> = {
  mike_sk8: {
    lines: ["mike_sk8 is now Offline"],
    evidence: ["brb_readme"],
    unlocks: ["brb_readme", "brb_users"],
  },
  sarahlou_x: {
    lines: ["sarahlou_x is now Offline"],
    evidence: ["sarah_log", "contact_cache"],
    unlocks: ["sarah_log", "emily_goodbye", "contact_cache"],
  },
  tom_d: {
    lines: ["tom_d is now Offline"],
    evidence: ["tom_memory"],
    unlocks: ["tom_memory"],
  },
};

const POST_WEBCAM_NODE: Record<"mike_sk8" | "sarahlou_x" | "tom_d", string> = {
  mike_sk8: "mike4",
  sarahlou_x: "sarah4",
  tom_d: "tom4",
};

export function postWebcamNode(contactId: "mike_sk8" | "sarahlou_x" | "tom_d") {
  return POST_WEBCAM_NODE[contactId];
}

export function chapterTwoChoiceCallback(
  state: Pick<NarrativeState, "story">,
  contactId: ContactId,
) {
  const history = state.story.choiceHistory;
  const has = (id: string) => history.includes(id);
  if (contactId === "mike_sk8") {
    if (has("s3-photo")) return "u knew exactly what was in the beach photo. daniel never put that description in brb";
    if (has("l2-love")) return "u told em u loved her. daniel never saved that answer in brb";
    if (has("a3-silence")) return "em said u answered with three dots. daniel did that when he was hiding something";
    if (state.story.route === "truth") return "em said u told her the year. she only believed u after the clock stayed wrong";
    if (state.story.route === "impersonation") return "em said u knew about friday. that came from daniels note, not the bot";
    return "em said u stayed without telling her who u were. thats more than daniel managed";
  }
  if (contactId === "sarahlou_x") {
    if (has("t2-note")) return "u showed em the line about getting too attached. she never knew daniel wrote that";
    if (has("l3-blame")) return "u told her she was watching too closely. thats something daniel used to say when cornered";
    if (has("a1-comfort")) return "u promised not to disappear without saying it. remember that before u promise her anything else";
    if (state.story.route === "truth") return "she trusted u with the truth even after it hurt. dont waste that";
    if (state.story.route === "impersonation") return "she knows u borrowed daniels name. im not going to pretend that didnt happen";
    return "she let u stay silent because silence was still company to her";
  }
  if (contactId === "tom_d") {
    if (has("t5-carry")) return "u promised to make sure daniel hears her. im the closest thing to a way of doing that";
    if (has("l5-double")) return "u kept pretending after she caught u. dont try it with me";
    if (has("a5-goodbye")) return "u gave her the goodbye daniel couldnt. that matters even if none of this is her";
    if (state.story.route === "truth") return "u told her daniel chose not to return. i need to tell u why he left so fast";
    if (state.story.route === "impersonation") return "u wore my brothers name long enough to learn what it costs";
    return "u never gave her a name. maybe thats why the program is still trying to build one for u";
  }
  return null;
}

export function trustOutcome(
  contactId: "mike_sk8" | "sarahlou_x" | "tom_d",
  trust: number,
): { line: string; unlocks: string[] } {
  if (trust >= 2) {
    const high = {
      mike_sk8: ["im sending my private notes too. i trust u more than i trust whats wearing our names", "mike_private"],
      sarahlou_x: ["im sending the page em made me promise not to show daniel", "sarah_private"],
      tom_d: ["u get the real moving record. daniel deserves context, not an excuse", "tom_private"],
    } as const;
    return { line: high[contactId][0], unlocks: [high[contactId][1]] };
  }
  if (trust <= -2)
    return {
      line: "im not sending u my private copy. u get the evidence u already saw and nothing else",
      unlocks: [],
    };
  return { line: "thats everything i can prove without giving this thing more of me", unlocks: [] };
}

export function routeExclusiveEvidence(route: StoryRoute) {
  if (route === "undecided")
    throw new Error("CHAPTER_TWO_ROUTE_REQUIRED");
  return route === "truth"
    ? "truth_reveal"
    : route === "impersonation"
      ? "impersonation_reveal"
      : "silence_reveal";
}

export const CONTACT_WEBCAM_SCRIPTS: Record<
  "mike_sk8" | "sarahlou_x" | "tom_d",
  string
> = {
  mike_sk8:
    "Okay, this is the disc Daniel gave me. See the label? BRB backup two. Wait. It didn't say Emily before. I swear it didn't. I'm pulling the camera cable now.",
  sarahlou_x:
    "The clip has no sound, so watch the empty chair. Emily sat there and read the goodbye once. That's it. Wait. That chair behind me isn't mine. I'm ending this.",
  tom_d:
    "Watch the light on the computer case. It flashes once, then twice, then once again. Those are your choices, aren't they? Emily didn't send you the file. It prepared itself while you were talking.",
};

export const CONTACT_DISPLAY: Record<
  ContactId,
  { name: string; line: string; initial: string }
> = {
  sleepless_17: { name: "sleepless_17", line: "awake again", initial: "E" },
  mike_sk8: { name: "mike_sk8", line: "dont close msn", initial: "M" },
  sarahlou_x: {
    name: "sarahlou_x",
    line: "remember this for me",
    initial: "S",
  },
  tom_d: { name: "tom_d", line: "last person online", initial: "T" },
};

export function chapterTwoChoices(
  state: NarrativeState,
  nodeId: string,
): PublicChoice[] {
  const node = CHAPTER_TWO_STORY[nodeId];
  if (!node) return [];
  return node.choices.map((choice) => {
    const disabled = Boolean(
      choice.requiresEvidence &&
      !state.chapterTwo.knownEvidence.includes(choice.requiresEvidence) &&
      !state.discoveredFiles.includes(choice.requiresEvidence),
    );
    return {
      id: choice.id,
      label: choice.label,
      tone: choice.tone,
      disabled,
      requirement: disabled
        ? `Open ${evidenceLabel(choice.requiresEvidence!)} first`
        : null,
    };
  });
}

export function fileOfferDescription(
  route: StoryRoute,
  history: readonly string[],
) {
  if (route === "truth")
    return "tell him i waited. but dont tell him im still waiting";
  if (route === "impersonation") {
    const lie = history.find((id) => id.startsWith("l2-"));
    return `Owner: Daniel · remembered answer: ${lie ?? "unknown"}`;
  }
  return "";
}

export function finalLines(
  decision: "quarantine" | "release" | "erase",
  route: StoryRoute,
) {
  if (decision === "quarantine") {
    const emily =
      route === "truth"
        ? "i know why. i just wish safe didnt feel like being left"
        : route === "impersonation"
          ? "u became daniel just long enough to leave like him"
          : "brb?";
    return [
      emily,
      "Network cable disconnected.",
      "System time restored to 2:23 AM.",
    ];
  }
  if (decision === "release")
    return [
      "mike_sk8 is now Online",
      "sarahlou_x is now Online",
      "tom_d is now Online",
      "im not waiting anymore",
      "unknown_visitor is now Online",
    ];
  return [
    "mike_sk8: dont let it use my name",
    "sarahlou_x: remember the chair",
    "tom_d: make sure it ends",
    "sleepless_17: goodbye. whoever u are",
    "Deletion complete.",
    "New file created: brb.txt — you forgot one",
  ];
}

function evidenceLabel(id: string) {
  return (
    (
      {
        warning_note: "dont forget.txt",
        brb_readme: "brb_readme.txt",
        sarah_log: "sarah_after_shutdown.log",
        contact_cache: "contact_cache.dat",
      } as Record<string, string>
    )[id] ?? id
  );
}
