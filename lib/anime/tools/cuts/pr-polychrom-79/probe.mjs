// Probe for pr-polychrom-79. Modes:
//   box <png> x0 y0 x1 y1 [hex:tol ...]   mean RGB of a frame box and, per hex, the share of its pixels within tol (max channel difference)
//   stat <t,t,...> [extraQuery]           tier, draw calls, triangles and the seal box at each t, read live in Chrome (reset, seek, read: no grab)
import { pathToFileURL } from "node:url";
import path from "node:path";
import sharp from "sharp";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";
import { cutUrl, closeServe } from "../../../../../scripts/cut-serve.mjs";

const DOCK = "pr-polychrom-79";

export async function box(png, [x0, y0, x1, y1], targets = []) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const { width: w, height: h } = info;
  const X0 = Math.floor(x0 * w), X1 = Math.ceil(x1 * w), Y0 = Math.floor(y0 * h), Y1 = Math.ceil(y1 * h);
  const hits = targets.map(() => 0);
  let n = 0, sr = 0, sg = 0, sb = 0;
  for (let y = Y0; y < Y1; y++) for (let x = X0; x < X1; x++) {
    const i = (y * w + x) * 3, r = data[i], g = data[i + 1], b = data[i + 2];
    n++; sr += r; sg += g; sb += b;
    targets.forEach(({ rgb: [tr, tg, tb], tol }, k) => {
      if (Math.max(Math.abs(r - tr), Math.abs(g - tg), Math.abs(b - tb)) <= tol) hits[k]++;
    });
  }
  return {
    rgb: [sr / n, sg / n, sb / n].map((c) => Math.round(c)),
    shares: targets.map((t, k) => ({ hex: t.hex, share: (hits[k] / n).toFixed(4) })),
  };
}

export async function stat(times, extra = "") {
  return withGpuLock(`probe ${DOCK}`, async () => {
    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      await page.goto(await cutUrl(DOCK, `t=0&paused${extra ? "&" + extra : ""}`, 3811), { waitUntil: "load", timeout: 180000 });
      await page.waitForFunction(() => window.__cut, null, { timeout: 180000 });
      const rows = [];
      for (const t of times) {
        const r = await page.evaluate((s) => {
          const c = window.__cut, info = c.engine.renderer.info;
          info.autoReset = false; info.reset(); c.seek(s);
          return { tier: c.engine.tier ?? null, calls: info.render.calls, tris: info.render.triangles, box: c.player.box && [...c.player.box] };
        }, t);
        rows.push({ t, ...r });
      }
      return rows;
    } finally {
      await browser.close();
      closeServe();
    }
  });
}

const parseTarget = (s) => {
  const [hex, tol = "16"] = s.split(":");
  return { hex, rgb: [0, 2, 4].map((i) => parseInt(hex.slice(i, i + 2), 16)), tol: Number(tol) };
};

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "box") {
    const [png, x0, y0, x1, y1, ...targets] = args;
    const r = await box(png, [x0, y0, x1, y1].map(Number), targets.map(parseTarget));
    console.log(JSON.stringify(r));
  } else if (mode === "stat") {
    const [times, extra] = args;
    console.log("t\ttier\tcalls\ttris\tbox");
    for (const r of await stat(times.split(",").map(Number), extra ?? "")) {
      console.log([r.t, r.tier, r.calls, r.tris, JSON.stringify(r.box)].join("\t"));
    }
  } else {
    console.error("usage: probe.mjs box <png> x0,y0,x1,y1 [hex:tol ...] | stat <t,...> [extraQuery]");
    process.exit(2);
  }
}
