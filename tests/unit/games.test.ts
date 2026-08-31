import { describe, expect, it } from "vitest";
import { createInitialState } from "@/lib/director/initial-state";
import { reduceNarrative } from "@/lib/director/reducer";
import {
  applyEmilyMove,
  buildBoard,
  clickCell,
  createFlagsGame,
  FLAGS_CELLS,
  FLAGS_MINES,
  FLAGS_TARGET,
  type FlagsSnapshot,
} from "@/lib/games/flags";
import {
  scoreTypingAttempt,
  typingTestReaction,
} from "@/lib/games/stylometry-test";
import { epilogueLines } from "@/content/server/story";
import { CHAPTER_TWO_REACTIONS } from "@/content/server/chapter-two";
import { StateSchema } from "@/lib/director/types";

function open() {
  return reduceNarrative(createInitialState("games-test"), {
    type: "MSN_OPENED",
  }).nextState;
}
function chapterTwoFixture() {
  const initial = createInitialState("games-c2");
  return StateSchema.parse({
    ...initial,
    chapter: 2,
    story: { ...initial.story, route: "truth" as const, choices: [] },
    chapterTwo: {
      ...initial.chapterTwo,
      chapterOneOutcome: "truth" as const,
      stage: "interviews" as const,
      exposureStage: 1,
    },
  });
}

describe("flags engine", () => {
  it("builds a deterministic board with exactly 51 mines and correct numbers", () => {
    const a = buildBoard("session-a:0");
    const b = buildBoard("session-a:0");
    expect(a.mines.filter(Boolean)).toHaveLength(FLAGS_MINES);
    expect(a.mines).toEqual(b.mines);
    expect(a.numbers).toEqual(b.numbers);
    const c = buildBoard("session-b:0");
    expect(a.mines).not.toEqual(c.mines);
    for (let i = 0; i < FLAGS_CELLS; i++) {
      if (a.mines[i]) continue;
      let count = 0;
      const row = Math.floor(i / 16);
      const col = i % 16;
      for (let dr = -1; dr <= 1; dr++)
        for (let dc = -1; dc <= 1; dc++) {
          const r = row + dr;
          const c = col + dc;
          if (r >= 0 && r < 16 && c >= 0 && c < 16 && a.mines[r * 16 + c])
            count++;
        }
      expect(a.numbers[i], `cell ${i}`).toBe(count);
    }
  });
  it("claims a mine for the clicker and flips the turn", () => {
    const game = createFlagsGame("turn-test:0");
    const mineCell = game.mines.indexOf(true);
    const safeCell = game.mines.indexOf(false);
    expect(clickCell(game, safeCell, "emily")).toBe(game);
    const afterMine = clickCell(game, mineCell, "visitor");
    expect(afterMine.visitorScore).toBe(1);
    expect(afterMine.claimed[mineCell]).toBe("visitor");
    expect(afterMine.turn).toBe("emily");
    const afterSafe = clickCell(afterMine, safeCell, "visitor");
    expect(afterSafe).toBe(afterMine);
  });
  it("flood-reveals zeroes and ends the game at 26 mines", () => {
    const game = createFlagsGame("flood-test:0");
    const zeroCell = game.numbers.indexOf(0);
    const revealed = clickCell(game, zeroCell, "visitor");
    expect(revealed.revealed[zeroCell]).toBe(true);
    expect(revealed.revealed.filter(Boolean).length).toBeGreaterThan(1);
    let state: FlagsSnapshot = { ...game, visitorScore: FLAGS_TARGET - 1 };
    const mineCell = state.mines.findIndex((m, i) => !state.claimed[i] && m);
    state = clickCell(state, mineCell, "visitor");
    expect(state.status).toBe("visitor_won");
  });
  it("emily plays legal moves and finishes a full game within the mine budget", () => {
    let game = createFlagsGame("full-game:0");
    expect(game.emilyForm).toBeGreaterThanOrEqual(0.72);
    expect(game.emilyForm).toBeLessThanOrEqual(0.9);
    let guard = 400;
    while (game.status === "playing" && guard-- > 0) {
      if (game.turn === "visitor") {
        const cell = game.revealed.findIndex(
          (_, i) => !game.revealed[i] && !game.claimed[i],
        );
        game = clickCell(game, cell === -1 ? 0 : cell, "visitor");
      } else {
        const before = game.emilyScore;
        game = applyEmilyMove(game);
        if (game.status === "playing")
          expect(game.claimed.filter((c) => c === "emily").length).toBeGreaterThanOrEqual(before);
      }
      expect(
        game.visitorScore + game.emilyScore,
      ).toBeLessThanOrEqual(FLAGS_MINES);
    }
    expect(game.status).not.toBe("playing");
    expect(
      game.visitorScore === FLAGS_TARGET || game.emilyScore === FLAGS_TARGET,
    ).toBe(true);
  });
});

