import { chromium } from "@playwright/test";
import { mkdir, rename } from "node:fs/promises";
import path from "node:path";

const baseURL = process.env.TRAILER_BASE_URL ?? "http://127.0.0.1:3000";
const outputDir = path.resolve(".trailer-work");
const requestedShot = process.env.TRAILER_SHOT ?? "all";
await mkdir(outputDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function installCursor(page) {
  await page.addStyleTag({ content: `
    #trailer-cursor{position:fixed;z-index:2147483647;left:620px;top:380px;width:20px;height:27px;pointer-events:none;transition:left .48s cubic-bezier(.22,.8,.28,1),top .48s cubic-bezier(.22,.8,.28,1),transform .12s ease;filter:drop-shadow(0 1px 1px rgba(0,0,0,.42))}
    #trailer-cursor svg{display:block;width:100%;height:100%}
    #trailer-cursor.clicking{transform:scale(.84)}
  ` });
  await page.evaluate(() => {
    const cursor = document.createElement("div");
    cursor.id = "trailer-cursor";
    cursor.innerHTML = `<svg viewBox="0 0 24 32" aria-hidden="true"><path d="M2.2 1.6v25.1l6.5-6.2 4.2 9.8 4.1-1.8-4.1-9.5h8.8z" fill="#111" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg>`;
    document.body.append(cursor);
  });
}

async function point(page, locator, pause = 500) {
  const box = await locator.boundingBox();
  if (!box) throw new Error("Target has no bounding box");
  await page.evaluate(({ x, y }) => {
    const cursor = document.querySelector("#trailer-cursor");
    cursor.style.left = `${x}px`;
    cursor.style.top = `${y}px`;
  }, { x: box.x + box.width / 2, y: box.y + box.height / 2 });
  await sleep(pause);
}

async function click(page, locator, { double = false, hold = 650 } = {}) {
  await point(page, locator);
  await page.evaluate(() => document.querySelector("#trailer-cursor")?.classList.add("clicking"));
  if (double) await locator.dblclick();
  else await locator.click();
  await sleep(120);
  await page.evaluate(() => document.querySelector("#trailer-cursor")?.classList.remove("clicking"));
  await sleep(hold);
}

async function reset(page) {
  await page.goto(baseURL);
  await page.evaluate(async () => {
    localStorage.clear();
    const db = await new Promise((resolve, reject) => {
      const request = indexedDB.open("project-sleepless", 1);
      request.onupgradeneeded = () => request.result.createObjectStore("session");
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
    const tx = db.transaction("session", "readwrite");
    tx.objectStore("session").clear();
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  });
  await page.reload();
  await page.locator('main.desktop-host[data-session-ready="true"]').waitFor();
  await installCursor(page);
}

async function seedFinal(page) {
  await page.goto(`${baseURL}/icon.svg`);
  const response = await page.request.post(`${baseURL}/api/testing/session`, {
    data: { route: "truth", stage: "final" },
  });
  if (!response.ok()) throw new Error(`Final-state seed failed: ${response.status()}`);
  const saved = await response.json();
  await page.evaluate(async (value) => {
    localStorage.clear();
    const db = await new Promise((resolve, reject) => {
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
    await new Promise((resolve, reject) => {
      tx.oncomplete = resolve;
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  }, saved);
  await page.goto(baseURL);
  await page.locator('main.desktop-host[data-session-ready="true"]').waitFor();
  await installCursor(page);
}

async function record(name, action) {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
    recordVideo: { dir: outputDir, size: { width: 1280, height: 720 } },
    reducedMotion: "no-preference",
  });
  const page = await context.newPage();
  await action(page);
  const video = page.video();
  await context.close();
  const source = await video.path();
  await rename(source, path.join(outputDir, `${name}.webm`));
  await browser.close();
}

if (requestedShot === "all" || requestedShot === "hook") await record("01-hook", async (page) => {
  await reset(page);
  await sleep(1800);
  await click(page, page.getByTestId("desktop-msn"), { double: true, hold: 900 });
  await click(page, page.getByTestId("contact-sleepless"), { hold: 400 });
  await page.getByTestId("transcript").getByText("daniel?").waitFor({ timeout: 8000 });
  await sleep(2600);
});

if (requestedShot === "all" || requestedShot === "discovery") await record("02-discovery", async (page) => {
  await reset(page);
  await sleep(900);
  await click(page, page.getByTestId("desktop-documents"), { double: true });
  await click(page, page.getByTestId("file-music"), { double: true });
  await click(page, page.getByTestId("file-playlist_2005"), { double: true, hold: 800 });
  const missing = page.getByRole("button", { name: /for when you leave/i });
  await click(page, missing, { hold: 2200 });
  await click(page, page.getByTestId("desktop-personal"), { double: true });
  await click(page, page.getByTestId("file-moving_note"), { double: true, hold: 2300 });
  await click(page, page.getByTestId("desktop-recycle"), { double: true, hold: 1400 });
  await click(page, page.getByTestId("restore-artifact"), { hold: 1300 });
  await click(page, page.getByTestId("desktop-personal"), { double: true });
  await click(page, page.getByTestId("file-emily_goodbye"), { double: true, hold: 1000 });
  await click(page, page.getByRole("button", { name: "Play" }), { hold: 7500 });
  await page.locator(".recovered-caption").waitFor({ timeout: 8000 });
  await sleep(3200);
});

if (requestedShot === "all" || requestedShot === "choice") await record("03-choice", async (page) => {
  await seedFinal(page);
  await sleep(1200);
  await click(page, page.getByTestId("desktop-msn"), { double: true, hold: 800 });
  await click(page, page.getByTestId("contact-sleepless"), { hold: 1100 });
  await sleep(1800);
  if (await page.getByTestId("choice-final-quarantine").count() === 0) {
    await page.screenshot({ path: path.join(outputDir, "choice-debug.png") });
    console.log(await page.locator("body").innerText());
  }
  await page.getByTestId("choice-final-quarantine").waitFor({ timeout: 8000 });
  await point(page, page.getByTestId("choice-final-quarantine"), 900);
  await point(page, page.getByTestId("choice-final-release"), 900);
  await point(page, page.getByTestId("choice-final-erase"), 900);
  await sleep(2200);
});

if (requestedShot === "walkthrough") await record("04-walkthrough", async (page) => {
  await reset(page);
  await sleep(900);

  const openingNotification = page.getByTestId("msn-notification-sleepless_17");
  await openingNotification.waitFor({ timeout: 8000 });
  await sleep(1300);
  await click(page, openingNotification.locator(".notification-body"), { hold: 1200 });
  await page.getByTestId("choice-s0-honest").waitFor({ timeout: 8000 });
  await sleep(2200);

  await click(page, page.getByTestId("choice-s0-honest"), { hold: 600 });
  await page.getByTestId("choice-s1-time").waitFor({ timeout: 15000 });
  await sleep(3200);
  await click(page, page.locator(".xp-window.active button[aria-label='Minimize']"), { hold: 900 });

  await click(page, page.getByTestId("desktop-documents"), { double: true, hold: 650 });
  await click(page, page.getByTestId("file-music"), { double: true, hold: 650 });
  await click(page, page.getByTestId("file-playlist_2005"), { double: true, hold: 1100 });
  await click(page, page.getByRole("button", { name: /for when you leave/i }), { hold: 2600 });

  await click(page, page.getByTestId("desktop-personal"), { double: true, hold: 700 });
  await click(page, page.getByTestId("file-moving_note"), { double: true, hold: 3300 });
  await click(page, page.locator(".xp-window.active button[aria-label='Minimize']"), { hold: 700 });

  await click(page, page.getByTestId("desktop-recycle"), { double: true, hold: 1700 });
  await click(page, page.getByTestId("restore-artifact"), { hold: 1000 });
  const restoreNotification = page.getByTestId("msn-notification-sleepless_17");
  await restoreNotification.waitFor({ timeout: 8000 });
  await sleep(1300);
  await click(page, restoreNotification.locator(".notification-body"), { hold: 3000 });
  await click(page, page.locator(".xp-window.active button[aria-label='Minimize']"), { hold: 700 });

  await click(page, page.getByTestId("desktop-personal"), { double: true, hold: 650 });
  await click(page, page.getByTestId("file-emily_goodbye"), { double: true, hold: 900 });
  await click(page, page.getByRole("button", { name: "Play" }), { hold: 12500 });
  await page.getByRole("button", { name: "Send to Emily" }).waitFor({ timeout: 5000 });
  await sleep(1800);
  await click(page, page.getByRole("button", { name: "Send to Emily" }), { hold: 1700 });

  const resultNotification = page.getByTestId("msn-notification-sleepless_17");
  await resultNotification.waitFor({ timeout: 8000 });
  await sleep(900);
  await click(page, resultNotification.locator(".notification-body"), { hold: 3500 });
});

console.log(outputDir);
