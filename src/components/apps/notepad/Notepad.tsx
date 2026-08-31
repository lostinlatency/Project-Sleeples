"use client";

import { useRef, useState } from "react";
import { useNarrative } from "@/components/system/NarrativeProvider";

export function Notepad({ payload }: { payload?: Record<string, string> }) {
  const { view, openFile } = useNarrative();
  const [text, setText] = useState(payload?.content || "");
  const [meta, setMeta] = useState(payload?.meta || "");
  const lastContent = useRef(payload?.content || "");
  const content = payload?.content || "";
  if (content !== lastContent.current) {
    lastContent.current = content;
    setText(content);
    setMeta(payload?.meta || "");
  }

  const refreshMutation = async () => {
    if (
      payload?.fileId !== "moving_note" ||
      !view?.movingNoteMutated ||
      text.includes("everything you couldn't delete in the bin")
    )
      return;
    const refreshed = await openFile("moving_note");
    if (refreshed?.content) {
      lastContent.current = refreshed.content;
      setText(refreshed.content);
      setMeta(refreshed.meta || "");
    }
  };

  return (
    <div className="notepad">
      <textarea
        value={text}
        onChange={(event) => setText(event.target.value)}
        onBlur={() => void refreshMutation()}
        spellCheck={false}
        aria-label="Notepad text"
      />
      {meta ? <div className="notepad-meta">{meta}</div> : null}
    </div>
  );
}
