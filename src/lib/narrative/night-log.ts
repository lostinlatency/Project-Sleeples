export interface NightLogEntry {
  route: string;
  decision: string;
  flags: string;
  at: string;
}

const KEY = "sleepless.nightlog.v1";
const MAX_ENTRIES = 24;

export function loadNightLog(): NightLogEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter(
      (item): item is NightLogEntry =>
        typeof item === "object" &&
        item !== null &&
        typeof (item as NightLogEntry).route === "string" &&
        typeof (item as NightLogEntry).at === "string",
    );
  } catch {
    return [];
  }
}

export function recordNightLogEntry(entry: NightLogEntry): void {
  if (typeof window === "undefined") return;
  try {
    const existing = loadNightLog();
    const key = `${entry.route}:${entry.decision}:${entry.flags}`;
    const deduped = existing.filter(
      (item) => `${item.route}:${item.decision}:${item.flags}` !== key,
    );
    const next = [entry, ...deduped].slice(0, MAX_ENTRIES);
    window.localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    // A full or blocked storage must never break the story.
  }
}

export function clearNightLog(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(KEY);
  } catch {
    // ignore
  }
}

const ROUTE_LABELS: Record<string, string> = {
  truth: "told Emily the truth",
  impersonation: "pretended to be Daniel",
  silence: "never said who you were",
};

const DECISION_LABELS: Record<string, string> = {
  quarantine: "quarantined the archive",
  release: "released the archive",
  erase: "erased everything",
};

const FLAGS_LABELS: Record<string, string> = {
  visitor_won: "beat Emily at flags",
  visitor_lost: "lost at flags",
  visitor_quit: "quit at flags",
  pending: "",
};

export function formatNightLogEntry(entry: NightLogEntry): string {
  const parts = [
    ROUTE_LABELS[entry.route] ?? entry.route,
    DECISION_LABELS[entry.decision] ?? entry.decision,
    FLAGS_LABELS[entry.flags] ?? "",
  ].filter(Boolean);
  const date = new Date(entry.at);
  const stamp = Number.isNaN(date.getTime())
    ? ""
    : ` · ${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
  return `${parts.join(", ")}${stamp}`;
}
