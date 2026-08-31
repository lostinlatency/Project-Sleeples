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
  drive_c: "C:\\",
};
const folderLabel = (kind: AppKind, folderId?: string) =>
  kind === "computer"
    ? "My Computer"
    : kind === "recycle"
      ? "Recycle Bin"
      : folderId === "photos"
        ? "My Pictures"
        : folderId === "personal"
          ? "Daniel's Stuff"
          : folderId === "drive_c"
            ? "Local Disk (C:)"
            : "My Documents";
export function FileExplorer({
  kind,
  payload,
}: {
  kind: AppKind;
  payload?: Record<string, string>;
}) {
  const { view, openFile, sendEvent } = useNarrative();
  const [viewMode, setViewMode] = useState<"icons" | "details">("icons");
  const [confirmDelete, setConfirmDelete] = useState(false);
  const folderId =
    kind === "documents"
      ? "root_documents"
      : kind === "folder"
        ? payload?.folderId
        : null;
  const items = useMemo(() => {
    if (kind === "recycle")
      return view?.recycleArtifact === "available"
        ? [{
            id: "emily_goodbye",
            parentId: null,
            name: "emily_goodbye.wmv.partial",
            kind: "text" as const,
            icon: "text",
            modifiedAt: "10/18/2005 2:24 AM",
            initiallyVisible: false,
          }]
        : [];
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
  }, [folderId, kind, view?.recycleArtifact, view?.unlockedFiles]);
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
    if (file.caption) payload.caption = file.caption;
    if (file.meta) payload.meta = file.meta;
    openApp(
      file.id === "emily_goodbye"
        ? "media-player"
        : file.kind === "image"
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
                  : payload?.folderId === "drive_c"
                    ? windowsPath.drive_c
                    : windowsPath.root}
        </div>
      </div>
      <div className="explorer-main">
        <div className={`file-grid ${viewMode}`} data-testid="file-grid">
      {items.length === 0 ? (
            <div className="empty-bin">
              {kind === "recycle"
                ? view?.recycleArtifact === "residual"
                  ? "No visible objects. Status: 1 object, 0 bytes."
                  : "Recycle Bin is empty."
                : "This folder is empty."}
            </div>
          ) : (
            items.map((item) => (
              <div key={item.id} className="file-item-wrap">
                <button
                  className="file-item"
                  onDoubleClick={() => kind !== "recycle" && void open(item)}
                  onClick={(event) => {
                    if (event.detail === 0 && kind !== "recycle") void open(item);
                  }}
                  data-testid={`file-${item.id}`}
                >
                  <XpIcon name={fileIcon(item.icon)} size={42} className="file-icon" />
                  <span className="file-name">{item.name}</span>
                  {viewMode === "details" ? <><small>{item.kind}</small><small>{item.modifiedAt}</small></> : null}
                </button>
                {kind === "recycle" ? (
                  <div className="recycle-actions">
                    <button data-testid="restore-artifact" onClick={() => void sendEvent({ type: "RECYCLE_ARTIFACT_DECIDED", decision: "restore" })}>Restore</button>
                    <button data-testid="delete-artifact" onClick={() => setConfirmDelete(true)}>Delete permanently</button>
                  </div>
                ) : null}
              </div>
            ))
          )}
        </div>
      </div>
      <div className="statusbar">
        <span>
          {items.length} object{items.length === 1 ? "" : "s"}
        </span>
        <span>{folderLabel(kind, payload?.folderId)}</span>
      </div>
      {confirmDelete ? (
        <div className="xp-confirm" role="dialog" aria-modal="true" aria-labelledby="delete-title">
          <h3 id="delete-title">Confirm File Delete</h3>
          <p>Are you sure you want to permanently delete &quot;emily_goodbye.wmv.partial&quot;?</p>
          <div>
            <button autoFocus onClick={() => { setConfirmDelete(false); void sendEvent({ type: "RECYCLE_ARTIFACT_DECIDED", decision: "delete" }); }}>Yes</button>
            <button onClick={() => setConfirmDelete(false)}>No</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
