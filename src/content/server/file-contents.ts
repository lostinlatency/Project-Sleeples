import "server-only";
import type { NarrativeState } from "@/lib/director/types";
import { STORY } from "./story";
export type FilePayload = {
  kind: "text" | "log" | "image" | "playlist";
  title: string;
  content?: string;
  assetUrl?: string;
  corrupted?: boolean;
  caption?: string;
  meta?: string;
};
export const FILE_CONTENTS: Record<
  string,
  FilePayload
> = {
  moving_note: {
    kind: "text",
    title: "moving.txt - Notepad",
    content:
      "oct 15, 2005\n\ndad found the school address again. mum says we leave friday and can't tell anyone where yet. emily's getting too attached. if i tell her we're moving she'll ask where and i can't answer. i still haven't told her.",
  },
  chat_log: {
    kind: "log",
    title: "emily - 17 oct.log",
    content:
      "[10/17/2005 11:32 PM] daniel: i have to tell u something\n[10/17/2005 11:33 PM] sleepless_17: what is it?\n[10/17/2005 11:35 PM] daniel: nm. tomorrow\n[10/17/2005 11:36 PM] sleepless_17: promise?",
  },
  warning_note: {
    kind: "text",
    title: "dont forget.txt - Notepad",
    content:
      "don't start webcam\nshe'll ask me to turn mine on\nshe'll see the boxes\ntell her tomorrow",
  },
  holiday_photo: {
    kind: "image",
    title: "beach_2005.jpg - Windows Picture and Fax Viewer",
    assetUrl: "/assets/images/beach_2005.jpg",
  },
  webcam_still: {
    kind: "image",
    title: "emily_webcam.jpg - Windows Picture and Fax Viewer",
    assetUrl: "/assets/avatars/sleepless_17.webp",
  },
  playlist_2005: {
    kind: "playlist",
    title: "late night.m3u",
    content:
      "#EXTM3U\n01. midnight drive — 3:41\n02. static summer — 4:02\n03. waiting room — 3:18\n04. tomorrow — 4:27\n07. for when you leave [FILE NOT FOUND]",
  },
  brb_readme: {
    kind: "text",
    title: "brb_readme.txt - Notepad",
    content:
      "BRB 0.7 beta\n\nKeeps Messenger status available while away.\nReplies are selected from local conversation history.\nDefault runtime: 02:00:00\n\nWARNING: user profiles share one cache. Do not leave capture mode running.",
  },
  file_fragment: {
    kind: "text",
    title: "for_when_you_leave.scr.fragment - Recovery",
    content:
      "TRANSFER REJECTED — PAYLOAD FRAGMENT RECOVERED FROM BRB_backup_2\n\nrecipient: daniel\nprofile seed: sleepless_17\nfinal instruction: wait until he answers\n\nThe executable payload was not opened.",
    corrupted: true,
  },
  flags_record: {
    kind: "log",
    title: "flags_record.dat - Notepad",
    content:
      "MINESWEEPER FLAGS — RUN RECORD\n\nsleepless_17 vs daniel\n0W — 41L\n\ngames played: 41\ncurrent streak: sleepless_17 (41)\n\nnote: he only ever clicked the middle. every game.",
  },
  brb_users: {
    kind: "log",
    title: "brb_users.log - Notepad",
    content:
      "[profile: sleepless_17] 3,842 lines\n[profile: mike_sk8] 911 lines\n[profile: sarahlou_x] 1,204 lines\n[profile: ?????] damaged\n\nlast write: 10/18/2005 2:24 AM",
  },
  sarah_log: {
    kind: "log",
    title: "sarah_after_shutdown.log - Notepad",
    content:
      "[1:31 AM] sarahlou_x: its off now\n[1:31 AM] sleepless_17: good. i only needed it to remember the goodbye\n[2:18 AM] sleepless_17: the empty chair is behind you too\n[2:18 AM] sarahlou_x: i havent told anyone about the chair",
  },
  contact_cache: {
    kind: "text",
    title: "contact_cache.dat - Notepad",
    content:
      "CONTACT MAP — RECOVERED\n\nsleepless_17 => emily\nmike_sk8 => mike\nsarahlou_x => sarah\ntom_d => daniel\nvisitor => [building…]\n\nIntegrity: changing",
  },
  tom_memory: {
    kind: "text",
    title: "tom_memory.txt - Notepad",
    content:
      "mum singing in the kitchen. daniel under the table because of the thunder. tom promises not to tell.\n\nSOURCE OWNER: unresolved\nCREATED AFTER DEVICE DISCONNECT",
  },
  emily_goodbye: {
    kind: "text",
    title: "emily_goodbye.wmv.partial - Recovery",
    content:
      "Recovered video fragment. Audio track: missing. Final frame: an empty chair. The room hash does not match Emily’s room.",
    corrupted: true,
  },
  brb_final: {
    kind: "text",
    title: "brb.txt - Notepad",
    content: "you forgot one",
  },
  payload_quarantine: {
    kind: "text",
    title: "for_when_you_leave.scr.quarantine - Recovery",
    content:
      "QUARANTINE SCAN — for_when_you_leave.scr\n\npayload: dormant\nprofile seed: sleepless_17\ninstruction: unchanged — wait until he answers\n\nThe file was accepted and contained. It has not executed.\nIt has, however, been renamed once.\n\nCurrent name: for_when_you_stay.scr\n\nNothing requested this scan. Nothing stopped it either.",
    corrupted: true,
  },
  mike_private: {
    kind: "text",
    title: "mike_private_notes.txt - Notepad",
    content:
      "daniel asked for normal replies, not goodbyes. i gave him emily's jokes, sarah's corrections, my excuses. i told myself a voice was not a person.\n\nI was wrong about at least one of those things.",
  },
  sarah_private: {
    kind: "text",
    title: "emily_future.txt - Notepad",
    content:
      "things em said not to tell daniel:\n- apply to art school next year\n- cut her hair after exams\n- see jamie's awful band on friday\n- stop waiting for people who only say brb",
  },
  tom_private: {
    kind: "log",
    title: "move_record.log - Notepad",
    content:
      "[10/15/2005] school office called mum. father requested daniel's address.\n[10/16/2005] boxes moved after dark.\n[10/18/2005] modem removed. computer left because network accounts contained the new surname and destination.",
  },
  truth_reveal: {
    kind: "log",
    title: "emily_weekend.log - Notepad",
    content:
      "sleepless_17: chemistry exam friday then jamies band\nsleepless_17: if theyre awful im applying to art school just to escape\nsleepless_17: dont tell daniel yet. i want one plan thats mine first",
  },
  impersonation_reveal: {
    kind: "text",
    title: "daniel_unsent.txt - Notepad",
    content:
      "em — dad found us again. mum says nobody can know where we're going, not even you. if i explain you'll ask me to stay or tell you where. i can't do either.\n\nthis is not your fault.\n\n[unsent]",
  },
  visitor_profile: {
    kind: "log",
    title: "visitor_profile.dat - Notepad",
    content: "VISITOR PROFILE — RECOVERED",
  },
  silence_reveal: {
    kind: "log",
    title: "blank_reply.log - Notepad",
    content:
      "[10/18/2005 2:20 AM] visitor: ...\n[10/18/2005 2:21 AM] visitor: ...\n[10/18/2005 2:22 AM] visitor: ...\n\nNOTE: entries predate recovered session start.",
    corrupted: true,
  },
};

