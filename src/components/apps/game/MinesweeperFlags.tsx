"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useNarrative } from "@/components/system/NarrativeProvider";
import { useDesktopStore } from "@/stores/desktop-store";
import {
  applyEmilyMove,
  clickCell,
  createFlagsGame,
  type FlagsSnapshot,
} from "@/lib/games/flags";

const BANT = {
  start: [
    "u go first. he always made me go first",
    "same board as always. u remember how this works",
  ],
  visitorMine: ["beginners luck", "okay. one. it was one"],
  emilyMine: ["and thats mine", "thank u very much", "he used to scream at that"],
  visitorAhead: ["ok. who is this", "haha. very funny"],
  emilyAhead: ["just like old times", "dont choke now"],
  idle: ["r u still on the board?", "hello? the mines are waiting"],
} as const;

type BantKey = keyof typeof BANT;

const pick = (lines: readonly string[]) =>
  lines[Math.floor(Math.random() * lines.length)];

export function MinesweeperFlags() {
  const { view } = useNarrative();
  const status = view?.flagsStatus ?? "hidden";
  const round = view?.flagsRound ?? 0;
  // A finished match keeps the board it ended with: the result bumps the
  // round, so the done-state pins the seed to the round it was played in.
  const seedKey = `${view?.sessionId ?? "session"}:${
    status === "done" ? Math.max(0, round - 1) : round
  }`;
  return <FlagsMatch key={seedKey} seedKey={seedKey} />;
}

function FlagsMatch({ seedKey }: { seedKey: string }) {
  const { sendEvent } = useNarrative();
  const closeWindow = useDesktopStore((s) => s.closeWindow);
  const [snapshot, setSnapshot] = useState<FlagsSnapshot>(() =>
    createFlagsGame(seedKey),
  );
  const [bant, setBant] = useState<string>(() => pick(BANT.start));
  const [quit, setQuit] = useState(false);
  const reported = useRef(false);

  const sayBant = useCallback((key: BantKey) => {
    setBant(pick(BANT[key]));
  }, []);

  const finish = useCallback(
    (outcome: "won" | "lost" | "quit", final: FlagsSnapshot) => {
      if (reported.current) return;
      reported.current = true;
      if (outcome === "quit") setQuit(true);
      void sendEvent({
        type: "GAME_RESULT",
        outcome,
        visitorMines: final.visitorScore,
        emilyMines: final.emilyScore,
        turns: final.visitorScore + final.emilyScore,
      });
    },
    [sendEvent],
  );

  useEffect(() => {
    if (snapshot.status !== "playing" || quit || snapshot.turn !== "emily")
      return;
    const timer = setTimeout(() => {
      const next = applyEmilyMove(snapshot);
      if (next === snapshot) return;
      if (next.emilyScore > snapshot.emilyScore) sayBant("emilyMine");
      if (next.status === "emily_won") {
        sayBant("emilyAhead");
        finish("lost", next);
      }
      setSnapshot(next);
    }, 700 + Math.random() * 700);
    return () => clearTimeout(timer);
  }, [snapshot, sayBant, finish, quit]);

  useEffect(() => {
    if (snapshot.status !== "playing") return;
    const idle = setTimeout(() => sayBant("idle"), 22_000);
    return () => clearTimeout(idle);
  }, [snapshot, sayBant]);

  const click = (cell: number) => {
    if (snapshot.status !== "playing" || quit || snapshot.turn !== "visitor")
      return;
    const before = snapshot.visitorScore;
    const next = clickCell(snapshot, cell, "visitor");
    if (next === snapshot) return;
    if (next.visitorScore > before) sayBant("visitorMine");
    else if (next.visitorScore - next.emilyScore >= 3) sayBant("visitorAhead");
    else if (next.emilyScore - next.visitorScore >= 3) sayBant("emilyAhead");
    if (next.status === "visitor_won") {
      sayBant("emilyAhead");
      finish("won", next);
    }
    setSnapshot(next);
  };

  const statusLine =
    snapshot.status === "playing"
      ? quit
        ? "You left the board. The match is over."
        : snapshot.turn === "visitor"
          ? "Your move — click a square. Find 26 of 51 mines."
          : "sleepless_17 is looking…"
      : snapshot.status === "visitor_won"
        ? "You win. She is not smiling anymore."
        : "sleepless_17 wins.";

  return (
    <div className="flags-game" data-testid="flags-game">
      <div className="flags-scorebar">
        <span className="flags-score visitor" data-testid="flags-visitor-score">
          You {snapshot.visitorScore}
        </span>
        <span className="flags-turn" aria-live="polite">{statusLine}</span>
        <span className="flags-score emily" data-testid="flags-emily-score">
          sleepless_17 {snapshot.emilyScore}
        </span>
      </div>
      <div
        className={`flags-grid ${snapshot.turn === "emily" ? "locked" : ""}`}
        role="grid"
        aria-label="Minesweeper Flags board"
      >
        {snapshot.revealed.map((revealed, cell) => {
          const claimed = snapshot.claimed[cell];
          const number = snapshot.numbers[cell];
          const classes = [
            "flags-cell",
            claimed ? `claimed ${claimed}` : "",
            revealed && !claimed ? "revealed" : "",
            revealed && !claimed && number > 0 ? `n${number}` : "",
          ]
            .filter(Boolean)
            .join(" ");
          return (
            <button
              key={cell}
              className={classes}
              onClick={() => click(cell)}
              disabled={
                snapshot.status !== "playing" ||
                quit ||
                snapshot.turn !== "visitor" ||
                revealed ||
                Boolean(claimed)
              }
              data-cell={cell}
              aria-label={`Square ${cell}`}
            >
              {claimed ? "⚑" : revealed && number > 0 ? number : ""}
            </button>
          );
        })}
      </div>
      <div className="flags-footer">
        <span className="flags-bant" data-testid="flags-bant">
          {bant ? `sleepless_17: ${bant}` : "\u00a0"}
        </span>
        {snapshot.status === "playing" && !quit ? (
          <button className="flags-quit" onClick={() => finish("quit", snapshot)}>
            Quit game
          </button>
        ) : (
          <button
            className="flags-quit"
            onClick={() => closeWindow("msn-flags")}
          >
            Done
          </button>
        )}
      </div>
    </div>
  );
}
