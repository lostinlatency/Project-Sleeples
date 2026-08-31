import { expect, test, type Page } from "@playwright/test";
import { buildBoard } from "../../src/lib/games/flags";

async function installFixture(
  page: Page,
  data: Record<string, unknown>,
) {
  await page.goto("/icon.svg");
  const response = await page.request.post("/api/testing/session", { data });
  expect(response.ok()).toBe(true);
  const saved = await response.json();
  await page.evaluate(async (value) => {
    localStorage.clear();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("project-sleepless", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("session");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("session", "readwrite");
    tx.objectStore("session").put(
      {
        envelope: value.sessionEnvelope,
        publicView: value.publicView,
        messages: value.messages,
      },
      "sleepless.recovered.v1",
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, saved);
  await page.goto("/");
  await expect(page.locator("main.desktop-host")).toHaveAttribute(
    "data-session-ready",
    "true",
  );
  return saved as { sessionId: string };
}

async function openChat(page: Page) {
  await page.getByTestId("desktop-msn").dblclick();
  await page.getByTestId("contact-sleepless").click();
}

test("a player who beats Emily at flags is no longer Daniel", async ({
  page,
}) => {
  test.setTimeout(300_000);
  const { sessionId } = await installFixture(page, {
    chapterOneNode: "s0",
    flagsPlaying: true,
  });
  await openChat(page);
  await page.getByTestId("invite-game").click();
  const game = page.getByTestId("flags-game");
  await expect(game).toBeVisible();
  const { mines } = buildBoard(`${sessionId}:0`);
  const mineCells = mines
    .map((isMine, cell) => ({ isMine, cell }))
    .filter(({ isMine }) => isMine)
    .map(({ cell }) => cell);
  const score = async () => {
    const text = await page.getByTestId("flags-visitor-score").textContent();
    return parseInt(text?.replace(/\D/g, "") ?? "0", 10);
  };
  // Emily claims some of our targets first (class "claimed emily") — sweep
  // the remaining mines in passes until the visitor reaches 26.
  for (let pass = 0; pass < 6 && (await score()) < 26; pass++) {
    for (const cell of mineCells) {
      if ((await score()) >= 26) break;
      await expect(game.getByText("Your move")).toBeVisible({
        timeout: 20_000,
      });
      const button = game.locator(`[data-cell="${cell}"]`);
      const cls = await button.getAttribute("class").catch(() => "");
      if (cls?.includes("claimed")) continue;
      if (!(await button.isEnabled().catch(() => false))) continue;
      await button.click();
      await page.waitForTimeout(400);
    }
  }
  await expect(page.getByTestId("flags-visitor-score")).toHaveText("You 26", {
    timeout: 15_000,
  });
  await expect(
    page
      .getByTestId("transcript")
      .getByText("daniel never beat me. not once in three years."),
  ).toBeVisible({ timeout: 20_000 });
  await page.getByRole("button", { name: "Done" }).click();
  await expect(game).toHaveCount(0);
  await page.getByTestId("desktop-documents").dblclick();
  const documents = page.getByRole("region", { name: "My Documents" });
  await documents
    .getByRole("button", { name: "Daniel", exact: true })
    .dblclick();
  const daniel = page.getByRole("region", { name: "Daniel", exact: true });
  await expect(
    daniel.getByRole("button", { name: "flags_record.dat" }),
  ).toBeVisible({ timeout: 10_000 });
  await daniel.getByRole("button", { name: "flags_record.dat" }).dblclick();
  await expect(
    page.getByText(/this entry was not written by daniel/),
  ).toBeVisible({ timeout: 10_000 });
});

test("the typing test scores a daniel-voiced fragment", async ({ page }) => {
  test.setTimeout(90_000);
  await installFixture(page, {
    chapterOneNode: "lie1",
    typingOffered: true,
  });
  await openChat(page);
  const box = page.getByLabel("Type like Daniel");
  await expect(box).toBeVisible({ timeout: 10_000 });
  await box.fill("haha yeah :P u still awake sleepy");
  await page.getByTestId("submit-typing").click();
  await expect(
    page.getByText("ok. that was him. thats exactly how he types"),
  ).toBeVisible({ timeout: 15_000 });
});

test("the typing test catches an outsider voice", async ({ page }) => {
  test.setTimeout(90_000);
  await installFixture(page, {
    chapterOneNode: "lie1",
    typingOffered: true,
  });
  await openChat(page);
  const box = page.getByLabel("Type like Daniel");
  await expect(box).toBeVisible({ timeout: 10_000 });
  await box.fill("Lol dude. It is me, Daniel.");
  await page.getByTestId("submit-typing").click();
  await expect(
    page.getByText("stop. dont do his voice again"),
  ).toBeVisible({ timeout: 15_000 });
});

test("the pinball table drifts between visits", async ({ page }) => {
  test.setTimeout(90_000);
  await installFixture(page, { chapterOneNode: "s0" });
  await page.getByRole("button", { name: "Open Start menu" }).click();
  await page.getByRole("menuitem", { name: /Games/ }).click();
  const table = page.getByTestId("pinball-table");
  await expect(table).toBeVisible();
  await expect(table).toHaveCount(1);
  await page.getByRole("button", { name: "Close", exact: true }).click();
  await expect(table).toHaveCount(0);
  await page.getByRole("button", { name: "Open Start menu" }).click();
  await page.getByRole("menuitem", { name: /Games/ }).click();
  await expect(page.getByTestId("pinball-table")).toBeVisible();
  await expect(
    page.getByText("A new entry appeared"),
  ).toBeVisible();
});
