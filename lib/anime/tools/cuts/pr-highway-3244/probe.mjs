// PROBE for pr-highway-3244: node probe.mjs portdiff | strip <dir> <tag> <t,...> | inframe <verify.json> <t0> <t1> <min> | vig <ours.png> <live.png> | flings | fist
// Exit 0 on PASS, 1 on FAIL. portdiff compares the live move's files with live/ after comments and imports are dropped.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(HERE, "../../../../..");
const LIVE_MOVE = path.join(ROOT, "components/world/cutscene/moves/pr-highway-3244");
const MINE = path.join(ROOT, "lib/anime/cutscenes/pr-highway-3244/live");
const FILES = ["shade", "path", "car", "iskandar", "land", "fx"];
const ALLOW = ["0.99", "premultipliedAlpha", "plateDepth", "rgb * a", ", 0.0)", "* a", "float a =", "* 0.55", "uGain"];
const ALPHA_OLD = /1\.0|vA|alpha|0\.55/;
const done = (ok, text) => { console.log(`${text} | ${ok ? "PASS" : "FAIL"}`); process.exit(ok ? 0 : 1); };

export function normal(src) {
  const lines = src.replace(/\/\*[\s\S]*?\*\//g, "").split(/\r?\n/);
  const out = [];
  let inImport = false;
  for (const raw of lines) {
    const line = raw.replace(/(^|\s)\/\/.*$/, "").replace(/\s+/g, " ").trim();
    if (inImport) { if (/\bfrom\b/.test(line)) inImport = false; continue; }
    if (/^import[\s{*]/.test(line)) { inImport = !/\bfrom\b/.test(line); continue; }
    if (line === "") continue;
    out.push(line);
  }
  return out;
}

export function diff(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const ops = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { ops.push(["same", a[i]]); i++; j++; }
    else if (dp[i + 1][j] >= dp[i][j + 1]) ops.push(["live", a[i++]]);
    else ops.push(["mine", b[j++]]);
  }
  while (i < n) ops.push(["live", a[i++]]);
  while (j < m) ops.push(["mine", b[j++]]);
  return ops;
}

export function hunks(ops) {
  const out = [];
  let cur = [];
  for (const [kind, text] of ops) {
    if (kind === "same") { if (cur.length) out.push(cur); cur = []; } else cur.push([kind, text]);
  }
  if (cur.length) out.push(cur);
  return out;
}

export function explained(hunk) {
  const mine = hunk.filter(([k]) => k === "mine").map(([, t]) => t);
  const live = hunk.filter(([k]) => k === "live").map(([, t]) => t);
  const token = (t) => ALLOW.some((tok) => t.includes(tok));
  if (mine.length) return mine.every(token) && live.every((t) => ALPHA_OLD.test(t));
  return live.every(token);
}

async function pixels(file) {
  const { data, info } = await sharp(file).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  return { data, W: info.width, H: info.height, C: info.channels };
}

function boxMean(img, [x0, y0, x1, y1]) {
  const sum = [0, 0, 0];
  let n = 0;
  for (let y = Math.floor(y0 * img.H); y < Math.ceil(y1 * img.H); y++) for (let x = Math.floor(x0 * img.W); x < Math.ceil(x1 * img.W); x++) {
    const o = (y * img.W + x) * img.C;
    sum[0] += img.data[o]; sum[1] += img.data[o + 1]; sum[2] += img.data[o + 2];
    n++;
  }
  return n ? sum.map((s) => s / n) : [0, 0, 0];
}
const luma = (rgb) => 0.2126 * rgb[0] + 0.7152 * rgb[1] + 0.0722 * rgb[2];

const [mode, ...a] = process.argv.slice(2);

if (mode === "portdiff") {
  let total = 0, bad = 0;
  for (const f of FILES) {
    const A = normal(readFileSync(path.join(LIVE_MOVE, `${f}.js`), "utf8"));
    const B = normal(readFileSync(path.join(MINE, `${f}.js`), "utf8"));
    for (const h of hunks(diff(A, B))) {
      const ok = explained(h);
      total += h.length;
      if (!ok) bad++;
      for (const [side, text] of h) console.log(`${ok ? "allowed " : "UNEXPLAINED"} ${f}.js ${side === "live" ? "-" : "+"} ${text}`);
    }
  }
  done(bad === 0, `PORTDIFF ${total} differing lines in ${FILES.length} files, ${bad} unexplained hunks`);
}

if (mode === "strip") {
  const [dir, tag, list] = a;
  const ts = list.split(",");
  const imgs = [];
  for (const t of ts) imgs.push(await pixels(path.join(dir, `${tag}-pr-highway-3244-${t}.png`)));
  let worst = Infinity, failed = 0;
  for (let k = 1; k < imgs.length; k++) {
    const p = imgs[k - 1].data, q = imgs[k].data;
    let s = 0;
    for (let i = 0; i < p.length; i++) s += Math.abs(p[i] - q[i]);
    const mean = s / p.length;
    worst = Math.min(worst, mean);
    if (mean < 6) failed++;
    console.log(`${ts[k - 1]} -> ${ts[k]}: mean abs RGB difference ${mean.toFixed(2)}`);
  }
  done(failed === 0, `STRIP ${ts.length} stills, smallest step ${worst.toFixed(2)} (need 6 each)`);
}

if (mode === "inframe") {
  const [file, t0, t1, min] = [a[0], Number(a[1]), Number(a[2]), Number(a[3])];
  const S = JSON.parse(readFileSync(file, "utf8")).samples.filter((s) => s.t >= t0 && s.t <= t1);
  const inside = (s) => s.box && s.box[0] >= 0.01 && s.box[1] >= 0.01 && s.box[2] <= 0.99 && s.box[3] <= 0.99;
  const share = S.length ? S.filter(inside).length / S.length : 0;
  done(share >= min, `INFRAME ${share.toFixed(4)} over ${S.length} samples in ${t0}-${t1} s (need ${min})`);
}

if (mode === "vig") {
  const [ours, live] = a;
  const corners = (img) => {
    const boxes = [[0, 0, 0.08, 0.08], [0.92, 0, 1, 0.08], [0, 0.92, 0.08, 1], [0.92, 0.92, 1, 1]];
    const m = boxes.map((b) => luma(boxMean(img, b)));
    return m.reduce((s, v) => s + v, 0) / m.length;
  };
  const centre = (img) => luma(boxMean(img, [0.4, 0.4, 0.6, 0.6]));
  const ro = corners(await pixels(ours)) / centre(await pixels(ours));
  const rl = corners(await pixels(live)) / centre(await pixels(live));
  const d = Math.abs(ro - rl);
  console.log(`ours corner/centre luma ${ro.toFixed(3)}, live ${rl.toFixed(3)}`);
  done(d <= 0.05, `VIG difference ${d.toFixed(3)} (need 0.05 or less)`);
}

const vsub = (p, q) => [p[0] - q[0], p[1] - q[1], p[2] - q[2]];
const vdot = (p, q) => p[0] * q[0] + p[1] * q[1] + p[2] * q[2];
const vnorm = (p) => { const l = Math.hypot(...p); return p.map((v) => v / l); };
const vcross = (p, q) => [p[1] * q[2] - p[2] * q[1], p[2] * q[0] - p[0] * q[2], p[0] * q[1] - p[1] * q[0]];
// NDC x, y and depth of a rig-frame point through a held lens (vertical fov, 16/9); the same projection as fx/hits.js centre
const ndc = ({ eye, aim, fov }, p) => {
  const f = vnorm(vsub(aim, eye)), r = vnorm(vcross(f, [0, 1, 0])), u = vcross(r, f);
  const d = vsub(p, eye), z = vdot(d, f), k = Math.tan((fov * Math.PI) / 360);
  return [vdot(d, r) / (z * k * (16 / 9)), vdot(d, u) / (z * k), z];
};

if (mode === "flings") {
  const { heroState, rivalState, BETA } = await import("../../../cutscenes/pr-highway-3244/race.js");
  const { FLING, rotY } = await import("../../../cutscenes/pr-highway-3244/clock.js");
  const { RACE2 } = await import("../../../cutscenes/pr-highway-3244/lens.js");
  const STRUCK = [7, 3, 0, 6, 2];
  const rows = [];
  FLING.forEach((tf, k) => {
    for (const dt of [0.06, 0.2]) {
      const t = tf + dt, h = heroState(t), r = rivalState(STRUCK[k], t), q = rotY(BETA, [r.x, r.y, r.z]);
      const [x, y, z] = ndc(RACE2, [q[0] + h.trackX, q[1] + h.trackY, q[2] + h.trackZ]);
      rows.push({ k, dt, x, y, z, ok: z > 0 && Math.abs(x) < 0.9 && Math.abs(y) < 0.9 });
      console.log(`fling ${k + 1} rival ${STRUCK[k]} at +${dt}: ndc x ${x.toFixed(3)}, y ${y.toFixed(3)}, depth ${z.toFixed(2)}`);
    }
  });
  done(rows.every((r) => r.ok), `FLINGS ${rows.filter((r) => r.ok).length}/${rows.length} inside the frame`);
}

if (mode === "fist") {
  const { heroState, seatFacing, sealRig } = await import("../../../cutscenes/pr-highway-3244/race.js");
  const { FIST } = await import("../../../cutscenes/pr-highway-3244/lens.js");
  const tc = 19.0, py = seatFacing(tc);
  if (py === null) done(false, "FIST seatFacing(19) is null");
  const pup = sealRig(tc), h = heroState(tc), nose = [Math.sin(py), 0, Math.cos(py)];
  const rows = FIST.rots.map((rot) => {
    const a = py + rot, eye = [pup[0] + FIST.dist * Math.sin(a), pup[1] + FIST.up, pup[2] + FIST.dist * Math.cos(a)];
    const facing = vdot(nose, vnorm(vsub(eye, pup))), away = Math.hypot(...vsub(eye, [h.x, h.y, h.z]));
    return { rot, facing, away, ok: facing >= 0.5 && away >= 2.5 };
  });
  for (const r of rows) console.log(`rot ${r.rot}: facing ${r.facing.toFixed(3)} (need 0.5), eye to chariot ${r.away.toFixed(2)} m (need 2.5)${r.ok ? " ok" : ""}`);
  const first = rows.find((r) => r.ok)?.rot ?? null, chosen = rows.find((r) => r.rot === FIST.rot);
  done(Boolean(chosen?.ok) && chosen.rot === first, `FIST rot ${FIST.rot}, first passing rot ${first}`);
}

console.error("usage: probe.mjs portdiff | strip <dir> <tag> <t,...> | inframe <verify.json> <t0> <t1> <min> | vig <ours.png> <live.png> | flings | fist");
process.exit(2);
