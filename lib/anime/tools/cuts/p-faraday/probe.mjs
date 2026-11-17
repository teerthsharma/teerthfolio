// Frame probe for p-faraday (Railgun). Each check prints one line `PASS|FAIL <mode> ...` and exits 0 or 1.
//   mean  <png> <box> <#hex> <tol>          mean RGB inside the box is within tol per channel of #hex
//   share <png> <box> <#hex> <dist> <min>   share of box pixels within RGB distance dist of #hex is at least min
//   grey  <png> <box> <maxSpread>           mean of (max - min channel) inside the box is at most maxSpread
//   box   <t,...>                           the seal's screen box from the lab at each scene time (y down)
// A box is x0,y0,x1,y1 as fractions of the full frame (y down); keep y between 0.10 and 0.90 (letterbox, site bars).
import { pathToFileURL } from "node:url";
import path from "node:path";
import sharp from "sharp";

const DOCK = "p-faraday";

const parseBox = (s) => {
  const [x0, y0, x1, y1] = s.split(",").map(Number);
  return { x0, y0, x1, y1 };
};
const parseHex = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const inBox = (b, x, y, w, h) => {
  const u = (x + 0.5) / w, v = (y + 0.5) / h;
  return u >= b.x0 && u <= b.x1 && v >= b.y0 && v <= b.y1;
};

async function pixels(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

// visits every pixel inside the box; fn(r, g, b) returns nothing
function each(px, box, fn) {
  let n = 0;
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) {
    if (!inBox(box, x, y, px.w, px.h)) continue;
    const i = (y * px.w + x) * 3;
    fn(px.data[i], px.data[i + 1], px.data[i + 2]);
    n++;
  }
  return n;
}

export async function mean(png, box, hex, tol) {
  const px = await pixels(png);
  const s = [0, 0, 0];
  const n = each(px, box, (r, g, b) => (s[0] += r, s[1] += g, s[2] += b));
  const m = s.map((v) => Math.round(v / n));
  const want = parseHex(hex);
  const ok = m.every((v, k) => Math.abs(v - want[k]) <= tol);
  return { ok, line: `${ok ? "PASS" : "FAIL"} mean ${m.join(",")} want ${hex} tol ${tol}` };
}

export async function share(png, box, hex, dist, min) {
  const px = await pixels(png);
  const [r0, g0, b0] = parseHex(hex);
  let hit = 0;
  const n = each(px, box, (r, g, b) => {
    if (Math.hypot(r - r0, g - g0, b - b0) <= dist) hit++;
  });
  const v = hit / n;
  const ok = v >= min;
  return { ok, line: `${ok ? "PASS" : "FAIL"} share ${v.toFixed(4)} want >= ${min} of ${hex} dist ${dist}` };
}

export async function grey(png, box, maxSpread) {
  const px = await pixels(png);
  let sum = 0;
  const n = each(px, box, (r, g, b) => (sum += Math.max(r, g, b) - Math.min(r, g, b)));
  const v = sum / n;
  const ok = v <= maxSpread;
  return { ok, line: `${ok ? "PASS" : "FAIL"} grey ${v.toFixed(2)} want <= ${maxSpread}` };
}

export async function boxes(times) {
  const { withGpuLock } = await import("../../../../../scripts/cut-lock.mjs");
  const { launchChrome } = await import("../../../../../scripts/cut-cap.mjs");
  const { cutUrl } = await import("../../../../../scripts/cut-serve.mjs");
  return withGpuLock(`probe ${DOCK}`, async () => {
    const browser = await launchChrome();
    try {
      const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
      await page.goto(await cutUrl(DOCK, "t=0&paused", 3811), { waitUntil: "load", timeout: 180000 });
      await page.waitForFunction(() => window.__cut, null, { timeout: 180000 });
      await page.addStyleTag({ content: "nav{display:none!important}" });
      const rows = [];
      for (const t of times) {
        const player = await page.evaluate((s) => {
          const c = window.__cut;
          c.seek(s);
          return c.player.box ? [...c.player.box] : null;
        }, t);
        rows.push({ t, player });
      }
      return rows;
    } finally {
      await browser.close();
    }
  });
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, ...a] = process.argv.slice(2);
  let r = null;
  if (mode === "mean") r = await mean(a[0], parseBox(a[1]), a[2], Number(a[3]));
  else if (mode === "share") r = await share(a[0], parseBox(a[1]), a[2], Number(a[3]), Number(a[4]));
  else if (mode === "grey") r = await grey(a[0], parseBox(a[1]), Number(a[2]));
  else if (mode === "box") {
    const times = (a[0] ?? "0").split(",").map(Number);
    const rows = await boxes(times);
    let all = true;
    for (const { t, player } of rows) {
      if (!player) { all = false; console.log(`FAIL box t=${t} none`); continue; }
      const [x0, y0, x1, y1] = player;
      console.log(`PASS box t=${t} ${[x0, y0, x1, y1].map((v) => v.toFixed(3)).join(",")} height ${(y1 - y0).toFixed(3)} width ${(x1 - x0).toFixed(3)}`);
    }
    process.exit(all ? 0 : 1);
  } else {
    console.error("usage: probe.mjs mean|share|grey <png> <box> ... | box <t,...>");
    process.exit(2);
  }
  console.log(r.line);
  process.exit(r.ok ? 0 : 1);
}
