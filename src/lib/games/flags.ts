export const FLAGS_SIZE = 16;
export const FLAGS_CELLS = FLAGS_SIZE * FLAGS_SIZE;
export const FLAGS_MINES = 51;
export const FLAGS_TARGET = 26;

export type FlagsSide = "visitor" | "emily";
export type FlagsStatus = "playing" | "visitor_won" | "emily_won";

export interface FlagsSnapshot {
  seedKey: string;
  mines: boolean[];
  numbers: number[];
  revealed: boolean[];
  claimed: (FlagsSide | null)[];
  visitorScore: number;
  emilyScore: number;
  turn: FlagsSide;
  status: FlagsStatus;
  emilyForm: number;
}

export function hashSeed(key: string): number {
  let hash = 2166136261;
  for (let i = 0; i < key.length; i++) {
    hash ^= key.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

export function mulberry32(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const NEIGHBORS: number[][] = (() => {
  const table: number[][] = [];
  for (let i = 0; i < FLAGS_CELLS; i++) {
    const row = Math.floor(i / FLAGS_SIZE);
    const col = i % FLAGS_SIZE;
    const list: number[] = [];
    for (let dr = -1; dr <= 1; dr++)
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const r = row + dr;
        const c = col + dc;
        if (r >= 0 && r < FLAGS_SIZE && c >= 0 && c < FLAGS_SIZE)
          list.push(r * FLAGS_SIZE + c);
      }
    table.push(list);
  }
  return table;
})();

export function neighborsOf(cell: number): number[] {
  return NEIGHBORS[cell];
}

export function buildBoard(seedKey: string): {
  mines: boolean[];
  numbers: number[];
} {
  const rng = mulberry32(hashSeed(`board:${seedKey}`));
  const mines = new Array<boolean>(FLAGS_CELLS).fill(false);
  let placed = 0;
  while (placed < FLAGS_MINES) {
    const cell = Math.floor(rng() * FLAGS_CELLS);
    if (!mines[cell]) {
      mines[cell] = true;
      placed++;
    }
  }
  const numbers = mines.map((isMine, cell) =>
    isMine
      ? -1
      : NEIGHBORS[cell].reduce((total, n) => total + (mines[n] ? 1 : 0), 0),
  );
  return { mines, numbers };
}

export function createFlagsGame(seedKey: string): FlagsSnapshot {
  const { mines, numbers } = buildBoard(seedKey);
  const rng = mulberry32(hashSeed(`form:${seedKey}`));
  return {
    seedKey,
    mines,
    numbers,
    revealed: new Array<boolean>(FLAGS_CELLS).fill(false),
    claimed: new Array<FlagsSide | null>(FLAGS_CELLS).fill(null),
    visitorScore: 0,
    emilyScore: 0,
    turn: "visitor",
    status: "playing",
    emilyForm: 0.72 + rng() * 0.18,
  };
}

function checkWin(snapshot: FlagsSnapshot): FlagsSnapshot {
  if (snapshot.visitorScore >= FLAGS_TARGET)
    return { ...snapshot, status: "visitor_won" };
  if (snapshot.emilyScore >= FLAGS_TARGET)
    return { ...snapshot, status: "emily_won" };
  return snapshot;
}

export function clickCell(
  snapshot: FlagsSnapshot,
  cell: number,
  side: FlagsSide,
): FlagsSnapshot {
  if (
    snapshot.status !== "playing" ||
    snapshot.turn !== side ||
    cell < 0 ||
    cell >= FLAGS_CELLS ||
    snapshot.revealed[cell] ||
    snapshot.claimed[cell]
  )
    return snapshot;
  if (snapshot.mines[cell]) {
    const claimed = [...snapshot.claimed];
    claimed[cell] = side;
    const next: FlagsSnapshot = {
      ...snapshot,
      claimed,
      visitorScore:
        snapshot.visitorScore + (side === "visitor" ? 1 : 0),
      emilyScore: snapshot.emilyScore + (side === "emily" ? 1 : 0),
      turn: side === "visitor" ? "emily" : "visitor",
    };
    return checkWin(next);
  }
  const revealed = [...snapshot.revealed];
  const queue = [cell];
  while (queue.length) {
    const current = queue.pop()!;
    if (revealed[current] || snapshot.claimed[current]) continue;
    revealed[current] = true;
    if (snapshot.numbers[current] === 0)
      for (const n of NEIGHBORS[current]) if (!revealed[n]) queue.push(n);
  }
  return { ...snapshot, revealed, turn: side === "visitor" ? "emily" : "visitor" };
}

export function applyEmilyMove(snapshot: FlagsSnapshot): FlagsSnapshot {
  if (snapshot.status !== "playing" || snapshot.turn !== "emily")
    return snapshot;
  const cell = emilyChooseCell(snapshot);
  return clickCell(snapshot, cell, "emily");
}

function hiddenUnclaimed(snapshot: FlagsSnapshot): number[] {
  const cells: number[] = [];
  for (let i = 0; i < FLAGS_CELLS; i++)
    if (!snapshot.revealed[i] && !snapshot.claimed[i]) cells.push(i);
  return cells;
}

function estimateProbabilities(snapshot: FlagsSnapshot): number[] {
  const hidden = hiddenUnclaimed(snapshot);
  const probability = new Array<number>(FLAGS_CELLS).fill(0);
  const onFrontier = new Array<boolean>(FLAGS_CELLS).fill(false);
  const claimedCount = (cells: number[], side?: FlagsSide) =>
    cells.filter(
      (c) =>
        snapshot.claimed[c] && (side ? snapshot.claimed[c] === side : true),
    ).length;
  for (const cell of hidden)
    for (const n of NEIGHBORS[cell])
      if (snapshot.revealed[n] && snapshot.numbers[n] > 0)
        onFrontier[cell] = true;
  const remainingMines =
    FLAGS_MINES - snapshot.visitorScore - snapshot.emilyScore;
  const hiddenCount = hidden.length;
  const base = hiddenCount > 0 ? remainingMines / hiddenCount : 0;
  for (const cell of hidden) {
    if (!onFrontier[cell]) {
      probability[cell] = base;
      continue;
    }
    let best = 0;
    for (const n of NEIGHBORS[cell]) {
      if (!snapshot.revealed[n] || snapshot.numbers[n] <= 0) continue;
      const neighbors = NEIGHBORS[n];
      const unknown = neighbors.filter(
        (c) => !snapshot.revealed[c] && !snapshot.claimed[c],
      ).length;
      const needed =
        snapshot.numbers[n] - claimedCount(neighbors) - neighbors.filter((c) => snapshot.revealed[c] && snapshot.mines[c]).length;
      if (unknown <= 0) continue;
      const p = Math.min(1, Math.max(0, needed / unknown));
      if (p > best) best = p;
    }
    probability[cell] = Math.max(best, base * 0.4);
  }
  return probability;
}

export function emilyChooseCell(snapshot: FlagsSnapshot): number {
  const rng = mulberry32(
    hashSeed(
      `move:${snapshot.seedKey}:${snapshot.visitorScore}:${snapshot.emilyScore}:${snapshot.turn}`,
    ),
  );
  const hidden = hiddenUnclaimed(snapshot);
  if (!hidden.length) return 0;
  if (!snapshot.revealed.some(Boolean))
    return hidden[Math.floor(hidden.length / 2)];
  const probability = estimateProbabilities(snapshot);
  const ranked = [...hidden].sort((a, b) => probability[b] - probability[a]);
  const nearWin =
    FLAGS_TARGET - snapshot.emilyScore <= 2 ||
    FLAGS_TARGET - snapshot.visitorScore <= 2;
  if (nearWin) return ranked[0];
  const noise = 1 - snapshot.emilyForm;
  if (rng() < noise * 0.6)
    return ranked[Math.floor(rng() * Math.min(6, ranked.length))];
  return ranked[0];
}
