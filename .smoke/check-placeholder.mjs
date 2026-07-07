import { chromium } from "playwright";

const URL = process.env.SMOKE_URL || "http://127.0.0.1:8731/index.html";
const EXPECTED_PLACEHOLDER =
  "WebGPU is not available in this browser. ThoxWebby requires a WebGPU-enabled browser (Chrome 113+, Edge 113+, Safari 18+).";

function result(pass, evidence) {
  console.log(JSON.stringify({ check: "placeholder-actionable", pass, ...evidence }, null, 2));
  process.exit(pass ? 0 : 1);
}

async function main() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors = [];
  page.on("pageerror", (e) => errors.push(String(e)));
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  await page.waitForSelector("#webgpuBanner.show", { timeout: 15000 }).catch(() => {});
  // The composer input whose placeholder is swapped in the unavailable path.
  const input = await page.$("#input, textarea#input, textarea");
  const placeholder = input ? await input.getAttribute("placeholder") : null;
  const disabled = input ? await input.isDisabled() : null;
  await page.screenshot({ path: "./shots/placeholder-headless.png", fullPage: true }).catch(() => {});
  await browser.close();
  const pass = placeholder === EXPECTED_PLACEHOLDER;
  result(pass, { placeholder, expected: EXPECTED_PLACEHOLDER, inputDisabled: disabled, pageErrors: errors });
}

main();
