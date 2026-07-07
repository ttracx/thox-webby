// ThoxWebby WebGPU-banner smoke test.
// Checked-in regression guard for the graceful WebGPU-unavailable banner.
//
// All passes use deterministic navigator.gpu stubs (injected before page scripts
// run) so the test does NOT depend on the CI runner having a real WebGPU stack -
// it asserts how OUR code reacts to each adapter outcome.
//
//   A0) navigator.gpu absent                 -> banner ON,  reason=no-webgpu-api
//   A1) navigator.gpu.requestAdapter() -> null -> banner ON,  reason=no-adapter
//   B ) navigator.gpu.requestAdapter() -> adapter -> banner OFF (no regression)
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

async function runPass(label, initScript, assertFn) {
  console.log(label);
  const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
  try {
    const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
    if (initScript) await ctx.addInitScript(initScript);
    const page = await ctx.newPage();
    await page.goto(URL, { waitUntil: "load", timeout: 30000 });
    // checkWebGPU() is async; give its promise a moment to resolve.
    await page.waitForTimeout(1500);
    const i = await probe(page);
    assertFn(i);
  } finally {
    await browser.close();
  }
}

(async () => {
  const srv = await startServer();
  try {
    // A0: navigator.gpu absent -> no-webgpu-api branch.
    await runPass(
      "Pass A0: navigator.gpu absent -> banner ON, reason=no-webgpu-api",
      () => {
        // Remove navigator.gpu so the "gpu" in navigator check fails.
        Object.defineProperty(navigator, "gpu", { value: undefined, configurable: true });
      },
      (i) => {
        assert("banner element present", i.bannerExists === true);
        assert("#webgpuBanner[hidden] === false (toggled ON)", i.bannerHidden === false, "hidden=" + i.bannerHidden);
        assert("banner computed display: block", i.bannerDisplay === "block", "display=" + i.bannerDisplay);
        assert("reason chip no-webgpu-api", i.reason === "no-webgpu-api", "reason=" + i.reason);
        assert("loadBtn disabled", i.loadBtnDisabled === true, "disabled=" + i.loadBtnDisabled);
        assert("headLoadBtn disabled", i.headLoadBtnDisabled === true, "disabled=" + i.headLoadBtnDisabled);
        assert("loadBtn tooltip set", /WebGPU is unavailable/.test(i.loadBtnTitle || ""), "title=" + i.loadBtnTitle);
        assert("placeholder actionable", /WebGPU is not available/.test(i.textareaPlaceholder || ""), "placeholder=" + i.textareaPlaceholder);
        assert("status error set", /WebGPU|adapter/i.test(i.statusText || ""), "status=" + i.statusText);
        assert("body background #09090b", i.bodyBg === "rgb(9, 9, 11)", "bg=" + i.bodyBg);
      }
    );

    // A1: navigator.gpu present but requestAdapter() resolves null -> no-adapter branch.
    await runPass(
      "Pass A1: requestAdapter() -> null -> banner ON, reason=no-adapter",
      () => {
        if (!navigator.gpu) {
          Object.defineProperty(navigator, "gpu", { value: {}, configurable: true });
        }
        navigator.gpu.requestAdapter = async () => null;
      },
      (i) => {
        assert("#webgpuBanner[hidden] === false (toggled ON)", i.bannerHidden === false, "hidden=" + i.bannerHidden);
        assert("banner computed display: block", i.bannerDisplay === "block", "display=" + i.bannerDisplay);
        assert("reason chip no-adapter", i.reason === "no-adapter", "reason=" + i.reason);
        assert("loadBtn disabled", i.loadBtnDisabled === true, "disabled=" + i.loadBtnDisabled);
        assert("headLoadBtn disabled", i.headLoadBtnDisabled === true, "disabled=" + i.headLoadBtnDisabled);
        assert("placeholder actionable", /WebGPU is not available/.test(i.textareaPlaceholder || ""), "placeholder=" + i.textareaPlaceholder);
        assert("body background #09090b", i.bodyBg === "rgb(9, 9, 11)", "bg=" + i.bodyBg);
      }
    );

    // B: navigator.gpu present, requestAdapter() resolves a fake adapter -> banner OFF.
    await runPass(
      "Pass B: requestAdapter() -> adapter -> banner OFF (no regression)",
      () => {
        if (!navigator.gpu) {
          Object.defineProperty(navigator, "gpu", { value: {}, configurable: true });
        }
        navigator.gpu.requestAdapter = async () => ({
          requestDevice: async () => ({}),
          info: {},
          limits: {},
        });
      },
      (i) => {
        assert("#webgpuBanner[hidden] === true (toggled OFF)", i.bannerHidden === true, "hidden=" + i.bannerHidden);
        assert("banner computed display: none", i.bannerDisplay === "none", "display=" + i.bannerDisplay);
        assert("loadBtn enabled", i.loadBtnDisabled === false, "disabled=" + i.loadBtnDisabled);
        assert("headLoadBtn enabled", i.headLoadBtnDisabled === false, "disabled=" + i.headLoadBtnDisabled);
        assert("loadBtn tooltip empty", i.loadBtnTitle === "", "title=" + i.loadBtnTitle);
        assert("placeholder original", i.textareaPlaceholder === "Load the model to start chatting...", "placeholder=" + i.textareaPlaceholder);
        assert("status not error", /WebGPU|adapter/i.test(i.statusText || "") === false, "status=" + i.statusText);
        assert("body background #09090b", i.bodyBg === "rgb(9, 9, 11)", "bg=" + i.bodyBg);
      }
    );
  } finally {
    srv.close();
  }

  if (failures > 0) {
    console.error("\n" + failures + " assertion(s) failed");
    process.exit(1);
  }
  console.log("\nAll WebGPU-banner smoke assertions passed");
})();
