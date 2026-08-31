import { expect, test, type Page } from "@playwright/test";
import {
  STORY,
  transitionReaction,
  type StoryChoice,
  type StoryNode,
} from "../../src/content/server/story";
import {
  CHAPTER_TWO_REACTIONS,
  CHAPTER_TWO_STORY,
  type ChapterTwoChoice,
  type ChapterTwoNode,
} from "../../src/content/server/chapter-two";

test.skip(({ browserName }) => browserName !== "chromium", "The exhaustive choice matrix runs once in Chromium; cross-browser journeys run separately.");

async function installFixture(
  page: Page,
  data: { chapterOneNode: string } | { chapterTwoNode: string },
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
    tx.objectStore("session").put(value, "sleepless.recovered.v1");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, {
    envelope: saved.sessionEnvelope,
    publicView: saved.publicView,
    messages: saved.messages,
  });
  await page.goto("/");
  await expect(page.locator("main.desktop-host")).toHaveAttribute(
    "data-session-ready",
    "true",
  );
}

async function openChapterOne(page: Page) {
  await page.getByTestId("desktop-msn").dblclick();
  await page.getByTestId("contact-sleepless").click();
}

async function openChapterTwo(page: Page, node: ChapterTwoNode) {
  await page.getByTestId("desktop-msn").dblclick();
  const contact =
    node.contactId === "sleepless_17"
      ? page.getByTestId("contact-sleepless")
      : page.getByTestId(`contact-${node.contactId}`);
  await contact.click();
}

function chapterOneExpectation(
  page: Page,
  node: StoryNode,
  choice: StoryChoice,
) {
  if (choice.ending)
    return expect(
      page.getByText("for_when_you_leave.scr (224 KB)"),
    ).toBeVisible({ timeout: 15_000 });
  if (node.preparesWebcam)
    return expect(page.getByTestId("accept-webcam")).toBeVisible({
      timeout: 20_000,
    });
  return expect(page.getByText(STORY[choice.next!].lines[0], { exact: true })).toBeVisible({
    timeout: 15_000,
  });
}

for (const node of Object.values(STORY)) {
  for (const choice of node.choices) {
    test(`Chapter One ${node.id} executes ${choice.id}`, async ({ page }) => {
      await installFixture(page, { chapterOneNode: node.id });
      await openChapterOne(page);
      const button = page.getByTestId(`choice-${choice.id}`);
      await expect(button).toBeEnabled();
      await button.click();
      if (!choice.ending)
        await expect(
          page.getByText(transitionReaction(choice.id)!, { exact: true }),
        ).toBeVisible({ timeout: 15_000 });
      await chapterOneExpectation(page, node, choice);
    });
  }
}

function chapterTwoExpectation(
  page: Page,
  node: ChapterTwoNode,
  choice: ChapterTwoChoice,
) {
  if (choice.id.startsWith("final-"))
    return expect(page.getByText("This conversation has ended.")).toBeVisible({
      timeout: 15_000,
    });
  if (node.preparesWebcam)
    return expect(page.getByTestId("accept-webcam")).toBeVisible({
      timeout: 20_000,
    });
  if (node.completesContact)
    return expect(
      page.getByText(`${node.contactId} is now Offline`, { exact: true }),
    ).toBeVisible({ timeout: 15_000 });
  return expect(
    page.getByText(CHAPTER_TWO_STORY[choice.next!].lines[0], { exact: true }),
  ).toBeVisible({ timeout: 15_000 });
}

for (const node of Object.values(CHAPTER_TWO_STORY)) {
  for (const choice of node.choices) {
    test(`Chapter Two ${node.id} executes ${choice.id}`, async ({ page }) => {
      await installFixture(page, { chapterTwoNode: node.id });
      await openChapterTwo(page, node);
      const button = page.getByTestId(`choice-${choice.id}`);
      await expect(button).toBeEnabled();
      await button.click();
      if (!choice.id.startsWith("final-"))
        await expect(
          page
            .getByTestId("transcript")
            .getByText(CHAPTER_TWO_REACTIONS[choice.id], { exact: true }),
        ).toBeVisible({ timeout: 15_000 });
      await chapterTwoExpectation(page, node, choice);
    });
  }
}
