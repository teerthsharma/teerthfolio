// node scripts/anime-cap.mjs --url http://localhost:3801 --gpu nvidia|intel --shots "demo=rimuru&t=3,..." --out dir [--perf 6]
import { chromium } from "playwright";
import { BASE_FLAGS } from "./gpu-adapter.mjs";
const arg = (k, d) => { const i = process.argv.indexOf("--" + k); return i > 0 ? process.argv[i + 1] : d; };
const url = arg("url", "http://localhost:3801"), out = arg("out", "../engine-shots"), gpu = arg("gpu", "nvidia"), perf = Number(arg("perf", 0));
const chrome = "C:/Program Files/Google/Chrome/Application/chrome.exe";
// LUIDs read from chrome://gpu on this laptop (adapterFlags() timed out here)
const browser = await chromium.launch({ executablePath: chrome, headless: true, args: [...BASE_FLAGS, `--use-adapter-luid=${gpu === "intel" ? "0,67132" : "0,68098"}`] });
const page = await browser.newPage({ viewport: { width: 1180, height: 820 }, deviceScaleFactor: Number(arg("dpr", 1)) });
const errs = [];
page.on("pageerror", (e) => errs.push(String(e)));
page.on("console", (m) => { if (m.type() === "error" || m.type() === "warning") errs.push(m.text().slice(0, 400)); });
for (const spec of arg("shots", "demo=rimuru&t=1").split(",")) {
  const q = new URLSearchParams(spec);
  const name = arg("prefix", "") + spec.replace(/[=&]/g, "-");
  await page.goto(`${url}/lab/anime?${spec}${perf ? "" : "&paused"}`, { waitUntil: "load", timeout: 120000 });
  await page.waitForFunction(() => window.__anime, null, { timeout: 60000 }).catch(() => { console.log("NO ENGINE", errs); process.exit(1); });
  if (perf) { await page.waitForTimeout(1500); await page.evaluate(() => window.__anime.reset()); await page.waitForTimeout(perf * 1000); }
  else { await page.evaluate((t) => window.__anime.seek(t), Number(q.get("t") ?? 0)); await page.waitForTimeout(400); }
  const st = await page.evaluate(() => window.__anime.stats());
  if (!q.has("noshot")) await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name, JSON.stringify({ adapter: st.adapter, tier: st.tier, dpr: st.dpr, buffer: st.buffer, p50: st.p50?.toFixed?.(2), p95: st.p95?.toFixed?.(2), n: st.n, bakeMs: st.bakeMs?.map((x) => +x.toFixed(1)), gov: st.governor }));
}
if (errs.length) console.log("ERRORS:\n" + [...new Set(errs)].slice(0, 15).join("\n"));
await browser.close();
