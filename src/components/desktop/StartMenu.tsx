"use client";
import { useEffect, useRef } from "react";
import { openApp, useDesktopStore } from "@/stores/desktop-store";
import { useNarrative } from "@/components/system/NarrativeProvider";
import { XpIcon, type XpIconName } from "./XpIcon";

export function StartMenu({
  onPower,
}: {
  onPower: (mode: "shutdown" | "restart") => void;
}) {
  const open = useDesktopStore((s) => s.startMenuOpen);
  const close = useDesktopStore((s) => s.closeStart);
  const { sendEvent } = useNarrative();
  const menuRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return;
    menuRef.current
      ?.querySelector<HTMLButtonElement>(".start-item")
      ?.focus();
  }, [open]);
  useEffect(() => {
    if (!open) return;
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        close();
        return;
      }
      if (event.key !== "ArrowDown" && event.key !== "ArrowUp") return;
      const items = Array.from(
        menuRef.current?.querySelectorAll<HTMLButtonElement>(".start-item") ??
          [],
      );
      if (!items.length) return;
      event.preventDefault();
      const currentIndex = items.indexOf(
        document.activeElement as HTMLButtonElement,
      );
      const start =
        currentIndex < 0
          ? event.key === "ArrowUp"
            ? items.length
            : -1
          : currentIndex;
      const step = event.key === "ArrowDown" ? 1 : -1;
      const next = items[(start + step + items.length) % items.length];
      next?.focus();
    };
    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, [open, close]);
  if (!open) return null;
  return (
    <div ref={menuRef} className="start-menu" role="menu">
      <div className="start-user">
        <span className="user-tile">D</span>
        <strong>Daniel</strong>
      </div>
      <div className="start-columns">
        <div className="start-primary">
          <Menu
            label="Internet"
            detail="Internet Explorer"
            icon="internet"
            onClick={() =>
              alert("Internet Explorer cannot display the webpage.")
            }
          />
          <Menu
            label="E-mail"
            detail="Outlook Express"
            icon="mail"
            onClick={() => alert("There are no new messages.")}
          />
          <hr />
          <Menu
            label="MSN Messenger 7.0"
            icon="msn"
            onClick={() => openApp("msn-contacts")}
          />
          <Menu
            label="Notepad"
            icon="notepad"
            onClick={() =>
              openApp("notepad", "Untitled - Notepad", { content: "" })
            }
          />
          <Menu
            label="Games"
            detail="3D Pinball — Space Cadet"
            icon="games"
            onClick={() => {
              openApp("pinball", "3D Pinball for Windows - Space Cadet");
              void sendEvent({ type: "PINBALL_OPENED" });
            }}
          />
        </div>
        <div className="start-secondary">
          <Menu
            label="My Documents"
            icon="folder"
            onClick={() => openApp("documents")}
          />
          <Menu
            label="My Pictures"
            icon="image"
            onClick={() =>
              openApp("folder", "My Pictures", { folderId: "photos" })
            }
          />
          <Menu
            label="My Computer"
            icon="computer"
            onClick={() => openApp("computer")}
          />
          <hr />
          <Menu
            label="Control Panel"
            icon="control"
            onClick={() =>
              alert("Some Control Panel settings are unavailable.")
            }
          />
          <Menu
            label="Search"
            icon="search"
            onClick={() => alert("Search Companion could not start.")}
          />
          <Menu
            label="Night Log"
            icon="notepad"
            onClick={() => openApp("nightlog", "Night Log")}
          />
        </div>
      </div>
      <div className="start-footer">
        <button
          onClick={() => {
            close();
            onPower("restart");
          }}
        >
          <XpIcon name="restart" size={25} /> Restart
        </button>
        <button
          onClick={() => {
            close();
            onPower("shutdown");
          }}
        >
          <XpIcon name="shutdown" size={25} /> Turn Off Computer
        </button>
      </div>
    </div>
  );
}

function Menu({
  label,
  detail,
  icon,
  onClick,
}: {
  label: string;
  detail?: string;
  icon: string;
  onClick: () => void;
}) {
  const close = useDesktopStore((s) => s.closeStart);
  const normalized: Record<string, XpIconName> = {
    internet: "internet",
    mail: "mail",
    msn: "msn",
    notepad: "notepad",
    folder: "documents",
    image: "image",
    computer: "computer",
    control: "control",
    search: "search",
    games: "games",
  };
  return (
    <button
      className="start-item"
      role="menuitem"
      onClick={() => {
        close();
        onClick();
      }}
    >
      <XpIcon name={normalized[icon]} size={32} className="small-icon" />
      <span>
        <b>{label}</b>
        {detail && <small>{detail}</small>}
      </span>
    </button>
  );
}