describe("typing like daniel", () => {
  it("passes daniel-voiced fragments and fails outsider tells", () => {
    const good = scoreTypingAttempt("haha yeah :P u still awake sleepy");
    expect(good.score).toBeGreaterThanOrEqual(6);
    expect(good.tells).toHaveLength(0);
    const bad = scoreTypingAttempt("Lol dude. I am totally Daniel.");
    expect(bad.tells).toContain("lol");
    expect(bad.tells).toContain("bro/dude");
    expect(bad.tells).toContain("full stop");
    expect(bad.tells).toContain("capitals");
    expect(bad.score).toBeLessThanOrEqual(-5);
  });
  it("maps scores to in-character reactions", () => {
    expect(typingTestReaction(9)).toContain("that was him");
    expect(typingTestReaction(-9)).toContain("dont do his voice");
  });
});

describe("game story wiring", () => {
  it("offers flags after the photo request and records a loss as in-character", () => {
    let state = open();
    state = reduceNarrative(state, { type: "STORY_CHOICE", choiceId: "s0-warm" }).nextState;
    state = reduceNarrative(state, { type: "STORY_CHOICE", choiceId: "s1-time" }).nextState;
    const toS3 = reduceNarrative(state, { type: "STORY_CHOICE", choiceId: "s2-open" });
    state = toS3.nextState;
    expect(toS3.authoredMessages.some((m) => m.text.includes("flags"))).toBe(true);
    expect(state.flagsGame.status).toBe("offered");
    const accepted = reduceNarrative(state, { type: "GAME_INVITE_ACCEPTED" });
    expect(accepted.nextState.flagsGame.status).toBe("playing");
    const result = reduceNarrative(accepted.nextState, {
      type: "GAME_RESULT",
      outcome: "lost",
      visitorMines: 12,
      emilyMines: 26,
      turns: 38,
    });
    expect(result.nextState.flagsGame.outcome).toBe("visitor_lost");
    expect(result.nextState.beliefs.trust).toBeGreaterThan(state.beliefs.trust);
    expect(
      result.authoredMessages.some((m) => m.text.includes("he always choked")),
    ).toBe(true);
    expect(result.nextState.unlockedFiles).toContain("flags_record");
  });
  it("treats beating emily as an identity tell on the undecided route", () => {
    let state = open();
    state = reduceNarrative(state, { type: "GAME_INVITE_REQUESTED" }).nextState;
    const won = reduceNarrative(state, {
      type: "GAME_RESULT",
      outcome: "won",
      visitorMines: 26,
      emilyMines: 9,
      turns: 35,
    });
    expect(won.nextState.flagsGame.outcome).toBe("visitor_won");
    expect(won.nextState.beliefs.userIsDaniel).toBeLessThanOrEqual(0.12);
    expect(
      won.authoredMessages.some((m) =>
        m.text.includes("daniel never beat me. not once in three years."),
      ),
    ).toBe(true);
    expect(won.nextState.notices).toContain("flags-tell");
  });
  it("adds a flags tell to the lie epilogue after a win", () => {
    const initial = open();
    const withWin = {
      ...initial,
      flagsGame: {
        ...initial.flagsGame,
        status: "done" as const,
        outcome: "visitor_won" as const,
      },
    };
    const lines = epilogueLines("lie5", withWin);
    expect(lines.some((line) => line.includes("u won at flags"))).toBe(true);
    expect(epilogueLines("lie5", initial)).toHaveLength(2);
  });
  it("scores a typed attempt, answers in character, and records skips", () => {
    const offered = {
      ...open(),
      typingTest: { status: "offered" as const, score: 0 },
    };
    const submitted = reduceNarrative(offered, {
      type: "TYPING_TEST_SUBMITTED",
      text: "Lol dude. I am Daniel.",
    });
    expect(submitted.nextState.typingTest.status).toBe("submitted");
    expect(submitted.nextState.typingTest.score).toBeLessThan(0);
    expect(
      submitted.authoredMessages.some(
        (m) =>
          m.text.startsWith("Daniel says:") && m.text.includes("Lol dude."),
      ),
    ).toBe(true);
    expect(
      submitted.authoredMessages.some((m) =>
        m.text.includes("dont do his voice"),
      ),
    ).toBe(true);
    const skipped = reduceNarrative(offered, { type: "TYPING_TEST_SKIPPED" });
    expect(skipped.nextState.typingTest.status).toBe("skipped");
    expect(skipped.authoredMessages.at(-1)?.text).toBe("figures");
  });
  it("keeps emily's pinball warning to one appearance and counts views", () => {
    const state = open();
    const first = reduceNarrative(state, { type: "PINBALL_OPENED" });
    expect(first.nextState.pinball.views).toBe(1);
    expect(
      first.authoredMessages.some((m) => m.text.includes("dont look at the dates")),
    ).toBe(true);
    const second = reduceNarrative(first.nextState, { type: "PINBALL_OPENED" });
    expect(second.nextState.pinball.views).toBe(2);
    expect(
      second.authoredMessages.some((m) => m.text.includes("dont look at the dates")),
    ).toBe(false);
  });
});

