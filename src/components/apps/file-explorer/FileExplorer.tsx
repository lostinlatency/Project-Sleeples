"use client";
import { useMemo, useState } from "react";
import { visibleFiles } from "@/lib/filesystem/manifest";
import { openApp, type AppKind } from "@/stores/desktop-store";
import { useNarrative } from "@/components/system/NarrativeProvider";
import { XpIcon, type XpIconName } from "@/components/desktop/XpIcon";
const fileIcon = (icon: string): XpIconName =>
  (({
    folder: "folder",
    drive: "drive",
    text: "text",
    log: "log",
    image: "image-file",
    playlist: "playlist-file",
  })[icon] as XpIconName) || "text";
const windowsPath = {
  root: String.raw`C:\Documents and Settings\Daniel\My Documents`,
  photos: String.raw`C:\Documents and Settings\Daniel\My Documents\My Pictures`,
  personal: String.raw`C:\Documents and Settings\Daniel\My Documents\Daniel's Stuff`,
};
export function FileExplorer({
  kind,
  payload,
}: {
  kind: AppKind;
  payload?: Record<string, string>;
}) {
  const { view, openFile } = useNarrative();
  const [viewMode, setViewMode] = useState<"icons" | "details">("icons");
  const folderId =
    kind === "documents"
      ? "root_documents"
      : kind === "folder"
        ? payload?.folderId
        : null;
  const items = useMemo(() => {
    if (kind === "recycle") return [];
    if (kind === "computer")
      return [
        {
          id: "drive_c",
          parentId: null,
          name: "Local Disk (C:)",
          kind: "folder" as const,
          icon: "drive",
          modifiedAt: "",
          initiallyVisible: true,
        },
        {
          id: "root_documents",
          parentId: null,
          name: "Daniel’s Documents",
          kind: "folder" as const,
          icon: "folder",
          modifiedAt: "",
          initiallyVisible: true,
        },
      ];
    return visibleFiles(view?.unlockedFiles || []).filter(
      (f) => f.parentId === folderId,
    );
  }, [folderId, kind, view?.unlockedFiles]);
  const open = async (item: (typeof items)[number]) => {
    if (item.id === "drive_c")
      return openApp("folder", "Local Disk (C:)", { folderId: "drive_c" });
    if (item.kind === "folder")
      return openApp(
        item.id === "root_documents" ? "documents" : "folder",
        item.name,
        { folderId: item.id },
      );
    const file = await openFile(item.id);
    if (!file) return;
    const payload: Record<string, string> = {
      fileId: file.id,
      title: file.title,
    };
    if (file.content) payload.content = file.content;
    if (file.assetUrl) payload.assetUrl = file.assetUrl;
    if (file.corrupted) payload.corrupted = "true";
    openApp(
      file.kind === "image"
        ? "image"
        : file.kind === "playlist"
          ? "playlist"
          : "notepad",
      file.title,
      payload,
    );
  };
  return (
    <div className="explorer">
      <div className="explorer-toolbar compact">
        <strong>{viewMode === "icons" ? "Icons" : "Details"}</strong>
        <span />
        <button
          aria-label="Change view"
          onClick={() =>
            setViewMode((v) => (v === "icons" ? "details" : "icons"))
          }
        >
          <XpIcon name="view" size={24} />
        </button>
      </div>
      <div className="address">
        <b>Address</b>
        <div>
          <XpIcon name="folder" size={18} />
          {kind === "computer"
            ? "My Computer"
            : kind === "recycle"
              ? "Recycle Bin"
              : payload?.folderId === "photos"
                ? windowsPath.photos
                : payload?.folderId === "personal"
                  ? windowsPath.personal
                  : windowsPath.root}
        </div>
      </div>
      <div className="explorer-main">
        <div className={`file-grid ${viewMode}`} data-testid="file-grid">
          {items.length === 0 ? (
            <div className="empty-bin">Recycle Bin is empty.</div>
          ) : (
            items.map((item) => (
              <button
                key={item.id}
                className="file-item"
                onDoubleClick={() => void open(item)}
                data-testid={`file-${item.id}`}
              >
                <XpIcon
                  name={fileIcon(item.icon)}
                  size={42}
                  className="file-icon"
                />
                <span className="file-name">{item.name}</span>
                {viewMode === "details" && (
                  <>
                    <small>{item.kind}</small>
                    <small>{item.modifiedAt}</small>
                  </>
                )}
              </button>
            ))
          )}
        </div>
      </div>
      <div className="statusbar">
        <span>
          {items.length} object{items.length === 1 ? "" : "s"}
        </span>
        <span>My Computer</span>
      </div>
    </div>
  );
}
