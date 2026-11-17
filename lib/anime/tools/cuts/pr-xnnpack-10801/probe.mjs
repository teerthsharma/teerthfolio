// Frame probe for pr-xnnpack-10801. Modes:
//   stat <png> [--not x0,y0,x1,y1] [--in x0,y0,x1,y1]   rgb, luma, teal, dark, yellow, gold shares
//   near <png> <#hex> <tol> [--in box]                    share of pixels within RGB distance tol
//   diff <a.png> <b.png> [--not box]                      mean absolute RGB difference
//   mean <png> x0,y0,x1,y1                                mean #rrggbb inside the box
//   black <png>                                           share of pixels with every channel <= 12 (#0c0c0c, the sheet's sky bar)
//   box <t,...>                                           seal box (y down) from the live cut in Chrome
import { pathToFileURL } from "node:url";
import path from "node:path";
import sharp from "sharp";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";
import { cutUrl } from "../../../../../scripts/cut-serve.mjs";

const DOCK = "pr-xnnpack-10801";

const flag = (args, name) => {
  const i = args.indexOf(name);
  if (i < 0) return null;
  return parseBox(args[i + 1]);
};

const parseBox = (s) => {
  const [x0, y0, x1, y1] = s.split(",").map(Number);
  return { x0, y0, x1, y1 };
};

const parseHex = (hex) => {
  const h = hex.replace(/^#/, "");
  return [0, 2, 4].map((i) => parseInt(h.slice(i, i + 2), 16));
};

const inBox = (b, x, y, w, h) => {
  const u = (x + 0.5) / w, v = (y + 0.5) / h;
  return u >= b.x0 && u <= b.x1 && v >= b.y0 && v <= b.y1;
};

async function pixels(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, w: info.width, h: info.height };
}

function hsv(r, g, b) {
  const max = Math.max(r, g, b), min = Math.min(r, g, b), d = max - min;
  let h = 0;
  if (d > 0) {
    if (max === r) h = 60 * (((g - b) / d) % 6);
    else if (max === g) h = 60 * ((b - r) / d + 2);
    else h = 60 * ((r - g) / d + 4);
  }
  if (h < 0) h += 360;
  return { h, s: max === 0 ? 0 : d / max, v: max / 255 };
}

export async function stat(png, not = null, inside = null) {
  const { data, w, h } = await pixels(png);
  let n = 0, sr = 0, sg = 0, sb = 0, sl = 0, teal = 0, dark = 0, yellow = 0, gold = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (not && inBox(not, x, y, w, h)) continue;
    if (inside && !inBox(inside, x, y, w, h)) continue;
    const i = (y * w + x) * 3, r = data[i], g = data[i + 1], b = data[i + 2];
    const luma = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
    const { h: hu, s, v } = hsv(r, g, b);
    n++; sr += r; sg += g; sb += b; sl += luma;
    if (hu >= 160 && hu <= 200 && s > 0.35 && v > 0.35) teal++;
    if (luma < 0.2) dark++;
    if (hu >= 50 && hu <= 66 && s > 0.5 && v > 0.5) yellow++;
    if (hu >= 32 && hu <= 49 && s > 0.55 && v > 0.6) gold++;
  }
  const f = (k) => (k / n).toFixed(4);
  return { rgb: [sr / n, sg / n, sb / n].map((c) => Math.round(c)), luma: (sl / n).toFixed(3), teal: f(teal), dark: f(dark), yellow: f(yellow), gold: f(gold) };
}

export async function near(png, hex, tol, inside = null) {
  const { data, w, h } = await pixels(png);
  const [r0, g0, b0] = parseHex(hex);
  let n = 0, hit = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (inside && !inBox(inside, x, y, w, h)) continue;
    const i = (y * w + x) * 3;
    const d = Math.hypot(data[i] - r0, data[i + 1] - g0, data[i + 2] - b0);
    n++; if (d <= tol) hit++;
  }
  return (hit / n).toFixed(4);
}

export async function mean(png, box) {
  const { data, w, h } = await pixels(png);
  const s = [0, 0, 0];
  let n = 0;
  for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
    if (!inBox(box, x, y, w, h)) continue;
    const i = (y * w + x) * 3;
    s[0] += data[i]; s[1] += data[i + 1]; s[2] += data[i + 2]; n++;
  }
  return "#" + s.map((v) => Math.round(v / n).toString(16).padStart(2, "0")).join("");
}

export async function black(png) {
  const { data, w, h } = await pixels(png);
  let n = 0, dark = 0;
  for (let i = 0; i < w * h * 3; i += 3) {
    n++;
    if (data[i] <= 12 && data[i + 1] <= 12 && data[i + 2] <= 12) dark++;
  }
  return (dark / n).toFixed(4);
}

export async function diff(a, b, not = null) {
  const A = await pixels(a);
  let B = await pixels(b);
  if (B.w !== A.w || B.h !== A.h) {
    const { data, info } = await sharp(b).removeAlpha().resize(A.w, A.h).raw().toBuffer({ resolveWithObject: true });
    B = { data, w: info.width, h: info.height };
  }
  let n = 0, sum = 0;
  for (let y = 0; y < A.h; y++) for (let x = 0; x < A.w; x++) {
    if (not && inBox(not, x, y, A.w, A.h)) continue;
    const i = (y * A.w + x) * 3;
    sum += Math.abs(A.data[i] - B.data[i]) + Math.abs(A.data[i + 1] - B.data[i + 1]) + Math.abs(A.data[i + 2] - B.data[i + 2]);
    n++;
  }
  return (sum / (3 * n)).toFixed(2);
}

export async function boxes(times) {
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

const fmtBox = (b) => (b ? b.map((v) => v.toFixed(3)).join(",") : "null");

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  const [mode, ...args] = process.argv.slice(2);
  if (mode === "stat") {
    console.log(JSON.stringify(await stat(args[0], flag(args, "--not"), flag(args, "--in"))));
  } else if (mode === "near") {
    const [png, hex, tol] = args;
    console.log(await near(png, hex, Number(tol), flag(args, "--in")));
  } else if (mode === "mean") {
    console.log(await mean(args[0], parseBox(args[1])));
  } else if (mode === "black") {
    console.log(await black(args[0]));
  } else if (mode === "diff") {
    console.log(await diff(args[0], args[1], flag(args, "--not")));
  } else if (mode === "box") {
    const times = (args[0] ?? "0").split(",").map(Number);
    console.log("t\tplayer");
    for (const r of await boxes(times)) console.log(`${r.t}\t${fmtBox(r.player)}`);
  } else {
    console.error("usage: probe.mjs stat|near|mean|black|diff|box ...");
    process.exit(2);
  }
}
