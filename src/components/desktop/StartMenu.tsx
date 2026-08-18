"use client";
import { openApp, useDesktopStore } from "@/stores/desktop-store";
import { XpIcon, type XpIconName } from "./XpIcon";

export function StartMenu({
  onPower,
}: {
  onPower: (mode: "shutdown" | "restart") => void;
}) {
  const open = useDesktopStore((s) => s.startMenuOpen);
  const close = useDesktopStore((s) => s.closeStart);
  if (!open) return null;
  return (
    <div className="start-menu" role="menu">
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
