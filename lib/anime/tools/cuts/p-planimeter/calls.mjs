/* global window */
// node lib/anime/tools/cuts/p-planimeter/calls.mjs : every visible drawable at seven cut times (triangles, layer mask, kind, material,
// parent chain), smallest first. The row count at a time is its draw-call count.
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { cutUrl } from "../../../../../scripts/cut-serve.mjs";

const TIMES = [4.0, 5.5, 8.6, 9.5, 12.0, 20.6, 26.0];
const browser = await launchChrome();
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
  await page.goto(await cutUrl("p-planimeter", "t=0&paused"), { waitUntil: "load", timeout: 180000 });
  await page.waitForFunction(() => window.__cut, null, { timeout: 120000 });
  await page.waitForTimeout(900);
  for (const t of TIMES) {
    const rows = await page.evaluate((t) => {
      const c = window.__cut;
      c.seek(t);
      const rows = [];
      c.player.root.traverseVisible((o) => {
        if (!o.isMesh && !o.isPoints && !o.isLine) return;
        const g = o.geometry;
        const all = g.index ? g.index.count : g.attributes.position?.count ?? 0;
        const n = (Math.min(all, g.drawRange.count) / 3) * (o.isInstancedMesh ? o.count : 1) * (g.isInstancedBufferGeometry ? g.instanceCount ?? 1 : 1);
        let p = o.parent;
        const path = [];
        while (p && path.length < 5) { path.push(p.name || p.type); p = p.parent; }
        const m = Array.isArray(o.material) ? o.material[0] : o.material;
        rows.push([Math.round(n), o.layers.mask, o.isInstancedMesh ? "inst" : o.isPoints ? "points" : "mesh", (m?.name || m?.type || "") + (m?.transparent ? " T" : "") + (m?.side === 1 ? " back" : ""), (o.name || "") + " < " + path.join(" < "), o.frustumCulled ? "" : "nocull"]);
      });
      return rows.sort((a, b) => a[0] - b[0]);
    }, t);
    console.log(`t ${t}: ${rows.length} draw calls (visible drawables)`);
    for (const r of rows) console.log(String(r[0]).padStart(8), r[1], r[2].padEnd(6), r[3].padEnd(24), r[4], r[5]);
  }
} finally {
  await browser.close();
}
process.exit(0);
