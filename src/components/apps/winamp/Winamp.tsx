"use client";

import { useEffect, useRef, useState } from "react";
import { useNarrative } from "@/components/system/NarrativeProvider";

function playDamagedAudio() {
  if (navigator.webdriver) return;
  try {
    const context = new AudioContext();
    const duration = 7;
    const buffer = context.createBuffer(1, context.sampleRate * duration, context.sampleRate);
    const data = buffer.getChannelData(0);
    for (let index = 0; index < data.length; index++) {
      const envelope = Math.min(1, index / 3000, (data.length - index) / 6000);
      data[index] = (Math.random() * 2 - 1) * 0.055 * envelope;
    }
    const source = context.createBufferSource();
    source.buffer = buffer;
    source.connect(context.destination);
    source.start();
    source.addEventListener("ended", () => void context.close(), { once: true });
  } catch {
    // The written caption preserves the clue when Web Audio is unavailable.
  }
}

export function Winamp({ payload }: { payload?: Record<string, string> }) {
  const { view, sendEvent } = useNarrative();
  const external = view?.phase === "webcam_active" || (view?.exposureStage ?? 0) >= 4;
  const degraded = view?.chapter === 2 && (view?.exposureStage ?? 0) >= 4;
  const tracks = (payload?.content || "#EXTM3U").split("\n").filter((line) => !line.startsWith("#"));
  const [playingMissing, setPlayingMissing] = useState(false);
  const timer = useRef<number | null>(null);

  useEffect(() => () => {
    if (timer.current) window.clearTimeout(timer.current);
  }, []);

  const play = (track: string) => {
    if (!track.includes("FILE NOT FOUND") || playingMissing) return;
    setPlayingMissing(true);
    playDamagedAudio();
    void sendEvent({ type: "PLAYLIST_TRACK_PLAYED", trackId: "missing_goodbye" });
    timer.current = window.setTimeout(() => setPlayingMissing(false), 7000);
  };

  return (
    <div className="winamp" data-degraded={degraded || undefined}>
      <div className="winamp-top">
        <b>WINAMP</b>
        <div className="winamp-screen" data-external={external || undefined}>
          <span>{external ? <i>||</i> : "01"}</span>
          <div>
            <em>{playingMissing ? "0:0?" : "0:00"}</em>
            <small>{playingMissing ? "BUFFER SOURCE: UNKNOWN" : external ? "external stream — paused" : "playlist recovered"}</small>
          </div>
          <i>▂▃▅▇▆▃▂</i>
        </div>
      </div>
      <div className="playlist-title">{degraded ? `WINAMP PLAYLIST — ${tracks.length} TR?CKS` : "WINAMP PLAYLIST"}</div>
      <ol>
        {tracks.map((track, index) => (
          <li key={`${track}-${index}`}>
            <button onClick={() => play(track)} disabled={!track.includes("FILE NOT FOUND") || playingMissing}>
              {index + 1}. {track}
            </button>
          </li>
        ))}
      </ol>
      <div className="playlist-foot">
        <span>{playingMissing ? "[static] check where you left it" : `${tracks.length} tracks · --:--`}</span>
      </div>
    </div>
  );
}
