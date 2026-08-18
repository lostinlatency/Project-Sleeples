import Image from "next/image";
import type { AppKind } from "@/stores/desktop-store";

export type XpIconName =
  | "computer"
  | "documents"
  | "folder"
  | "notepad"
  | "image"
  | "playlist"
  | "msn"
  | "recycle"
  | "internet"
  | "mail"
  | "control"
  | "search"
  | "back"
  | "forward"
  | "up"
  | "view"
  | "drive"
  | "text"
  | "log"
  | "image-file"
  | "playlist-file"
  | "send-file"
  | "call"
  | "webcam"
  | "games"
  | "activities"
  | "add-contact"
  | "emoticon"
  | "delete"
  | "print"
  | "volume"
  | "mute"
  | "restart"
  | "shutdown";

const ICONS: Record<XpIconName, string> = {
  computer: "/assets/icons/xp/computer.svg",
  documents: "/assets/icons/xp/documents.svg",
  folder: "/assets/icons/xp/folder.svg",
  notepad: "/assets/icons/xp/notepad.svg",
  image: "/assets/icons/xp/image.svg",
  playlist: "/assets/icons/xp/playlist.svg",
  msn: "/assets/icons/xp/msn.svg",
  recycle: "/assets/icons/xp/recycle.svg",
  internet: "/assets/icons/xp/internet.svg",
  mail: "/assets/icons/xp/mail.svg",
  control: "/assets/icons/xp/control.svg",
  search: "/assets/icons/xp/search.svg",
  back: "/assets/icons/xp/back.svg",
  forward: "/assets/icons/xp/forward.svg",
  up: "/assets/icons/xp/up.svg",
  view: "/assets/icons/xp/view.svg",
  drive: "/assets/icons/xp/drive.svg",
  text: "/assets/icons/xp/text.svg",
  log: "/assets/icons/xp/log.svg",
  "image-file": "/assets/icons/xp/image-file.svg",
  "playlist-file": "/assets/icons/xp/playlist-file.svg",
  "send-file": "/assets/icons/xp/send-file.svg",
  call: "/assets/icons/xp/call.svg",
  webcam: "/assets/icons/xp/webcam.svg",
  games: "/assets/icons/xp/games.svg",
  activities: "/assets/icons/xp/activities.svg",
  "add-contact": "/assets/icons/xp/add-contact.svg",
  emoticon: "/assets/icons/xp/emoticon.svg",
  delete: "/assets/icons/xp/delete.svg",
  print: "/assets/icons/xp/print.svg",
  volume: "/assets/icons/xp/volume.svg",
  mute: "/assets/icons/xp/mute.svg",
  restart: "/assets/icons/xp/restart.svg",
  shutdown: "/assets/icons/xp/shutdown.svg",
};

export const APP_ICONS: Record<AppKind, XpIconName> = {
  computer: "computer",
  documents: "documents",
  folder: "folder",
  notepad: "notepad",
  image: "image",
  playlist: "playlist",
  "msn-contacts": "msn",
  "msn-chat": "msn",
  "msn-video": "webcam",
  recycle: "recycle",
};

export function XpIcon({
  name,
  size = 48,
  className = "",
}: {
  name: XpIconName;
  size?: number;
  className?: string;
}) {
  return (
    <Image
      className={`xp-svg-icon ${className}`}
      src={ICONS[name]}
      alt=""
      width={size}
      height={size}
      unoptimized
      aria-hidden="true"
    />
  );
}
