// node lib/anime/tools/cuts/p-tangle/livecam.mjs [seconds=34]: samples the LIVE camera, the seal, the comic beat, the impact frame, the SFX and the wash quad
// on every animation frame in real Chrome (evilseal.si, spawn p-tangle, __replay), in the rig frame (rig = Ry(-TURN) * (p - seal)), into livecam.json beside this file.
import { writeFileSync } from "node:fs";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";

const ID = "p-tangle";
const secs = Number(process.argv[2] ?? 34);
const OUT = new URL("./livecam.json", import.meta.url);
const WINDOWS = { isl: [0.0, 0.15], pullMid: [0.65, 0.75], wide: [1.42, 1.58], pushMid: [2.2, 2.4], a: [3.2, 8.4], flip: [8.75, 9.05], b1: [9.4, 13.4], b2: [13.95, 14.95], b3: [16.5, 22.0], b4: [23.0, 27.5], home: [28.45, 28.6] };
const TURN = 0.4883339510;

const raw = await withGpuLock(`livecam ${ID}`, async () => {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(`https://evilseal.si/?play&spawn=${ID}&debug`, { waitUntil: "load", timeout: 180000 });
    await page.waitForFunction(() => window.__world && window.__replay, null, { timeout: 180000 });
    await page.waitForTimeout(6000);
    return await page.evaluate(
      ([secs]) =>
        new Promise((resolve) => {
          try { sessionStorage.removeItem("seal:seen"); } catch {}
          const out = [];
          let diag = null;
          let washMesh = null;
          const t0 = performance.now();
          window.__replay("p-tangle");
          const step = () => {
            const w = window.__world;
            const c = w?.camera;
            const s = w?.live?.seal;
            const t = (performance.now() - t0) / 1000;
            if (!diag && w?.live) diag = { live: Object.keys(w.live), sealKeys: s && typeof s === "object" ? Object.keys(s) : null, sealNumbers: s && typeof s === "object" ? Object.fromEntries(Object.entries(s).filter(([, v]) => typeof v === "number")) : null };
            if (!washMesh && w?.scene) w.scene.traverse((o) => { if (!washMesh && o.renderOrder === 40 && o.material) washMesh = o; });
            const wash = washMesh ? (washMesh.material.opacity ?? washMesh.material.uniforms?.uA?.value ?? null) : null;
            const beat = document.querySelector(".comic")?.dataset.beat ?? null;
            const impact = !!document.querySelector(".comic-impact");
            const sfx = !!document.querySelector(".comic-sfx");
            if (c) out.push({ t, p: [c.position.x, c.position.y, c.position.z], q: [c.quaternion.x, c.quaternion.y, c.quaternion.z, c.quaternion.w], fov: c.fov, up: [c.up.x, c.up.y, c.up.z], seal: s ? [s.x, s.z] : null, beat, impact, sfx, wash });
            if (t < secs) requestAnimationFrame(step);
            else resolve({ out, diag });
          };
          requestAnimationFrame(step);
        }),
      [secs],
    );
  } finally {
    await browser.close();
  }
});

const RAW = new URL("file:///" + process.env.SCRATCH + "/livecam-raw.json");
writeFileSync(RAW, JSON.stringify(raw));
const samples = raw.out.filter((s) => s.seal);
console.log("samples", raw.out.length, "with seal", samples.length, "diag", JSON.stringify(raw.diag));
if (!samples.length) process.exit(1);

const median = (xs) => { const a = [...xs].sort((p, q) => p - q); return a.length ? a[Math.floor(a.length / 2)] : null; };
const med3 = (rows) => [0, 1, 2].map((k) => median(rows.map((r) => r[k])));
const norm = (v) => { const l = Math.hypot(...v) || 1; return v.map((x) => x / l); };
const fwd = (q) => {
  const [qx, qy, qz, qw] = q;
  const v = [0, 0, -1];
  const t = [2 * (qy * v[2] - qz * v[1]), 2 * (qz * v[0] - qx * v[2]), 2 * (qx * v[1] - qy * v[0])];
  const c = [qy * t[2] - qz * t[1], qz * t[0] - qx * t[2], qx * t[1] - qy * t[0]];
  return [0, 1, 2].map((k) => v[k] + qw * t[k] + c[k]);
};
const ry = (a, [x, y, z]) => [x * Math.cos(a) + z * Math.sin(a), y, -x * Math.sin(a) + z * Math.cos(a)];
const rest = [median(samples.filter((s) => s.t >= 0.6 && s.t <= 1.1).map((s) => s.seal[0])), median(samples.filter((s) => s.t >= 0.6 && s.t <= 1.1).map((s) => s.seal[1]))];
const rigSamples = samples.map((s) => ({ t: s.t, p: ry(-TURN, [s.p[0] - s.seal[0], s.p[1], s.p[2] - s.seal[1]]), f: norm(ry(-TURN, fwd(s.q))), fov: s.fov, up: ry(-TURN, s.up) }));

const maxStep = (rows) => rows.reduce((m, r, i) => (i ? Math.max(m, Math.hypot(...r.p.map((v, k) => v - rows[i - 1].p[k]))) : m), 0);
const stats = (rows) => {
  if (!rows.length) return { n: 0 };
  const f = norm(med3(rows.map((r) => r.f)));
  return { n: rows.length, step: +maxStep(rows).toFixed(3), eye: med3(rows.map((r) => r.p)).map((v) => +v.toFixed(4)), fwd: f.map((v) => +v.toFixed(4)), fov: +median(rows.map((r) => r.fov)).toFixed(3), up: norm(med3(rows.map((r) => r.up))).map((v) => +v.toFixed(4)), pitchDeg: +((Math.asin(f[1]) * 180) / Math.PI).toFixed(2) };
};
const windows = {};
for (const [name, [a, b]] of Object.entries(WINDOWS)) windows[name] = stats(rigSamples.filter((s) => s.t >= a && s.t < b));
const LENS = Object.fromEntries(Object.entries(windows).filter(([, v]) => v.n >= 8).map(([k, v]) => [k, [v.eye, v.fwd, v.fov]]));

const transitions = (key) => {
  const marks = [];
  let prev;
  for (const s of raw.out) {
    const v = s[key];
    if (v !== prev) marks.push({ t: +s.t.toFixed(3), v });
    prev = v;
  }
  return marks;
};
const washRise = raw.out.find((s) => s.wash !== null && s.wash > 0.01)?.t ?? null;
const washPeak = raw.out.find((s) => s.wash !== null && s.wash >= 0.98)?.t ?? null;
const washClear = washPeak === null ? null : raw.out.find((s) => s.t > washPeak && s.wash !== null && s.wash < 0.01)?.t ?? null;
const stamps = {
  beat: transitions("beat"),
  impact: transitions("impact"),
  sfx: transitions("sfx"),
  wash: { rise: washRise, peak: washPeak, clear: washClear, seen: raw.out.some((s) => s.wash !== null) },
};
const sfxSeen = raw.out.some((s) => s.sfx);
const out = { id: ID, secs, samples: samples.length, rest: rest.map((v) => +v.toFixed(4)), TURN, FOV: windows.a?.fov ?? null, windows, LENS, stamps, sfxSeen, diag: raw.diag };
writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
console.log(JSON.stringify({ FOV: out.FOV, counts: Object.fromEntries(Object.entries(windows).map(([k, v]) => [k, v.n])), steps: Object.fromEntries(Object.entries(windows).map(([k, v]) => [k, v.step])), wash: stamps.wash, sfxSeen, beat: stamps.beat.slice(0, 20) }));
