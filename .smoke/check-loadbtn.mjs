import { chromium } from "playwright";

const URL = process.env.SMOKE_URL || "http://127.0.0.1:8731/index.html";
const EXPECTED_TOOLTIP =
  "WebGPU is unavailable in this browser, so the on-device model cannot load. See the banner above for how to enable WebGPU.";

function result(pass, evidence) {
  console.log(JSON.stringify({ check: "load-btn-disabled-tooltip", pass, ...evidence }, null, 2));
  process.exit(pass ? 0 : 1);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  await page.waitForSelector("#webgpuBanner.show", { timeout: 15000 }).catch(() => {});
  const btns = await page.$$eval("button", (arr) =>
    arr
      .filter((b) => b.id === "loadBtn" || b.id === "headLoadBtn")
      .map((b) => ({ id: b.id, text: (b.textContent || "").trim(), disabled: b.disabled, ariaDisabled: b.getAttribute("aria-disabled"), title: b.title }))
  );
  await browser.close();
  const loadBtn = btns.find((b) => b.id === "loadBtn");
  const headLoadBtn = btns.find((b) => b.id === "headLoadBtn");
  const pass = !!loadBtn && !!headLoadBtn
    && loadBtn.disabled && headLoadBtn.disabled
    && loadBtn.title === EXPECTED_TOOLTIP && headLoadBtn.title === EXPECTED_TOOLTIP;
  result(pass, { loadBtn, headLoadBtn, expectedTooltip: EXPECTED_TOOLTIP, pageErrors: errors });
}

main();
