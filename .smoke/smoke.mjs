import { chromium } from "playwright";

const URL = process.env.SMOKE_URL || "http://127.0.0.1:8731/index.html";
const mode = (process.argv[2] || "headless").toLowerCase();
const shots = "./shots/";
const REASONS = ["no-webgpu-api", "no-adapter", "error"];

function result(mode, pass, evidence) {
  console.log(JSON.stringify({ mode, pass, ...evidence }, null, 2));
  process.exit(pass ? 0 : 1);
}

async function gpuProbe(page) {
  return await page.evaluate(async () => {
    const hasGpu = typeof navigator !== "undefined" && !!navigator.gpu;
    let adapterInfo = null;
    let adapterError = null;
    if (hasGpu) {
      try {
        const a = await navigator.gpu.requestAdapter();
        adapterInfo = a ? { present: true } : { present: false };
      } catch (e) { adapterError = String(e); }
    }
    return { hasGpu, adapterInfo, adapterError };
  });
}

async function readBanner(page) {
  const b = await page.$("#webgpuBanner");
  if (!b) return { present: false };
  const visible = await b.isVisible();
  const hiddenAttr = await b.getAttribute("hidden");
  const computedDisplay = await b.evaluate((el) => getComputedStyle(el).display);
  const text = (await b.innerText()).replace(/\s+/g, " ").trim();
  const reasonEl = await b.$(".webgpu-banner-reason");
  const reasonText = reasonEl ? (await reasonEl.innerText()).replace(/\s+/g, " ").trim() : "";
  const m = reasonText.match(/(no-webgpu-api|no-adapter|error)/i)
    || text.match(/Detected:\s*`?([a-z-]+)`?/i)
    || text.match(/\b(no-webgpu-api|no-adapter|error)\b/i);
  return { present: true, visible, hiddenAttr, computedDisplay, text: text.slice(0, 260), reasonText, reason: m ? m[1].toLowerCase() : null };
}

async function loadButtonState(page) {
  return await page.$$eval("button", (btns) =>
    btns
      .filter((b) => /load/i.test(b.id || b.className || "") || /load/i.test(b.textContent || ""))
      .map((b) => ({ id: b.id || null, text: (b.textContent || "").trim().slice(0, 40), disabled: b.disabled }))
  );
}

async function runHeadless() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  // Banner is revealed by the on-load checkWebGPU() IIFE. Headless Chromium exposes
  // navigator.gpu but returns no adapter -> reason "no-adapter" -> banner shown.
  await page.waitForSelector("#webgpuBanner.show", { timeout: 15000 }).catch(() => {});
  const probe = await gpuProbe(page);
  const banner = await readBanner(page);
  await page.screenshot({ path: shots + "headless.png", fullPage: true }).catch(() => {});
  await browser.close();
  const pass = banner.present && banner.visible && REASONS.includes(banner.reason);
  result("headless", pass, { probe, banner, pageErrors: errors });
}

async function runRealBrowser() {
  // Real browser: system Chrome, headed, WebGPU forced on. Existing behavior =
  // WebGPU present, banner stays hidden, Load buttons enabled. No regression.
  const browser = await chromium.launch({
    channel: "chrome",
    headless: false,
    args: [
      "--enable-unsafe-webgpu",
      "--ignore-gpu-blocklist",
      "--enable-features=Vulkan,WebGPU",
      "--disable-blink-features=AutomationControlled",
    ],
  });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  await page.waitForTimeout(3000);
  const probe = await gpuProbe(page);
  const banner = await readBanner(page);
  const buttons = await loadButtonState(page);
  await page.screenshot({ path: shots + "real.png", fullPage: true }).catch(() => {});
  await browser.close();
  const unavailableBtn = buttons.some((b) => /webgpu unavailable/i.test(b.text));
  const loadEnabled = buttons.some((b) => /load model/i.test(b.text) && !b.disabled);
  // The static banner element always exists in the DOM but must remain HIDDEN
  // (not visible) when WebGPU is available. Regression = banner visible or load disabled.
  const pass = probe.hasGpu && probe.adapterInfo && probe.adapterInfo.present
    && !banner.visible && !unavailableBtn && loadEnabled;
  result("real", pass, { probe, banner, buttons, pageErrors: errors });
}

if (mode === "headless") runHeadless();
else if (mode === "real") runRealBrowser();
else { console.error("usage: node smoke.mjs headless|real"); process.exit(2); }
