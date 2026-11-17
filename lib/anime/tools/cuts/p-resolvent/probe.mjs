// Frame probe for p-resolvent (Frieren). Each check prints one line `PASS|FAIL <mode> ...` and exits 0 or 1.
//   mean  <png> <box> <#hex> <tol>          mean RGB inside the box is within tol per channel of #hex
//   share <png> <box> <#hex> <dist> <min>   share of box pixels within RGB distance dist of #hex is at least min
//   absent <png> <box> <#hex> <dist> <max> share of box pixels within dist of #hex is at most max
//   grey  <png> <box> <maxSpread>           mean of (max - min channel) inside the box is at most maxSpread
//   extent <png> <box> <#hex> <dist> <min> <max>  matching pixels span min..max of the width; rowstep <png> <y0> <y1> <maxStep> [x0 x1]
//   hot <png> <box> <pad> <min>  at least min of the brightest 5 percent lie in the box padded by pad; overlap <png> <boxA> <boxB>
//   box   <t,...>                           the seal's screen box from the lab at each scene time (y down)
// A box is x0,y0,x1,y1 as fractions of the full frame (y down); keep y between 0.10 and 0.90 (letterbox, site bars).
// Every PNG mode first reads the whole frame: a dark-red mean is a failed load (a blank tile), not a result.
import { pathToFileURL } from "node:url";
import path from "node:path";
import sharp from "sharp";

const DOCK = "p-resolvent";

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

function blankFrame(px) {
  const s = [0, 0, 0];
  for (let i = 0; i < px.data.length; i += 3) for (let k = 0; k < 3; k++) s[k] += px.data[i + k];
  const n = px.w * px.h;
  const m = s.map((v) => v / n);
  if (m[0] >= 40 && m[0] <= 90 && m[1] < 25 && m[2] < 25) {
    return `FAIL blank frame mean ${m.map((v) => Math.round(v)).join(",")} (the cutscene failed to load; read the console)`;
  }
  return null;
}

// visits every pixel inside the box; fn(r, g, b, x) returns nothing
function each(px, box, fn) {
  let n = 0;
  for (let y = 0; y < px.h; y++) for (let x = 0; x < px.w; x++) {
    if (!inBox(box, x, y, px.w, px.h)) continue;
    const i = (y * px.w + x) * 3;
    fn(px.data[i], px.data[i + 1], px.data[i + 2], x);
    n++;
  }
  return n;
}

export async function mean(png, box, hex, tol) {
  const px = await pixels(png);
  const bad = blankFrame(px);
  if (bad) return { ok: false, line: bad };
  const s = [0, 0, 0];
  const n = each(px, box, (r, g, b) => (s[0] += r, s[1] += g, s[2] += b));
  const m = s.map((v) => Math.round(v / n));
  const want = parseHex(hex);
  const ok = m.every((v, k) => Math.abs(v - want[k]) <= tol);
  return { ok, line: `${ok ? "PASS" : "FAIL"} mean ${m.join(",")} want ${hex} tol ${tol}` };
}

async function fraction(png, box, hex, dist) {
  const px = await pixels(png);
  const bad = blankFrame(px);
  if (bad) return { bad };
  const [r0, g0, b0] = parseHex(hex);
  let hit = 0;
  const n = each(px, box, (r, g, b) => {
    if (Math.hypot(r - r0, g - g0, b - b0) <= dist) hit++;
  });
  return { v: hit / n };
}

export async function share(png, box, hex, dist, min) {
  const f = await fraction(png, box, hex, dist);
  if (f.bad) return { ok: false, line: f.bad };
  const ok = f.v >= min;
  return { ok, line: `${ok ? "PASS" : "FAIL"} share ${f.v.toFixed(4)} want >= ${min} of ${hex} dist ${dist}` };
}

export async function absent(png, box, hex, dist, max) {
  const f = await fraction(png, box, hex, dist);
  if (f.bad) return { ok: false, line: f.bad };
  const ok = f.v <= max;
  return { ok, line: `${ok ? "PASS" : "FAIL"} absent ${f.v.toFixed(4)} want <= ${max} of ${hex} dist ${dist}` };
}

export async function grey(png, box, maxSpread) {
  const px = await pixels(png);
  const bad = blankFrame(px);
  if (bad) return { ok: false, line: bad };
  let sum = 0;
  const n = each(px, box, (r, g, b) => (sum += Math.max(r, g, b) - Math.min(r, g, b)));
  const v = sum / n;
  const ok = v <= maxSpread;
  return { ok, line: `${ok ? "PASS" : "FAIL"} grey ${v.toFixed(2)} want <= ${maxSpread}` };
}

