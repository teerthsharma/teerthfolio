/* global window */
// node lib/anime/tools/cuts/pr-openxla-46539/sealbox.mjs <t> [<t> ...] : the seal's screen box at each cutscene second, as frame
// fractions (the box height is the share of the frame the seal fills). Read the way scripts/cut-verify.mjs reads it: player.box.
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";
import { cutUrl } from "../../../../../scripts/cut-serve.mjs";

const DOCK = "pr-openxla-46539";
const times = process.argv.slice(2).map(Number).filter(Number.isFinite);
if (!times.length) {
  console.log("usage: sealbox.mjs <t> [<t> ...]");
  process.exit(2);
}

const rows = await withGpuLock(`sealbox ${DOCK}`, async () => {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(await cutUrl(DOCK, `t=${times[0]}&paused`), { waitUntil: "load", timeout: 180000 });
    await page.waitForFunction(() => window.__cut, null, { timeout: 180000 });
    const out = [];
    for (const t of times) {
      const box = await page.evaluate((s) => { window.__cut.seek(s); const b = window.__cut.player.box; return b ? [...b] : null; }, t);
      out.push({ t, box });
    }
    return out;
  } finally {
    await browser.close();
  }
});

const clamp = (v) => Math.min(1, Math.max(0, v));
let bad = 0;
for (const { t, box } of rows) {
  if (!box) { bad++; console.log(`${t} s  no seal box (null)`); continue; }
  const [x0, y0, x1, y1] = box;
  const h = clamp(y1) - clamp(y0), w = clamp(x1) - clamp(x0);
  const note = h <= 0 || w <= 0 ? "  OUTSIDE the frame" : "";
  if (note) bad++;
  console.log(`${t} s  height ${h.toFixed(3)}  width ${w.toFixed(3)}  box [${box.map((v) => v.toFixed(3)).join(", ")}]${note}`);
}
process.exitCode = bad ? 1 : 0;