describe("witness mid-conversation reactions", () => {
  function mikeThread() {
    const state = chapterTwoFixture();
    return reduceNarrative(state, {
      type: "CONTACT_OPENED",
      contactId: "mike_sk8",
    }).nextState;
  }
  it("reacts to evidence in the active witness's own voice, once", () => {
    const opened = mikeThread();
    const first = reduceNarrative(opened, {
      type: "FILE_OPENED",
      fileId: "brb_readme",
    });
    expect(
      first.authoredMessages.some((m) => m.text.includes("read the readme")),
    ).toBe(true);
    expect(first.nextState.notices).toContain("wfile-mike_sk8-brb_readme");
    const again = reduceNarrative(first.nextState, {
      type: "FILE_OPENED",
      fileId: "brb_readme",
    });
    expect(
      again.authoredMessages.some((m) => m.text.includes("read the readme")),
    ).toBe(false);
  });
  it("does not react after the witness has gone offline", () => {
    const opened = mikeThread();
    const done = { ...opened };
    done.chapterTwo = {
      ...done.chapterTwo,
      contactThreads: {
        ...done.chapterTwo.contactThreads,
        mike_sk8: { ...done.chapterTwo.contactThreads.mike_sk8, completed: true },
      },
    };
    const result = reduceNarrative(done, {
      type: "FILE_OPENED",
      fileId: "brb_readme",
    });
    expect(
      result.authoredMessages.some((m) => m.text.includes("read the readme")),
    ).toBe(false);
  });
  it("rewards and burns trust at the thresholds in profile voice", () => {
    const opened = mikeThread();
    const calm = reduceNarrative(opened, {
      type: "CONTACT_CHOICE",
      choiceId: "m0-calm",
    });
    expect(calm.nextState.chapterTwo.contactTrust.mike_sk8).toBe(1);
    const tech = reduceNarrative(calm.nextState, {
      type: "CONTACT_CHOICE",
      choiceId: "m1-tech",
    });
    expect(tech.nextState.chapterTwo.contactTrust.mike_sk8).toBe(2);
    expect(
      tech.authoredMessages[1]?.text,
    ).toBe(CHAPTER_TWO_REACTIONS["m1-tech"]);
    expect(
      tech.authoredMessages.some((m) => m.text.includes("uncensored version")),
    ).toBe(true);
    const cold = reduceNarrative(opened, {
      type: "CONTACT_CHOICE",
      choiceId: "m0-accuse",
    }).nextState;
    const colder = reduceNarrative(cold, {
      type: "CONTACT_CHOICE",
      choiceId: "m1-purpose",
    });
    expect(colder.nextState.chapterTwo.contactTrust.mike_sk8).toBe(-2);
    expect(
      colder.authoredMessages.some((m) => m.text.includes("figure the rest out")),
    ).toBe(true);
  });
  it("keeps emily silent for witness evidence reactions", () => {
    const state = chapterTwoFixture();
    const result = reduceNarrative(state, {
      type: "FILE_OPENED",
      fileId: "sarah_log",
    });
    expect(result.authoredMessages).toHaveLength(0);
  });
});
