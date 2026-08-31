import { test, expect, type Page } from "@playwright/test";

async function reset(page: Page) {
  await page.goto("/");
  await page.evaluate(async () => {
    localStorage.clear();
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("project-sleepless", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("session");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("session", "readwrite");
    tx.objectStore("session").clear();
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator("main.desktop-host")).toHaveAttribute(
    "data-session-ready",
    "true",
  );
  await expect(page.getByTestId("desktop-msn")).toBeVisible();
}
async function openMsn(page: Page) {
  await page.getByTestId("desktop-msn").dblclick();
  await expect(page.getByTestId("contact-sleepless")).toBeVisible();
  await page.getByTestId("contact-sleepless").click();
  await expect(page.getByText("daniel?")).toBeVisible({ timeout: 8000 });
}
async function choose(page: Page, id: string) {
  const button = page.getByTestId(`choice-${id}`);
  await expect(button).toBeEnabled({ timeout: 30000 });
  await button.click();
}
async function shared(page: Page, branch: "truth" | "lie" | "silence") {
  await choose(page, "s0-guarded");
  await choose(page, "s1-time");
  await choose(page, "s2-open");
  await choose(page, "s3-question");
  await choose(page, "s4-probe");
  await choose(page, `s5-${branch}`);
}
async function reachWebcam(
  page: Page,
  route: "truth" | "lie" | "silence",
  lieWebcamChoice: "l4-accept" | "l4-delay" | "l4-refuse" = "l4-accept",
) {
  if (route === "truth") {
    await choose(page, "t0-year");
    await choose(page, "t1-direct");
    await choose(page, "t2-defend");
    await choose(page, "t3-stay");
    await choose(page, "t4-accept");
  }
  if (route === "lie") {
    await choose(page, "l0-guess");
    await choose(page, "l1-adapt");
    await choose(page, "l2-love");
    await choose(page, "l3-apology");
    await choose(page, lieWebcamChoice);
  }
  if (route === "silence") {
    await choose(page, "a0-stay");
    await choose(page, "a1-comfort");
    await choose(page, "a2-uncertain");
    await choose(page, "a3-boundary");
    await choose(page, "a4-accept");
  }
  await expect(page.getByTestId("accept-webcam")).toBeVisible({
    timeout: 12000,
  });
}

test("desktop evidence exploration unlocks authored dialogue choices", async ({
  page,
}) => {
  test.setTimeout(60_000);
  await reset(page);
  await openMsn(page);
  await choose(page, "s0-honest");
  await choose(page, "s1-time");
  await choose(page, "s2-open");
  await expect(page.getByTestId("choice-s3-photo")).toBeDisabled();
  await page.getByTestId("desktop-documents").dblclick();
  await page.getByTestId("file-photos").dblclick();
  await page.getByTestId("file-holiday_photo").dblclick();
  await expect(page.getByAltText("Recovered photograph")).toBeVisible({
    timeout: 12000,
  });
  const msnTask = page
    .locator(".task-buttons button")
    .filter({ hasText: "sleepless_17" });
  await msnTask.click();
  await expect(page.getByTestId("choice-s3-photo")).toBeEnabled();
});

test("BRB links Winamp, the changed note, Recycle Bin, and the recovered memory", async ({ page }) => {
  test.setTimeout(75_000);
  await reset(page);
  await page.getByTestId("desktop-documents").dblclick();
  await page.getByTestId("file-music").dblclick();
  await page.getByTestId("file-playlist_2005").dblclick();
  await page.getByRole("button", { name: /for when you leave/i }).click();
  await expect(page.getByText("BUFFER SOURCE: UNKNOWN")).toBeVisible();

  await page.getByTestId("desktop-personal").dblclick();
  await page.getByTestId("file-moving_note").dblclick();
  await expect(page.getByRole("textbox", { name: "Notepad text" })).toHaveValue(/everything you couldn't delete in the bin/);

  await page.getByTestId("desktop-recycle").dblclick();
  await expect(page.getByTestId("file-emily_goodbye")).toBeVisible();
  await page.getByTestId("restore-artifact").click();

  await page.getByTestId("desktop-personal").dblclick();
  await page.getByTestId("file-emily_goodbye").dblclick();
  await page.getByRole("button", { name: "Play" }).click();
  await expect(page.locator(".recovered-caption")).toHaveText("daniel?", { timeout: 18_000 });
  await expect(page.getByRole("button", { name: "Send to Emily" })).toBeVisible();
  await page.getByRole("button", { name: "Send to Emily" }).click();
  await expect(page.getByRole("button", { name: "Send to Emily" })).toHaveCount(0);
});

test("contact groups collapse and the authored conversation restores after reload", async ({
  page,
}) => {
  await reset(page);
  await page.getByTestId("desktop-msn").dblclick();
  const online = page.getByRole("button", { name: "Online (1)" });
  await online.click();
  await expect(page.getByTestId("contact-sleepless")).toHaveCount(0);
  await online.click();
  await page.getByTestId("contact-sleepless").click();
  await choose(page, "s0-warm");
  await expect(page.getByText("where have u been?")).toBeVisible({
    timeout: 10_000,
  });
  await page.reload();
  await expect(page.locator("main.desktop-host")).toHaveAttribute(
    "data-session-ready",
    "true",
  );
  await page.getByTestId("desktop-msn").dblclick();
  await page.getByTestId("contact-sleepless").click();
  await expect(page.getByText("where have u been?")).toBeVisible();
  await expect(page.getByTestId("choice-s1-promise")).toBeVisible();
});

test("truth route completes its farewell after the webcam performance", async ({
  page,
}) => {
  test.setTimeout(150000);
  await reset(page);
  await openMsn(page);
  await shared(page, "truth");
  await expect(page.getByText("thats not funny")).toBeVisible({ timeout: 15000 });
  await reachWebcam(page, "truth");
  await page.getByTestId("accept-webcam").click();
  await expect(page.getByTestId("webcam-panel")).toBeVisible();
  const videoWindow = page.getByRole("region", {
    name: "Video Conversation — sleepless_17",
  });
  await expect(videoWindow).toBeVisible();
  const videoBox = await videoWindow.boundingBox();
  const chatBox = await page
    .getByRole("region", { name: "sleepless_17 - Conversation" })
    .boundingBox();
  expect(videoBox!.width).toBeGreaterThan(chatBox!.width);
  await expect(
    page.locator(".task-buttons button").filter({ hasText: "Video Conversation" }),
  ).toBeVisible();
  await expect(page.getByTestId("choice-t5-release")).toBeVisible({
    timeout: 15000,
  });
  await expect(videoWindow).toHaveCount(0);
  await choose(page, "t5-release");
  await expect(
    page.getByText("tell him i waited. but dont tell him im still waiting"),
  ).toBeVisible();
  await expect(page.getByText("sleepless_17 is now Offline")).toBeVisible();
});

test("impersonation reveal matches the camera-broken lie", async ({
  page,
}) => {
  test.setTimeout(150000);
  await reset(page);
  await openMsn(page);
  await shared(page, "lie");
  await reachWebcam(page, "lie", "l4-delay");
  await page.getByTestId("accept-webcam").click();
  await expect(page.getByTestId("choice-l5-confess")).toBeVisible({
    timeout: 15000,
  });
  await expect(page.getByText("daniels webcam wasnt broken")).toBeVisible();
  await expect(page.getByText(/never called me sleepy/)).toHaveCount(0);
  await choose(page, "l5-confess");
  await expect(page.getByText("dont pretend to be him again")).toBeVisible();
});

test("silence route lets the player remain present or leave", async ({
  page,
}) => {
  test.setTimeout(150000);
  await reset(page);
  await openMsn(page);
  await shared(page, "silence");
  await reachWebcam(page, "silence");
  await page.getByTestId("accept-webcam").click();
  await expect(page.getByTestId("choice-a5-goodbye")).toBeVisible({
    timeout: 15000,
  });
  await choose(page, "a5-goodbye");
  await expect(page.getByText("goodbye daniel. whoever u are")).toBeVisible();
});

test("declining the route-specific webcam ends without pretending video played", async ({
  page,
}) => {
  test.setTimeout(120000);
  await reset(page);
  await openMsn(page);
  await shared(page, "truth");
  await reachWebcam(page, "truth");
  await page.getByTestId("decline-webcam").click();
  await expect(page.getByTestId("webcam-panel")).toHaveCount(0);
  await expect(
    page.getByText("i understand. tell him i stopped waiting"),
  ).toBeVisible();
  await expect(page.getByText("sleepless_17 is now Offline")).toBeVisible();
});

test("tampered recovered state offers the safe recovery action", async ({
  page,
}) => {
  await reset(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const r = indexedDB.open("project-sleepless", 1);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
    const tx = db.transaction("session", "readwrite");
    const store = tx.objectStore("session");
    const saved = await new Promise<Record<string, unknown>>(
      (resolve, reject) => {
        const r = store.get("sleepless.recovered.v1");
        r.onsuccess = () => resolve(r.result);
        r.onerror = () => reject(r.error);
      },
    );
    store.put(
      { ...saved, envelope: "tampered-envelope-that-cannot-be-decrypted" },
      "sleepless.recovered.v1",
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await page.getByTestId("desktop-msn").dblclick();
  await expect(
    page.getByRole("dialog").getByText("Recovered Session"),
  ).toBeVisible({ timeout: 15000 });
  await page
    .getByRole("dialog")
    .getByRole("button", { name: "Reset recovered computer" })
    .click();
  await expect(page.getByTestId("desktop-msn")).toBeVisible();
});

test("legacy recovered views migrate to a fresh choice-based session", async ({
  page,
}) => {
  await reset(page);
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("project-sleepless", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("session", "readwrite");
    const store = tx.objectStore("session");
    const saved = await new Promise<Record<string, unknown>>((resolve, reject) => {
      const request = store.get("sleepless.recovered.v1");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    store.put(
      {
        ...saved,
        publicView: { phase: "normal", completed: false, online: true },
      },
      "sleepless.recovered.v1",
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await expect(page.locator("main.desktop-host")).toHaveAttribute(
    "data-session-ready",
    "true",
  );
  await openMsn(page);
  await expect(page.getByTestId("choice-s0-warm")).toBeVisible();
  await expect(page.getByText("Windows could not recover the desktop session.")).toHaveCount(0);
});

test("five idle prompts temporarily sign out without losing story progress", async ({
  page,
}) => {
  await reset(page);
  await openMsn(page);
  await choose(page, "s0-guarded");
  // Wait for the authored turn and its IndexedDB persistence to finish before
  // reading the saved envelope directly. WebKit can otherwise observe the
  // previous s0 snapshot even though the click has already returned.
  await expect(page.getByTestId("choice-s1-promise")).toBeVisible();
  await page.evaluate(async () => {
    const db = await new Promise<IDBDatabase>((resolve, reject) => {
      const request = indexedDB.open("project-sleepless", 1);
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const read = async () => {
      const tx = db.transaction("session", "readonly");
      return await new Promise<Record<string, unknown>>((resolve, reject) => {
        const request = tx.objectStore("session").get("sleepless.recovered.v1");
        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
      });
    };
    let saved = await read();
    for (let i = 0; i < 5; i++) {
      const response = await fetch("/api/turn", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionEnvelope: saved.envelope,
          idempotencyKey: crypto.randomUUID(),
          event: { type: "IDLE_NUDGE_DUE" },
        }),
      });
      const data = await response.json();
      saved = {
        envelope: data.sessionEnvelope,
        publicView: data.publicView,
        messages: [...(saved.messages as unknown[]), ...data.messages],
      };
    }
    const tx = db.transaction("session", "readwrite");
    tx.objectStore("session").put(saved, "sleepless.recovered.v1");
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await page.getByTestId("desktop-msn").dblclick();
  await expect(page.getByRole("button", { name: "Online (0)" })).toBeVisible();
  await page.getByTestId("contact-sleepless").click();
  await expect(page.getByText("ur back")).toBeVisible({ timeout: 8000 });
  await expect(page.getByTestId("choice-s1-promise")).toBeVisible();
});

test("idle pressure only runs in the active chat and offline replies stay blocked", async ({
  page,
}) => {
  test.setTimeout(60000);
  await page.clock.install();
  await reset(page);
  await openMsn(page);
  await choose(page, "s0-guarded");
  await page.getByTestId("desktop-documents").dblclick();
  await page.clock.fastForward(6 * 90_000);
  await expect(page.getByText("u still there?")).toHaveCount(0);
  const chatTask = page
    .locator(".task-buttons button")
    .filter({ hasText: "sleepless_17" });
  await chatTask.click();
  await expect(chatTask).toHaveClass(/active/);
  const idleLines = [
    "u still there?",
    "did u leave the computer again",
    "just pick something. anything",
    "im not waiting all night again",
    "fine. message me if u come back",
  ];
  for (const line of idleLines) {
    const response = page.waitForResponse(
      (item) => item.url().endsWith("/api/turn") && item.request().method() === "POST",
    );
    await page.clock.fastForward(90_000);
    await response;
    await page.clock.fastForward(4_000);
    await expect(page.getByText(line)).toBeVisible();
  }
  await expect(page.getByText("sleepless_17 is now Offline")).toBeVisible();
  await expect(page.getByTestId("choice-s1-promise")).toBeDisabled();
  await page.getByTestId("choice-s1-promise").click({ force: true });
  await expect(page.getByTestId("choice-s1-promise")).toBeVisible();
  await chatTask.click();
  await chatTask.click();
  await expect(page.getByText("ur back")).toBeVisible();
  await expect(page.getByTestId("choice-s1-promise")).toBeEnabled();
});

test("Nudge is audiovisual only and never inserts dialogue", async ({ page }) => {
  await reset(page);
  await openMsn(page);
  const before = await page.locator("[data-testid=transcript] .line").count();
  await page.getByRole("button", { name: "Nudge" }).click();
  await expect(page.locator(".msn-conversation")).toHaveClass(/nudge-shake/);
  await page.waitForTimeout(500);
  await expect(page.locator("[data-testid=transcript] .line")).toHaveCount(before);
});

test("opening the contact immediately does not depend on the delayed greeting", async ({
  page,
}) => {
  await page.clock.install();
  await reset(page);
  await page.getByTestId("desktop-msn").dblclick();
  await page.getByTestId("contact-sleepless").click();
  await page.clock.fastForward(4_000);
  await expect(page.getByText("daniel?")).toBeVisible();
  await expect(page.getByTestId("choice-s0-warm")).toBeVisible();
});

test("a rapid reply double-click advances exactly one story node", async ({ page }) => {
  await reset(page);
  await openMsn(page);
  const reply = page.getByTestId("choice-s0-guarded");
  await expect(reply).toBeEnabled();
  await reply.dblclick();
  await expect(page.getByTestId("choice-s1-promise")).toBeVisible({ timeout: 10000 });
  await expect(page.getByText("who is this?")).toHaveCount(1);
  await expect(page.getByText("The following message could not be delivered.")).toHaveCount(0);
});

test("desktop chrome, editor, view, audio, and power controls all perform their advertised action", async ({ page }) => {
  await reset(page);
  await page.getByTestId("desktop-documents").dblclick();
  const documents = page.getByRole("region", { name: "My Documents" });
  await documents.getByRole("button", { name: "Change view" }).click();
  await expect(documents.getByTestId("file-grid")).toHaveClass(/details/);
  await documents.getByRole("button", { name: "Maximize" }).click();
  const restore = documents.getByRole("button", { name: "Restore" });
  await expect(restore).toBeVisible();
  await restore.click();
  await documents.getByRole("button", { name: "Minimize" }).click();
  await expect(documents).toHaveCount(0);
  await page.locator(".task-buttons button").filter({ hasText: "My Documents" }).click();
  await expect(documents).toBeVisible();
  await documents.getByRole("button", { name: "Close" }).click();
  await expect(documents).toHaveCount(0);

  await page.getByTestId("desktop-notepad").dblclick();
  const editor = page.getByRole("textbox", { name: "Notepad text" });
  await editor.fill("recovered note");
  await expect(editor).toHaveValue("recovered note");

  await page.getByRole("button", { name: "Open volume control" }).click();
  const volume = page.getByRole("slider", { name: "Volume" });
  await volume.fill("25");
  await expect(volume).toHaveValue("25");
  await page.getByLabel("Mute").check();
  await expect(page.getByLabel("Mute")).toBeChecked();

  await page.getByRole("button", { name: "Open Start menu" }).click();
  await page.getByRole("button", { name: "Turn Off Computer" }).click();
  await expect(page.getByText("It is now safe to turn off your computer.")).toBeVisible();
  await page.getByRole("button", { name: "Turn on" }).click();
  await expect(page.getByText("It is now safe to turn off your computer.")).toHaveCount(0);
});
