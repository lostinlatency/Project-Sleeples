import { expect, test, type Page } from "@playwright/test";

type LiveCase = {
  name: string;
  fixture: { chapterOneNode: string } | { chapterTwoNode: string };
  contactId: "sleepless_17" | "mike_sk8" | "sarahlou_x" | "tom_d";
  triggerChoice: string;
  completionChoice: string;
};

const cases: LiveCase[] = [
  { name: "Emily truth performance", fixture: { chapterOneNode: "truth4" }, contactId: "sleepless_17", triggerChoice: "t4-accept", completionChoice: "t5-release" },
  { name: "Emily impersonation performance", fixture: { chapterOneNode: "lie4" }, contactId: "sleepless_17", triggerChoice: "l4-delay", completionChoice: "l5-confess" },
  { name: "Emily silence performance", fixture: { chapterOneNode: "silence4" }, contactId: "sleepless_17", triggerChoice: "a4-accept", completionChoice: "a5-goodbye" },
  { name: "Mike performance", fixture: { chapterTwoNode: "mike3" }, contactId: "mike_sk8", triggerChoice: "m3-accept", completionChoice: "m4-emily" },
  { name: "Sarah performance", fixture: { chapterTwoNode: "sarah3" }, contactId: "sarahlou_x", triggerChoice: "sarah3-play", completionChoice: "sarah4-future" },
  { name: "Tom performance", fixture: { chapterTwoNode: "tom3" }, contactId: "tom_d", triggerChoice: "tom3-watch", completionChoice: "tom4-father" },
];

async function installFixture(page: Page, data: LiveCase["fixture"]) {
  await page.goto("/icon.svg");
  const fixture = await page.request.post("/api/testing/session", { data });
  expect(fixture.ok()).toBe(true);
  const saved = await fixture.json();
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
}

async function openContact(page: Page, contactId: LiveCase["contactId"]) {
  await page.getByTestId("desktop-msn").dblclick();
  const contact = contactId === "sleepless_17"
    ? page.getByTestId("contact-sleepless")
    : page.getByTestId(`contact-${contactId}`);
  await contact.click();
}

for (const liveCase of cases) {
  test(`${liveCase.name} streams, speaks, and completes exactly once`, async ({ page }) => {
    test.setTimeout(360_000);
    const consoleErrors: string[] = [];
    const tokenStatuses: number[] = [];
    page.on("console", (message) => {
      if (message.type() === "error") consoleErrors.push(message.text());
    });
    page.on("response", (response) => {
      if (response.url().includes("/api/reactor/token")) tokenStatuses.push(response.status());
    });

    await installFixture(page, liveCase.fixture);
    await openContact(page, liveCase.contactId);
    await page.getByTestId(`choice-${liveCase.triggerChoice}`).click();
    await expect(page.getByTestId("accept-webcam")).toBeVisible({ timeout: 180_000 });
    await page.getByTestId("accept-webcam").click();

    const video = page.getByTestId("webcam-panel").locator("video");
    await expect(video).toBeVisible({ timeout: 120_000 });
    await expect.poll(
      () => video.evaluate((element) => (element as HTMLVideoElement).readyState),
      { timeout: 120_000 },
    ).toBeGreaterThanOrEqual(2);
    await expect.poll(
      () => video.evaluate((element) => (element as HTMLVideoElement).currentTime),
      { timeout: 60_000 },
    ).toBeGreaterThan(0);
    await expect.poll(
      () => video.evaluate((element) => {
        const stream = (element as HTMLVideoElement).srcObject as MediaStream | null;
        return stream?.getAudioTracks().filter((track) => track.readyState === "live").length ?? 0;
      }),
      { timeout: 60_000 },
    ).toBeGreaterThan(0);

    const completion = page.getByTestId(`choice-${liveCase.completionChoice}`);
    await expect(completion).toBeEnabled({ timeout: 180_000 });
    await completion.click();
    await expect(page.getByTestId("webcam-panel")).toHaveCount(0);

    expect(tokenStatuses).toEqual([200]);
    expect(consoleErrors.filter((entry) =>
      entry.includes("WebRTCTransport") ||
      entry.includes("Uncaught") ||
      entry.includes("AbortError"),
    )).toEqual([]);
  });
}
