import { chromium } from "playwright";
const URL = process.env.SMOKE_URL || "http://127.0.0.1:8731/index.html";
function result(pass, evidence){ console.log(JSON.stringify({check:"banner-checklist", pass, ...evidence}, null, 2)); process.exit(pass?0:1); }
async function main(){
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors=[]; page.on("pageerror", e=>errors.push(String(e)));
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  await page.waitForSelector("#webgpuBanner.show", { timeout: 15000 }).catch(()=>{});
  const info = await page.evaluate(() => {
    const banner = document.getElementById("webgpuBanner");
    const ul = banner ? banner.querySelector(".webgpu-banner-checklist") : null;
    const items = ul ? Array.from(ul.querySelectorAll("li")).map((li) => li.textContent.trim()) : [];
    const rect = ul ? ul.getBoundingClientRect() : null;
    return { itemCount: items.length, items, visible: rect ? (rect.width>0 && rect.height>0) : false };
  });
  await browser.close();
  const joined = info.items.join(" | ").toLowerCase();
  const pass = info.visible && info.items.length >= 3
    && joined.includes("chrome 113+") && joined.includes("edge 113+") && joined.includes("safari 18+")
    && joined.includes("chrome://gpu")
    && joined.includes("corporate policies") && joined.includes("disable webgpu");
  result(pass, { ...info, pageErrors: errors });
}
main();
