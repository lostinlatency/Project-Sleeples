import { expect, test, type Page } from "@playwright/test";

type Route = "truth" | "impersonation" | "silence";
type Witness = "mike_sk8" | "sarahlou_x" | "tom_d";

async function seed(
  page: Page,
  route: Route = "truth",
  stage: "file_offer" | "final" = "file_offer",
) {
  await page.goto("/icon.svg");
  const response = await page.request.post("/api/testing/session", {
    data: { route, stage },
  });
  expect(response.ok()).toBe(true);
  const saved = await response.json();
  await page.evaluate(async (value) => {
    localStorage.clear();
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
  await expect(page.locator("main.desktop-host")).toHaveAttribute(
    "data-session-ready",
    "true",
  );
}

async function seedNode(page: Page, chapterTwoNode: string) {
  await page.goto("/icon.svg");
  const response = await page.request.post("/api/testing/session", {
    data: { chapterTwoNode },
  });
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
      { envelope: value.sessionEnvelope, publicView: value.publicView, messages: value.messages },
      "sleepless.recovered.v1",
    );
    await new Promise<void>((resolve, reject) => {
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, saved);
  await page.goto("/");
  await expect(page.locator("main.desktop-host")).toHaveAttribute("data-session-ready", "true");
}

async function openContact(page: Page, contactId: Witness | "sleepless_17") {
  await page.getByTestId("desktop-msn").dblclick();
  const contact =
    contactId === "sleepless_17"
      ? page.getByTestId("contact-sleepless")
      : page.getByTestId(`contact-${contactId}`);
  await expect(contact).toBeVisible();
  await contact.click();
  await expect(
    page.getByText(`You have started a conversation with ${contactId}.`),
  ).toBeVisible();
}

async function choose(page: Page, choiceId: string) {
  const choice = page.getByTestId(`choice-${choiceId}`);
  await expect(choice).toBeEnabled({ timeout: 20_000 });
  await choice.click();
}

const witnessChoices: Record<Witness, string[]> = {
  mike_sk8: ["m0-calm", "m1-tech", "m2-believe", "m3-accept"],
  sarahlou_x: ["sarah0-emily", "sarah1-why", "sarah2-trust", "sarah3-play"],
  tom_d: ["tom0-box", "tom1-drive", "tom2-keep", "tom3-watch"],
};
const postWebcamChoice: Record<Witness, string> = {
  mike_sk8: "m4-emily",
  sarahlou_x: "sarah4-future",
  tom_d: "tom4-father",
};

async function finishWitness(page: Page, contactId: Witness) {
  await openContact(page, contactId);
  for (const choiceId of witnessChoices[contactId])
    await choose(page, choiceId);
  await expect(page.getByTestId("accept-webcam")).toBeVisible({
    timeout: 20_000,
  });
  await page.getByTestId("accept-webcam").click();
  const clue = {
    mike_sk8: ".mock-cd",
    sarahlou_x: ".mock-chair",
    tom_d: ".mock-case",
  }[contactId];
  await expect(page.locator(clue)).toBeVisible();
  await choose(page, postWebcamChoice[contactId]);
  await expect(
    page.getByText(`${contactId} is now Offline`, { exact: true }),
  ).toBeVisible({ timeout: 30_000 });
}

test("the file offer survives reload and all three decisions start the investigation", async ({
  page,
}) => {
  for (const decision of ["Accept", "Decline", "Details"] as const) {
    await seed(page);
    await openContact(page, "sleepless_17");
    await expect(
      page.getByText("for_when_you_leave.scr (224 KB)"),
    ).toBeVisible();
    await page.reload();
    await openContact(page, "sleepless_17");
    await expect(
      page.getByText("for_when_you_leave.scr (224 KB)"),
    ).toBeVisible();
    await page.getByRole("button", { name: decision, exact: true }).click();
    await expect(page.getByTestId("msn-notification-mike_sk8")).toBeVisible({
      timeout: 8_000,
    });
  }
});

test("a complete mock journey supports Tom before Sarah and reaches quarantine", async ({
  page,
}) => {
  test.setTimeout(300_000);
  await seed(page, "truth");
  await openContact(page, "sleepless_17");
  await page.getByRole("button", { name: "Details", exact: true }).click();
  await finishWitness(page, "mike_sk8");
  await finishWitness(page, "tom_d");
  await expect(page.getByTestId("msn-notification-sleepless_17")).toHaveCount(
    0,
  );
  await finishWitness(page, "sarahlou_x");
  await openContact(page, "sleepless_17");
  await choose(page, "e0-help");
  await choose(page, "final-quarantine");
  await expect(page.getByText("System time restored to 2:23 AM.")).toBeVisible({
    timeout: 12_000,
  });
  await expect(page.getByText("This conversation has ended.")).toBeVisible();
});

test("a Reactor token failure falls back to text once without replaying the webcam", async ({
  page,
}) => {
  test.setTimeout(90_000);
  await seed(page);
  await page.route("**/api/reactor/token", (route) =>
    route.fulfill({ status: 503, contentType: "application/json", body: "{}" }),
  );
  await openContact(page, "sleepless_17");
  await page.getByRole("button", { name: "Accept", exact: true }).click();
  await openContact(page, "mike_sk8");
  for (const choiceId of witnessChoices.mike_sk8) await choose(page, choiceId);
  await expect(
    page.getByText("video cut out. the important part is still here"),
  ).toBeVisible({ timeout: 20_000 });
  await expect(page.getByTestId("webcam-panel")).toHaveCount(0);
  await expect(
    page.getByText("now it says emily_backup_2. i did not write that"),
  ).toHaveCount(1);
  await choose(page, "m4-own");
  await expect(
    page.getByText("mike_sk8 is now Offline", { exact: true }),
  ).toBeVisible({ timeout: 20_000 });
});

test("declining a Chapter Two webcam uses the written continuation exactly once", async ({ page }) => {
  test.setTimeout(90_000);
  await seedNode(page, "mike3");
  await openContact(page, "mike_sk8");
  await choose(page, "m3-accept");
  await expect(page.getByTestId("decline-webcam")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("decline-webcam").click();
  await expect(page.getByTestId("webcam-panel")).toHaveCount(0);
  await expect(page.getByText("fine. ill type what the camera would have shown")).toHaveCount(1);
  await expect(page.getByTestId("choice-m4-emily")).toBeEnabled({ timeout: 20_000 });
});

test("closing the mock video window does not stop or duplicate the story", async ({ page }) => {
  test.setTimeout(90_000);
  await seedNode(page, "mike3");
  await openContact(page, "mike_sk8");
  await choose(page, "m3-accept");
  await expect(page.getByTestId("accept-webcam")).toBeVisible({ timeout: 20_000 });
  await page.getByTestId("accept-webcam").click();
  const videoWindow = page.getByRole("region", { name: "Video Conversation — mike_sk8" });
  await expect(videoWindow).toBeVisible();
  await videoWindow.getByRole("button", { name: "Close" }).click();
  await expect(videoWindow).toHaveCount(0);
  await expect(page.getByTestId("choice-m4-emily")).toBeEnabled({ timeout: 30_000 });
  await expect(page.getByText("now it says emily_backup_2. i did not write that")).toHaveCount(1);
});

for (const [route, decision, ending] of [
  [
    "truth",
    "final-quarantine",
    "i know why. i just wish safe didnt feel like being left",
  ],
  ["impersonation", "final-release", "unknown_visitor is now Online"],
  ["silence", "final-erase", "New file created: brb.txt — you forgot one"],
] as const) {
  test(`the ${route} history renders and completes ${decision}`, async ({
    page,
  }) => {
    await seed(page, route, "final");
    await openContact(page, "sleepless_17");
    await choose(page, decision);
    await expect(page.getByText(ending)).toBeVisible({ timeout: 15_000 });
    await expect(page.getByText("This conversation has ended.")).toBeVisible();
  });
}
