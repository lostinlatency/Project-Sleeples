import { chromium } from "@playwright/test";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";

const baseURL = "http://127.0.0.1:3000";
const outputDir = path.resolve(".live-video-work");
await mkdir(outputDir, { recursive: true });

const browser = await chromium.launch({ headless: process.env.HEADFUL !== "1" });
const context = await browser.newContext({
  viewport: { width: 1280, height: 720 },
});
const page = await context.newPage();

await page.goto(`${baseURL}/icon.svg`);
const fixture = await page.request.post(`${baseURL}/api/testing/session`, {
  data: { chapterOneNode: "truth4" },
});
if (!fixture.ok()) throw new Error(`Fixture failed: ${fixture.status()}`);
const saved = await fixture.json();
await page.evaluate(async (value) => {
  localStorage.clear();
  const db = await new Promise((resolve, reject) => {
    const request = indexedDB.open("project-sleepless", 1);
    request.onupgradeneeded = () => request.result.createObjectStore("session");
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
  const tx = db.transaction("session", "readwrite");
  tx.objectStore("session").put(value, "sleepless.recovered.v1");
  await new Promise((resolve, reject) => {
    tx.oncomplete = resolve;
    tx.onerror = () => reject(tx.error);
  });
  db.close();
}, {
  envelope: saved.sessionEnvelope,
  publicView: saved.publicView,
  messages: saved.messages,
});

await page.goto(baseURL);
await page.getByTestId("desktop-msn").dblclick();
await page.getByTestId("contact-sleepless").click();
await page.getByTestId("choice-t4-accept").click();
await page.getByTestId("accept-webcam").waitFor({ timeout: 180_000 });
await page.getByTestId("accept-webcam").click();

const video = page.getByTestId("webcam-panel").locator("video");
await video.waitFor({ timeout: 120_000 });
await page.waitForFunction(() => {
  const element = document.querySelector("[data-testid='webcam-panel'] video");
  return element instanceof HTMLVideoElement && element.readyState >= 2 && element.currentTime > 0.5;
}, null, { timeout: 120_000 });
await page.waitForFunction(() => {
  const element = document.querySelector("[data-testid='webcam-panel'] video");
  if (!(element instanceof HTMLVideoElement) || element.videoWidth === 0) return false;
  const canvas = document.createElement("canvas");
  canvas.width = 32;
  canvas.height = 18;
  const context = canvas.getContext("2d", { willReadFrequently: true });
  if (!context) return false;
  context.drawImage(element, 0, 0, 32, 18);
  const pixels = context.getImageData(0, 0, 32, 18).data;
  let peak = 0;
  let total = 0;
  for (let i = 0; i < pixels.length; i += 4) {
    const luminance = pixels[i] * 0.2126 + pixels[i + 1] * 0.7152 + pixels[i + 2] * 0.0722;
    peak = Math.max(peak, luminance);
    total += luminance;
  }
  return peak > 20 && total / (pixels.length / 4) > 2;
}, null, { timeout: 180_000, polling: 500 });

const base64 = await page.evaluate(async () => {
  const element = document.querySelector("[data-testid='webcam-panel'] video");
  if (!(element instanceof HTMLVideoElement) || !(element.srcObject instanceof MediaStream))
    throw new Error("Live MediaStream unavailable");
  const canvas = document.createElement("canvas");
  canvas.width = 640;
  canvas.height = 360;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Canvas unavailable");
  let drawing = true;
  const draw = () => {
    if (!drawing) return;
    context.drawImage(element, 0, 0, canvas.width, canvas.height);
    requestAnimationFrame(draw);
  };
  draw();
  const canvasStream = canvas.captureStream(24);
  const chunks = [];
  const recorder = new MediaRecorder(canvasStream, {
    mimeType: "video/webm;codecs=vp8",
    videoBitsPerSecond: 2_500_000,
  });
  recorder.ondataavailable = (event) => {
    if (event.data.size) chunks.push(event.data);
  };
  const done = new Promise((resolve) => {
    recorder.onstop = resolve;
  });
  recorder.start(250);
  await new Promise((resolve) => setTimeout(resolve, 12_000));
  drawing = false;
  recorder.stop();
  await done;
  const blob = new Blob(chunks, { type: "video/webm" });
  const bytes = new Uint8Array(await blob.arrayBuffer());
  let binary = "";
  for (let offset = 0; offset < bytes.length; offset += 0x8000)
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 0x8000));
  return btoa(binary);
});

const destination = path.join(outputDir, "emily-live-stream.webm");
await writeFile(destination, Buffer.from(base64, "base64"));
await context.close();
await browser.close();

console.log(destination);