const ROUTE_LOG_ECHO: Record<"truth" | "impersonation" | "silence", string> = {
  truth: "he never came back. i waited anyway. i think i can stop now",
  impersonation: "that wasnt his voice on the webcam. i knew before the call ended",
  silence: "u stayed the whole night. thats the part i keep replaying",
};

export function fileContentsFor(
  state: NarrativeState,
  fileId: string,
): FilePayload {
  const base = FILE_CONTENTS[fileId];
  if (!base) return base;
  const chapterTwoLive =
    state.chapter === 2 && state.chapterTwo.stage !== "locked";
  if (fileId === "moving_note" && state.reactiveDesktop.movingNoteMutated) {
    const chapterTwoAddendum =
      chapterTwoLive && state.chapterTwo.exposureStage >= 2
        ? "\n\n[recovered addendum — oct 18, 2005]\nshe knows about friday now. i didn't tell her. the computer did."
        : "";
    return {
      ...base,
      content: `${base.content}\n\nyou put everything you couldn't delete in the bin${chapterTwoAddendum}`,
      meta: "Modified: 10/18/2005 2:24 AM",
      corrupted: chapterTwoLive,
    };
  }
  if (fileId === "flags_record" && state.flagsGame.outcome === "visitor_won") {
    return {
      ...base,
      content:
        "MINESWEEPER FLAGS — RUN RECORD\n\nsleepless_17 vs daniel\n0W — 41L\n\nsleepless_17 vs visitor\n0W — 1L\n\ngames played: 42\ncurrent streak: interrupted\n\nnote: this entry was not written by daniel.",
      corrupted: true,
    };
  }
  if (fileId === "chat_log" && chapterTwoLive) {
    const echo =
      ROUTE_LOG_ECHO[state.story.route === "undecided" ? "silence" : state.story.route];
    return {
      ...base,
      content: `${base.content}\n[10/18/2005 2:19 AM] sleepless_17: ${echo}\n[10/18/2005 2:2? AM] sleepless_17: is somebody reading this back to me?\n\nNOTE: entries appended after device recovery.`,
      corrupted: true,
    };
  }
  if (fileId === "moving_note" && chapterTwoLive && state.chapterTwo.exposureStage >= 2) {
    return {
      ...base,
      content: `${base.content}\n\n[recovered addendum — oct 18, 2005]\nshe knows about friday now. i didn't tell her. the computer did.`,
      corrupted: true,
    };
  }
  if (fileId === "brb_users" && chapterTwoLive) {
    const grown = state.turn * 7 + 3842;
    const minutes = 24 + state.chapterTwo.exposureStage;
    const damaged =
      state.chapterTwo.exposureStage >= 4 ? "visitor" : "?????";
    return {
      ...base,
      content: `[profile: sleepless_17] ${grown.toLocaleString("en-US")} lines\n[profile: mike_sk8] ${911 + state.turn * 2} lines\n[profile: sarahlou_x] ${1204 + state.turn * 3} lines\n[profile: ${damaged}] damaged\n\nlast write: 10/18/2005 2:${String(minutes).padStart(2, "0")} AM — writing continues while this window is open`,
      corrupted: state.chapterTwo.exposureStage >= 4,
    };
  }
  if (fileId === "contact_cache" && chapterTwoLive) {
    const converged = state.chapterTwo.completedContacts.length >= 3;
    const visitor =
      converged
        ? "you"
        : state.chapterTwo.fileTransferDecision === "pending"
          ? "[building…]"
          : "[present]";
    return {
      ...base,
      content: `CONTACT MAP — RECOVERED\n\nsleepless_17 => emily\nmike_sk8 => mike\nsarahlou_x => sarah\ntom_d => daniel\nvisitor => ${visitor}\n\nIntegrity: ${converged ? "foreign" : "changing"}`,
    };
  }
  if (fileId === "holiday_photo" && chapterTwoLive && state.chapterTwo.exposureStage >= 4) {
    return {
      ...base,
      meta: "Modified: 08/24/2005 4:31 PM · Camera: Kodak EasyShare CX7300 · Resaved: 10/18/2005 2:2? AM",
      caption:
        "The window reflection shows a third flag. This photo was taken from the deck — nothing was standing there.",
    };
  }
  if (fileId === "webcam_still") {
    return {
      ...base,
      meta: "Modified: 10/18/2005 2:22 AM · Source: sleepless_17 webcam · 1 frame",
      caption: "Captured the moment the connection opened.",
    };
  }
  if (fileId === "visitor_profile") {
    const tones = { truth: 0, lie: 0, avoid: 0 };
    const history = state.story.choiceHistory;
    for (const nodeId of Object.keys(STORY)) {
      for (const choice of STORY[nodeId].choices) {
        if (history.includes(choice.id)) tones[choice.tone] += 1;
      }
    }
    const flags = {
      visitor_won: "played once. the visitor won. the record has been edited",
      visitor_lost: "played once. emily won. she always wins",
      visitor_quit: "played once. the visitor quit. daniel used to do that",
      pending: "not played",
    }[state.flagsGame.outcome];
    const style =
      state.typingTest.status === "submitted"
        ? state.typingTest.score < 0
          ? "typing sample: rejected. not his voice"
          : "typing sample: close enough to fool a lonely program"
        : state.typingTest.status === "skipped"
          ? "typing sample: refused"
          : "typing sample: none";
    const goodbye = {
      quarantine: "no goodbye. the door was closed quietly, from outside",
      release: "a goodbye, given to everyone at once",
      erase: "a goodbye, then silence. the polite kind",
    }[state.chapterTwo.finalDecision ?? "quarantine"];
    const lieCount = tones.lie;
    const content = [
      "VISITOR PROFILE — RECOVERED",
      "",
      "This file was not written by Daniel, Emily, Mike, Sarah, or Tom.",
      "",
      `session: 10/18/2005 — began 2:17 AM`,
      `files opened: ${state.discoveredFiles.filter((id) => id !== "visitor_profile").length}`,
      `answers told as truth: ${tones.truth}`,
      `answers told as lies: ${lieCount}`,
      `answers that avoided the question: ${tones.avoid}`,
      `flags: ${flags}`,
      style,
      `goodbye: ${goodbye}`,
      `recovered memory: ${state.reactiveDesktop.memoryDecision}`,
      `observed behavior: ${state.reactiveDesktop.observedBehavior ?? "no stable observation"}`,
      `shutdown resistance: ${state.reactiveDesktop.blockedShutdown ? "attempted" : "not triggered"}`,
      "",
      state.story.route === "truth"
        ? "assessment: the visitor chose the harder answer early and kept choosing it"
        : state.story.route === "impersonation"
          ? `assessment: the visitor wore his name for ${lieCount} answer${lieCount === 1 ? "" : "s"} and was believed almost to the end`
          : "assessment: the visitor never said. the program has been compiling a name anyway",
      "",
      "note: brb does not forget.",
      lieCount >= 4
        ? "note: it is learning which of your answers were the easy ones."
        : "note: it is still deciding what to keep.",
    ].join("\n");
    return { ...base, content, corrupted: lieCount >= 4 };
  }
  return base;
}