const guarded = async (png, fn) => { const px = await pixels(png), bad = blankFrame(px); return bad ? { ok: false, line: bad } : fn(px); };
const lum = (d, i) => 0.2126 * d[i] + 0.7152 * d[i + 1] + 0.0722 * d[i + 2];
export const extent = (png, box, hex, dist, min, max) => guarded(png, (px) => {
  const [r0, g0, b0] = parseHex(hex);
  let lo = Infinity, hi = -Infinity, n = 0;
  each(px, box, (r, g, b, x) => {
    if (Math.hypot(r - r0, g - g0, b - b0) > dist) return;
    n++;
    lo = Math.min(lo, x);
    hi = Math.max(hi, x);
  });
  const v = n >= 40 ? (hi - lo + 1) / px.w : 0;
  const ok = v >= min && v <= max;
  return { ok, line: `${ok ? "PASS" : "FAIL"} extent ${v.toFixed(3)} want ${min}..${max} (${n} px)` };
});

export const rowstep = (png, y0, y1, maxStep, x0 = 0, x1 = 1) => guarded(png, (px) => {
  const rows = [];
  const xa = Math.floor(x0 * px.w), xb = Math.floor(x1 * px.w);
  for (let y = Math.floor(y0 * px.h); y < Math.floor(y1 * px.h); y++) {
    let s = 0;
    for (let x = xa; x < xb; x++) s += lum(px.data, (y * px.w + x) * 3);
    rows.push(s / (xb - xa));
  }
  const step = rows.reduce((m, v, k) => (k ? Math.max(m, Math.abs(v - rows[k - 1])) : m), 0);
  const ok = rows.length > 1 && step <= maxStep;
  return { ok, line: `${ok ? "PASS" : "FAIL"} rowstep ${step.toFixed(2)} want <= ${maxStep}` };
});

export const hot = (png, box, pad, min) => guarded(png, (px) => {
  const n = px.w * px.h, L = new Float32Array(n);
  for (let p = 0; p < n; p++) L[p] = lum(px.data, 3 * p);
  const order = Uint32Array.from({ length: n }, (_, p) => p).sort((a, b) => L[b] - L[a]);
  const top = order.subarray(0, Math.floor(0.05 * n));
  const pb = { x0: box.x0 - pad, y0: box.y0 - pad, x1: box.x1 + pad, y1: box.y1 + pad };
  let inside = 0;
  for (const p of top) if (inBox(pb, p % px.w, Math.floor(p / px.w), px.w, px.h)) inside++;
  const v = inside / top.length, ok = v >= min;
  return { ok, line: `${ok ? "PASS" : "FAIL"} hot ${v.toFixed(3)} want >= ${min} (brightest 5 percent, ${top.length} px)` };
});

export const overlap = (png, A, B) => guarded(png, () => {
  const area = Math.max(0, Math.min(A.x1, B.x1) - Math.max(A.x0, B.x0)) * Math.max(0, Math.min(A.y1, B.y1) - Math.max(A.y0, B.y0));
  return { ok: area <= 0, line: `${area <= 0 ? "PASS" : "FAIL"} overlap area ${area.toFixed(4)} want 0` };
});

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
  else if (mode === "absent") r = await absent(a[0], parseBox(a[1]), a[2], Number(a[3]), Number(a[4]));
  else if (mode === "grey") r = await grey(a[0], parseBox(a[1]), Number(a[2]));
  else if (mode === "extent") r = await extent(a[0], parseBox(a[1]), a[2], Number(a[3]), Number(a[4]), Number(a[5]));
  else if (mode === "rowstep") r = await rowstep(a[0], Number(a[1]), Number(a[2]), Number(a[3]), Number(a[4] ?? 0), Number(a[5] ?? 1));
  else if (mode === "hot") r = await hot(a[0], parseBox(a[1]), Number(a[2]), Number(a[3]));
  else if (mode === "overlap") r = await overlap(a[0], parseBox(a[1]), parseBox(a[2]));
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
    console.error("usage: probe.mjs mean|share|absent|grey|extent|hot|overlap <png> ... | rowstep <png> <y0> <y1> <max> [x0 x1] | box <t,...>");
    process.exit(2);
  }
  console.log(r.line);
  process.exit(r.ok ? 0 : 1);
}
