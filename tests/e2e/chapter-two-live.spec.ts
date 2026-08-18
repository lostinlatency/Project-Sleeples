import { expect, test } from "@playwright/test";

test("Mike's Reactor/LTX performance streams and completes in the story", async ({
  page,
}) => {
  const consoleErrors: string[] = [];
  const tokenStatuses: number[] = [];
  page.on("console", (message) => {
    if (message.type() === "error") consoleErrors.push(message.text());
  });
  page.on("response", (response) => {
    if (response.url().includes("/api/reactor/token"))
      tokenStatuses.push(response.status());
  });

  await page.goto("/icon.svg");
  const fixture = await page.request.post("/api/testing/session", {
    data: { route: "truth", stage: "file_offer" },
  });
  expect(fixture.ok()).toBe(true);
  const saved = await fixture.json();
  await page.evaluate(async (value) => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("project-sleepless", 1);
      request.onupgradeneeded = () =>
        request.result.createObjectStore("session");
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
  await page.getByTestId("desktop-msn").dblclick();
  await page.getByTestId("contact-sleepless").click();
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await page.getByTestId("contact-mike_sk8").click();
  for (const choice of ["m0-calm", "m1-tech", "m2-believe", "m3-accept"]) {
    const button = page.getByTestId(`choice-${choice}`);
    await expect(button).toBeEnabled({ timeout: 30_000 });
    await button.click();
  }

  await expect(page.getByTestId("accept-webcam")).toBeVisible({
    timeout: 30_000,
  });
  await page.getByTestId("accept-webcam").click();
  const video = page.getByTestId("webcam-panel").locator("video");
  await expect(video).toBeVisible({ timeout: 120_000 });
  await expect
    .poll(
      () => video.evaluate((element) => (element as HTMLVideoElement).readyState),
      {
      timeout: 120_000,
      },
    )
    .toBeGreaterThanOrEqual(2);
  await expect
    .poll(
      () => video.evaluate((element) => (element as HTMLVideoElement).currentTime),
      {
      timeout: 60_000,
      },
    )
    .toBeGreaterThan(0);
  const postWebcamChoice = page.getByTestId("choice-m4-emily");
  await expect(postWebcamChoice).toBeEnabled({ timeout: 120_000 });
  await postWebcamChoice.click();
  await expect(
    page.getByText("mike_sk8 is now Offline", { exact: true }),
  ).toBeVisible({ timeout: 120_000 });

  expect(tokenStatuses).toEqual([200]);
  expect(
    consoleErrors.filter(
      (entry) =>
        entry.includes("WebRTCTransport") ||
        entry.includes("Uncaught") ||
        entry.includes("AbortError"),
    ),
  ).toEqual([]);
});
