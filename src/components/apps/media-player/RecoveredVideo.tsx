"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { useNarrative } from "@/components/system/NarrativeProvider";

const FINAL_LINE = {
  truth: "you aren't him",
  impersonation: "you almost sound right",
  silence: "say something",
  undecided: "daniel?",
} as const;

export function RecoveredVideo() {
  const { view, sendEvent } = useNarrative();
  const [playing, setPlaying] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const reported = useRef(Boolean(view?.recoveredVideoCompleted));
  const elapsedRef = useRef(0);
  const line = FINAL_LINE[view?.storyRoute ?? "undecided"];

  useEffect(() => {
    if (!playing) return;
    const started = Date.now() - elapsedRef.current * 1000;
    const timer = window.setInterval(() => {
      const seconds = Math.min(12, (Date.now() - started) / 1000);
      elapsedRef.current = seconds;
      setElapsed(seconds);
      if (seconds >= 12) {
        window.clearInterval(timer);
        setPlaying(false);
        if (!reported.current) {
          reported.current = true;
          void sendEvent({ type: "RECOVERED_VIDEO_COMPLETED" });
        }
      }
    }, 100);
    return () => window.clearInterval(timer);
  }, [playing, sendEvent]);

  const completed = elapsed >= 12 || Boolean(view?.recoveredVideoCompleted);
  return (
    <div className="recovered-player" data-playing={playing || undefined}>
      <div className="recovered-screen" aria-live="polite">
        <Image
          src="/assets/avatars/sleepless_17.webp"
          alt="Damaged recovered frame of Emily"
          fill
          sizes="560px"
          priority
        />
        <div className="recovered-static" aria-hidden="true" />
        <p className="recovered-caption">
          {completed ? line : playing ? "[damaged audio · empty room · signal loss]" : "Recovered video paused"}
        </p>
      </div>
      <div className="recovered-controls">
        <button
          onClick={() => {
            if (completed) {
              elapsedRef.current = 0;
              setElapsed(0);
            }
            setPlaying(true);
          }}
        >
          {playing ? "Playing…" : completed ? "Replay" : "Play"}
        </button>
        <progress max={12} value={elapsed} aria-label="Recovered video progress" />
        <span>{Math.floor(elapsed)} / 12 sec</span>
      </div>
      {view?.recoveredVideoCompleted && ["pending", "kept"].includes(view.memoryDecision) ? (
        <div className="memory-actions" aria-label="Recovered memory actions">
          <p>{view.memoryDecision === "kept" && view.chapter === 2 ? "BRB is requesting the file again." : "What should happen to the recovered memory?"}</p>
          <button onClick={() => void sendEvent({ type: "MEMORY_FILE_DECIDED", decision: "send" })}>Send to Emily</button>
          <button onClick={() => void sendEvent({ type: "MEMORY_FILE_DECIDED", decision: "keep" })}>Keep file</button>
          <button className="danger" onClick={() => setConfirmDelete(true)}>Permanently delete</button>
        </div>
      ) : null}
      {confirmDelete ? (
        <div className="xp-confirm" role="dialog" aria-modal="true" aria-labelledby="memory-delete-title">
          <h3 id="memory-delete-title">Confirm File Delete</h3>
          <p>This recovered memory will be permanently deleted.</p>
          <div>
            <button autoFocus onClick={() => { setConfirmDelete(false); void sendEvent({ type: "MEMORY_FILE_DECIDED", decision: "delete" }); }}>Yes</button>
            <button onClick={() => setConfirmDelete(false)}>No</button>
          </div>
        </div>
      ) : null}
    </div>
  );
}
