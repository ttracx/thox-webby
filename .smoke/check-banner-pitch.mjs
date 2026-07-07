import { chromium } from "playwright";
const URL = process.env.SMOKE_URL || "http://127.0.0.1:8731/index.html";
function result(pass, evidence){ console.log(JSON.stringify({check:"banner-pitch", pass, ...evidence}, null, 2)); process.exit(pass?0:1); }
async function main(){
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors=[]; page.on("pageerror", e=>errors.push(String(e)));
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  await page.waitForSelector("#webgpuBanner.show", { timeout: 15000 }).catch(()=>{});
  const info = await page.evaluate(() => {
    const banner = document.getElementById("webgpuBanner");
    const pitch = banner ? banner.querySelector(".webgpu-banner-pitch") : null;
    const text = pitch ? pitch.textContent.trim() : null;
    const rect = pitch ? pitch.getBoundingClientRect() : null;
    return { text, visible: rect ? (rect.width>0 && rect.height>0) : false, top: rect ? Math.round(rect.top) : null };
  });
  await browser.close();
  const t = info.text || "";
  const pass = info.visible
    && t.includes("ThoxWebby runs entirely in your browser via WebGPU")
    && t.includes("no servers")
    && t.includes("no data leaves your machine");
  result(pass, { ...info, pageErrors: errors });
}
main();
