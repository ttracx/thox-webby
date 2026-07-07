// ThoxWebby WebGPU-banner smoke test.
// Checked-in regression guard for the graceful WebGPU-unavailable banner.
//
// Two passes against a locally served copy of the static site:
//   A) headless, real (absent) adapter  -> banner MUST toggle ON  (#webgpuBanner[hidden] === false)
//   B) stubbed working adapter          -> banner MUST toggle OFF (#webgpuBanner[hidden] === true)
//                                           and the existing load flow must be reachable (no regression).
//
// Run locally:  npm test
// Run in CI:    .github/workflows/webgpu-banner-smoke.yml
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { chromium } from "playwright";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");
const PORT = Number(process.env.PORT) || 8139;
const URL = `http://127.0.0.1:${PORT}/`;

const MIME = {
  ".html": "text/html",
  ".js": "text/javascript",
  ".mjs": "text/javascript",
  ".json": "application/json",
  ".svg": "image/svg+xml",
  ".webmanifest": "application/manifest+json",
  ".png": "image/png",
};

const LAUNCH_ARGS = [
  "--enable-unsafe-webgpu",
  "--enable-features=Vulkan,UseSkiaRenderer",
  "--ignore-gpu-blocklist",
  "--enable-webgpu",
];

function startServer() {
  return new Promise((resolve) => {
    const srv = http.createServer((req, res) => {
      let p = decodeURIComponent((req.url || "/").split("?")[0]);
      if (p === "/") p = "/index.html";
      const fp = path.join(ROOT, p);
      fs.readFile(fp, (err, data) => {
        if (err) {
          res.writeHead(404);
          res.end("404");
          return;
        }
        res.writeHead(200, {
          "Content-Type": MIME[path.extname(fp)] || "application/octet-stream",
        });
        res.end(data);
      });
    });
    srv.listen(PORT, "127.0.0.1", () => resolve(srv));
  });
}

async function probe(page) {
  return page.evaluate(() => {
    const banner = document.getElementById("webgpuBanner");
    const reason = document.getElementById("webgpuReason");
    const input = document.getElementById("input");
    const loadBtn = document.getElementById("loadBtn");
    const headLoadBtn = document.getElementById("headLoadBtn");
    const cs = banner ? getComputedStyle(banner) : null;
    return {
      bannerExists: !!banner,
      bannerHidden: banner ? banner.hidden : null,
      bannerDisplay: cs ? cs.display : null,
      reason: reason ? reason.textContent : null,
      textareaDisabled: input ? input.disabled : null,
      textareaPlaceholder: input ? input.placeholder : null,
      loadBtnDisabled: loadBtn ? loadBtn.disabled : null,
      headLoadBtnDisabled: headLoadBtn ? headLoadBtn.disabled : null,
      loadBtnTitle: loadBtn ? loadBtn.title : null,
      statusText: document.getElementById("statusText")
        ? document.getElementById("statusText").textContent
        : null,
      bodyBg: getComputedStyle(document.body).backgroundColor,
    };
  });
}

let failures = 0;
function assert(name, cond, detail) {
  if (cond) {
    console.log("  ok - " + name);
  } else {
    console.error("  FAIL - " + name + (detail ? " :: " + detail : ""));
    failures++;
  }
}

async function runPass(label, fn) {
  console.log(label);
  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  try {
    await fn(browser);
  } finally {
    await browser.close();
  }
}

(async () => {
  const srv = await startServer();
  try {
    // Pass A: real headless environment (no usable WebGPU adapter).
    // The banner must toggle ON and gate the load UI.
    await runPass("Pass A: headless (no adapter) -> banner toggles ON", async (browser) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: "load", timeout: 30000 });
      // Give the async checkWebGPU() promise a moment to resolve.
      await page.waitForTimeout(2500);
      const i = await probe(page);
      assert("banner element present", i.bannerExists === true);
      assert("#webgpuBanner[hidden] === false (toggled ON)", i.bannerHidden === false, "hidden=" + i.bannerHidden);
      assert("banner computed display: block", i.bannerDisplay === "block", "display=" + i.bannerDisplay);
      assert(
        "reason chip is no-adapter or no-webgpu-api",
        i.reason === "no-adapter" || i.reason === "no-webgpu-api",
        "reason=" + i.reason
      );
      assert("loadBtn disabled", i.loadBtnDisabled === true, "disabled=" + i.loadBtnDisabled);
      assert("headLoadBtn disabled", i.headLoadBtnDisabled === true, "disabled=" + i.headLoadBtnDisabled);
      assert("loadBtn tooltip set", /WebGPU is unavailable/.test(i.loadBtnTitle || ""), "title=" + i.loadBtnTitle);
      assert("placeholder actionable", /WebGPU is not available/.test(i.textareaPlaceholder || ""), "placeholder=" + i.textareaPlaceholder);
      assert("status error set", /WebGPU|adapter/i.test(i.statusText || ""), "status=" + i.statusText);
      assert("body background #09090b", i.bodyBg === "rgb(9, 9, 11)", "bg=" + i.bodyBg);
    });

    // Pass B: stubbed working adapter (proxy for a real GPU browser).
    // The banner must stay OFF and the existing load flow must be reachable.
    await runPass("Pass B: stubbed adapter -> banner toggles OFF (no regression)", async (browser) => {
      const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
      // Inject a working navigator.gpu before any page scripts run.
      await ctx.addInitScript(() => {
        if (!navigator.gpu) {
          Object.defineProperty(navigator, "gpu", { value: {}, configurable: true });
        }
        navigator.gpu.requestAdapter = async () => ({
          requestDevice: async () => ({}),
          info: {},
          limits: {},
        });
      });
      const page = await ctx.newPage();
      await page.goto(URL, { waitUntil: "load", timeout: 30000 });
      await page.waitForTimeout(2500);
      const i = await probe(page);
      assert("#webgpuBanner[hidden] === true (toggled OFF)", i.bannerHidden === true, "hidden=" + i.bannerHidden);
      assert("banner computed display: none", i.bannerDisplay === "none", "display=" + i.bannerDisplay);
      assert("loadBtn enabled", i.loadBtnDisabled === false, "disabled=" + i.loadBtnDisabled);
      assert("headLoadBtn enabled", i.headLoadBtnDisabled === false, "disabled=" + i.headLoadBtnDisabled);
      assert("loadBtn tooltip empty", i.loadBtnTitle === "", "title=" + i.loadBtnTitle);
      assert("placeholder original", i.textareaPlaceholder === "Load the model to start chatting...", "placeholder=" + i.textareaPlaceholder);
      assert("status not error", /WebGPU|adapter/i.test(i.statusText || "") === false, "status=" + i.statusText);
      assert("body background #09090b", i.bodyBg === "rgb(9, 9, 11)", "bg=" + i.bodyBg);
    });
  } finally {
    srv.close();
  }

  if (failures > 0) {
    console.error("\n" + failures + " assertion(s) failed");
    process.exit(1);
  }
  console.log("\nAll WebGPU-banner smoke assertions passed");
})();
