// Frame probe for p-planimeter (Classroom of the Elite). Each check prints one line `PASS|FAIL <mode> ...` and exits 0 or 1.
//   mean   <png> <box> <#hex> <tol>          mean RGB inside the box is within tol per channel of #hex
//   share  <png> <box> <#hex> <dist> <min>   share of box pixels within RGB distance dist of #hex is at least min
//   grey   <png> <box> <maxSpread>           mean of (max - min channel) inside the box is at most maxSpread
//   live   <png> <fNN|@sec> <box> <tol>      box mean within tol of the same box in the live frame fNN (frames/) or the cut frame nearest @sec (cut/)
//   match  <png> @<sec> <maxMad>             32x18 luma grid MAD over rows 0.12..0.88 against the live cut frame nearest @sec
//   bright <png> <box>                       the centroid of the brightest 5 percent of the frame lies inside the box
//   box    <t,...>                           the seal's screen box from the lab at each scene time (y down)
// A box is x0,y0,x1,y1 as fractions of the full frame (y down); keep y between 0.12 and 0.88 (the live frames carry site bars).
import { pathToFileURL, fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";
import path from "node:path";
import sharp from "sharp";

const DOCK = "p-planimeter";
const FRAMES_DIR = fileURLToPath(new URL("../../../../../verification/live/p-planimeter/frames/", import.meta.url));
const CUT_DIR = fileURLToPath(new URL("../../../../../verification/live/p-planimeter/cut/", import.meta.url));
const refPath = (name) => {
  if (!name.startsWith("@")) return `${FRAMES_DIR}${name}.png`;
  const sec = Number(name.slice(1));
  const index = JSON.parse(readFileSync(`${CUT_DIR}index.json`, "utf8"));
  let best = index[0];
  for (const e of index) if (Math.abs(e.ms / 1000 - sec) < Math.abs(best.ms / 1000 - sec)) best = e;
  return `${CUT_DIR}${best.file}`;
};

const parseBox = (s) => {
  const [x0, y0, x1, y1] = s.split(",").map(Number);
  return { x0, y0, x1, y1 };
};
const parseHex = (hex) => [1, 3, 5].map((i) => parseInt(hex.slice(i, i + 2), 16));
const inBox = (b, x, y, w, h) => {
  const u = (x + 0.5) / w;
  const v = (y + 0.5) / h;
  return u >= b.x0 && u <= b.x1 && v >= b.y0 && v <= b.y1;
};

async function pixels(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

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

async function meanOf(png, box) {
  const px = await pixels(png);
  const s = [0, 0, 0];
  const n = each(px, box, (r, g, b) => { s[0] += r; s[1] += g; s[2] += b; });
  return s.map((v) => v / n);
}

export async function mean(png, box, hex, tol) {
  const m = (await meanOf(png, box)).map(Math.round);
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

export async function live(png, name, box, tol) {
  const ours = (await meanOf(png, box)).map(Math.round);
  const ref = (await meanOf(refPath(name), box)).map(Math.round);
  const ok = ours.every((v, k) => Math.abs(v - ref[k]) <= tol);
  return { ok, line: `${ok ? "PASS" : "FAIL"} live ${ours.join(",")} vs ${name} ${ref.join(",")} tol ${tol}` };
}

const grid = async (f) => [...(await sharp(f).resize(32, 18, { fit: "fill" }).greyscale().raw().toBuffer())];
export async function match(png, name, maxMad) {
  const A = await grid(png);
  const B = await grid(refPath(name));
  let s = 0;
  let n = 0;
  for (let y = 2; y < 16; y++) for (let x = 0; x < 32; x++) { s += Math.abs(A[y * 32 + x] - B[y * 32 + x]); n++; }
  const mad = s / n;
  const ok = mad <= maxMad;
  return { ok, line: `${ok ? "PASS" : "FAIL"} match mad ${mad.toFixed(1)} max ${maxMad} vs ${name} ${refPath(name).split(/[\\/]/).pop()}` };
}

export async function bright(png, box) {
  const px = await pixels(png);
  const n = px.w * px.h;
  const luma = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const j = i * 3;
    luma[i] = 0.2126 * px.data[j] + 0.7152 * px.data[j + 1] + 0.0722 * px.data[j + 2];
  }
  const cut = Float32Array.from(luma).sort()[Math.floor(n * 0.95)];
  let sx = 0;
  let sy = 0;
  let c = 0;
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) {
    if (luma[y * px.w + x] < cut) continue;
    sx += (x + 0.5) / px.w;
    sy += (y + 0.5) / px.h;
    c++;
  }
  const u = sx / c;
  const v = sy / c;
  const ok = u >= box.x0 && u <= box.x1 && v >= box.y0 && v <= box.y1;
  return { ok, line: `${ok ? "PASS" : "FAIL"} bright centroid ${u.toFixed(3)},${v.toFixed(3)} want in ${[box.x0, box.y0, box.x1, box.y1].join(",")}` };
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
  else if (mode === "live") r = await live(a[0], a[1], parseBox(a[2]), Number(a[3]));
  else if (mode === "match") r = await match(a[0], a[1], Number(a[2]));
  else if (mode === "bright") r = await bright(a[0], parseBox(a[1]));
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
    console.error("usage: probe.mjs mean|share|grey <png> <box> ... | live <png> <fNN> <box> <tol> | bright <png> <box> | box <t,...>");
    process.exit(2);
  }
  console.log(r.line);
  process.exit(r.ok ? 0 : 1);
}
