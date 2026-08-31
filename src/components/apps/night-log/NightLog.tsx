"use client";
import { useState } from "react";
import {
  clearNightLog,
  formatNightLogEntry,
  loadNightLog,
} from "@/lib/narrative/night-log";

export function NightLog() {
  // This window only mounts after a client interaction, so localStorage
  // is always readable at mount time.
  const [entries, setEntries] = useState(() => loadNightLog());
  const endingsFound = new Set(entries.map((e) => `${e.route}:${e.decision}`))
    .size;
  return (
    <div className="nightlog" data-testid="night-log">
      <div className="nightlog-head">
        <b>Night Log</b>
        <small>
          a private record, kept outside the story · {entries.length} night
          {entries.length === 1 ? "" : "s"} · {endingsFound}/9 outcomes
        </small>
      </div>
      {entries.length === 0 ? (
        <p className="nightlog-empty">
          No completed nights recorded yet.
          <br />
          Finish the conversation and what you did will be written here.
        </p>
      ) : (
        <ol className="nightlog-list">
          {entries.map((entry, index) => (
            <li key={`${entry.at}-${index}`}>
              {formatNightLogEntry(entry)}
            </li>
          ))}
        </ol>
      )}
      <div className="nightlog-foot">
        <small>
          truth · impersonation · silence × quarantine · release · erase
        </small>
        {entries.length > 0 && (
          <button
            onClick={() => {
              clearNightLog();
              setEntries([]);
            }}
          >
            Erase log
          </button>
        )}
      </div>
    </div>
  );
}
