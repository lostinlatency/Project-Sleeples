import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

// Client code must never import authored server content. This is the
// regression guard that keeps twist lines and endings out of the browser
// bundle (the ConversationWindow/VideoConversation leak).
const CLIENT_DIRS = [
  path.resolve(import.meta.dirname, "../../src/components"),
  path.resolve(import.meta.dirname, "../../src/stores"),
];
const SERVER_CONTENT_PATTERN = /@\/content\/server|\.\.\/content\/server/;

function walk(dir: string): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(dir)) {
    const full = path.join(dir, entry);
    if (statSync(full).isDirectory()) found.push(...walk(full));
    else if (/\.(ts|tsx)$/.test(entry)) found.push(full);
  }
  return found;
}

describe("content boundary", () => {
  it("keeps authored server content out of client components and stores", () => {
    const violations: string[] = [];
    for (const dir of CLIENT_DIRS) {
      for (const file of walk(dir)) {
        const source = readFileSync(file, "utf8");
        if (SERVER_CONTENT_PATTERN.test(source)) violations.push(file);
      }
    }
    expect(violations, violations.join("\n")).toEqual([]);
  });

  it("keeps the client-safe contact display out of the server script", () => {
    const source = readFileSync(
      path.resolve(import.meta.dirname, "../../src/content/server/chapter-two.ts"),
      "utf8",
    );
    expect(source).not.toMatch(/export const CONTACT_DISPLAY/);
  });
});
