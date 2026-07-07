import { chromium } from "playwright";
const URL = process.env.SMOKE_URL || "http://127.0.0.1:8731/index.html";
function result(pass, evidence){ console.log(JSON.stringify({check:"banner-header", pass, ...evidence}, null, 2)); process.exit(pass?0:1); }
async function main(){
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const errors=[]; page.on("pageerror", e=>errors.push(String(e)));
  await page.goto(URL, { waitUntil: "load", timeout: 30000 });
  await page.waitForSelector("#webgpuBanner.show", { timeout: 15000 }).catch(()=>{});
  const info = await page.evaluate(() => {
    const banner = document.getElementById("webgpuBanner");
    const titleEl = banner ? banner.querySelector(".webgpu-banner-title") : null;
    const chat = document.getElementById("chat");
    const head = chat ? chat.querySelector(".chat-head") : null;
    const threadScroll = document.getElementById("threadScroll");
    const r = (el) => { const b = el ? el.getBoundingClientRect() : null; return b ? { top: Math.round(b.top), bottom: Math.round(b.bottom), left: Math.round(b.left), width: Math.round(b.width) } : null; };
    // banner is an inline child of #chat, after the header and before the thread scroll
    const bannerChildOfChat = banner && chat && chat.contains(banner);
    let orderOk = null;
    if (head && banner && threadScroll) {
      // DOM order: head before banner before threadScroll
      const headBeforeBanner = (head.compareDocumentPosition(banner) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      const bannerBeforeThread = (banner.compareDocumentPosition(threadScroll) & Node.DOCUMENT_POSITION_FOLLOWING) !== 0;
      orderOk = headBeforeBanner && bannerBeforeThread;
    }
    const br = r(banner), hr = r(head), tr = r(threadScroll);
    // visually: banner sits below header and above the thread (inline above chat panel content)
    const visualOk = br && hr && tr && br.top >= hr.bottom && br.bottom <= tr.top;
    return {
      titleText: titleEl ? titleEl.textContent.trim() : null,
      titleVisible: titleEl ? (titleEl.getBoundingClientRect().width > 0 && titleEl.getBoundingClientRect().height > 0) : false,
      bannerChildOfChat, orderOk, visualOk,
      headRect: hr, bannerRect: br, threadRect: tr
    };
  });
  await browser.close();
  const pass = info.titleText === "WebGPU not available" && info.titleVisible && info.bannerChildOfChat && info.orderOk && info.visualOk;
  result(pass, { ...info, pageErrors: errors });
}
main();
