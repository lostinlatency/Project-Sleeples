import "server-only";
export const FILE_CONTENTS: Record<
  string,
  {
    kind: "text" | "log" | "image" | "playlist";
    title: string;
    content?: string;
    assetUrl?: string;
    corrupted?: boolean;
  }
> = {
  moving_note: {
    kind: "text",
    title: "moving.txt - Notepad",
    content:
      "oct 15, 2005\n\nemily's getting too attached. mum says we move friday. i still haven't told her.",
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
    content: "don't accept her webcam\nshe'll see the boxes\ntell her tomorrow",
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
      "#EXTM3U\n01. midnight drive — 3:41\n02. static summer — 4:02\n03. waiting room — 3:18\n04. tomorrow — 4:27",
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
};
