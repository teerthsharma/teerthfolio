// node scripts/accept-run.mjs <dock> [--base URL] | --all : scores a dock's engine stills against lib/anime/accept/<dock>.json
// and writes verification/accept/<dock>.json for scripts/issues-checklist.mjs. The scoring layer is pure; playwright and sharp
// load only inside the driver, so importing this file never needs them.
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { darkFrac, hueMedian, hueOf, hueShare, lumaY, maxY, notan, satMean } from "../lib/anime/tools/still-stats.js";
import { discFit, maskFrom } from "../lib/anime/tools/region-stats.js";
import { labUrl } from "./lab-url.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACCEPT_DIR = path.join(ROOT, "lib/anime/accept");
const OUT_DIR = path.join(ROOT, "verification/accept");
const DEFAULT_BASE = "http://localhost:3801";
const SETTLE_MS = 30000;

const NOT_RUN_NOTE = "needs a named region or a second still";
const NOT_RUN_KINDS = new Set(["regionCover", "regionBox", "regionCount", "lumaRatio", "frozen", "custom"]);
const RANK = { pass: 0, not_run: 1, fail: 2 };
const S_DEFAULT = 0.25;
const V_DEFAULT = 0.08;

const r4 = (x) => Math.round(x * 1e4) / 1e4;
const wrap180 = (x) => ((((x + 180) % 360) + 360) % 360) - 180;
const inWindow = (h, lo, hi) => (lo <= hi ? h >= lo && h <= hi : h >= lo || h <= hi);
const within = (v, [lo, hi]) => v >= lo && v <= hi;
const withinBounds = (v, t) => (t.min == null || v >= t.min) && (t.max == null || v <= t.max);
const bounds = (t) => `${t.min ?? "-"} to ${t.max ?? "-"}`;
const normWhere = (where) => ({ sMin: where?.sMin ?? S_DEFAULT, vMin: where?.vMin ?? V_DEFAULT });

function satMedian(rgba, w, h) {
  const s = new Float64Array(w * h);
  for (let i = 0; i < w * h; i++) s[i] = hueOf(rgba[i * 4], rgba[i * 4 + 1], rgba[i * 4 + 2]).s;
  s.sort();
  const m = s.length >> 1;
  return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
}

export function scoreTest(test, ctx) {
  const out = (status, measured, expected, note = "") => ({
    id: test.id,
    t: ctx?.t ?? null,
    kind: test.kind,
    status,
    measured: measured ?? null,
    expected: expected ?? null,
    note,
  });
  if (!ctx) return out("not_run", null, null, "no still at this time");
  const { rgba, w, h } = ctx;
  const verdict = (ok) => (ok ? "pass" : "fail");

  switch (test.kind) {
    case "lumaCap": {
      const m = r4(maxY(rgba, w, h));
      return out(verdict(m <= test.max), m, `<= ${test.max}`);
    }
    case "inkFloor": {
      const m = r4(darkFrac(rgba, w, h, { min: test.min, grid: test.grid }));
      return out(verdict(m === 0), m, "== 0 dark cells");
    }
    case "notan": {
      const [a, b] = test.thresholds;
      const got = notan(rgba, w, h, a, b).map(r4);
      const ok = got.every((g, i) => Math.abs(g - test.target[i]) <= test.tol);
      return out(verdict(ok), got, `${test.target.join("/")} +/- ${test.tol} pts`);
    }
    case "lumaShare": {
      if (test.yAbove === undefined && test.yBelow === undefined) {
        return out("not_run", null, null, "lumaShare needs yAbove or yBelow");
      }
      const share =
        test.yAbove !== undefined
          ? notan(rgba, w, h, test.yAbove, test.yAbove)[2] / 100
          : notan(rgba, w, h, test.yBelow, test.yBelow)[0] / 100;
      const m = r4(share);
      return out(verdict(withinBounds(m, test)), m, bounds(test));
    }
    case "hueShare": {
      const where = normWhere(test.where);
      const parts = (test.windows ?? []).map(([lo, hi]) => hueShare(rgba, w, h, { lo, hi, ...where }).share);
      const m = r4(parts.reduce((s, x) => s + x, 0));
      return out(verdict(withinBounds(m, test)), m, bounds(test));
    }
    case "hueMedian": {
      const hasRange = Array.isArray(test.range);
      if (!hasRange && (test.centre == null || test.within == null)) {
        return out("not_run", null, null, "hueMedian needs range, or centre and within");
      }
      const expected = hasRange ? `${test.range[0]} to ${test.range[1]}` : `${test.centre} +/- ${test.within}`;
      const med = hueMedian(rgba, w, h, normWhere(test.where));
      if (med === null) return out("fail", null, expected, "no pixels pass where");
      const m = r4(med);
      const ok = hasRange ? inWindow(m, test.range[0], test.range[1]) : Math.abs(wrap180(m - test.centre)) <= test.within;
      return out(verdict(ok), m, expected);
    }
    case "satStat": {
      if (test.stat !== "mean" && test.stat !== "median") {
        return out("not_run", null, null, "satStat needs stat mean or median");
      }
      const m = r4(test.stat === "median" ? satMedian(rgba, w, h) : satMean(rgba, w, h));
      return out(verdict(withinBounds(m, test)), m, bounds(test));
    }
    case "regionDisc": {
      const yBelow = test.mask?.yBelow;
      if (yBelow === undefined) return out("not_run", null, null, "regionDisc needs mask.yBelow");
      const mask = maskFrom(rgba, w, h, 4, (d, o) => lumaY(d[o], d[o + 1], d[o + 2]) < yBelow);
      const fit = discFit(mask, w, h);
      const countOk = test.count === undefined || fit.count === test.count;
      const diamOk = !test.diameterH || (fit.count > 0 && within(fit.diameterH, test.diameterH));
      const centreOk =
        !test.centre ||
        (fit.centre !== null &&
          Math.hypot(fit.centre[0] - test.centre[0], fit.centre[1] - test.centre[1]) <= (test.tol ?? 0));
      const measured = { count: fit.count, diameterH: r4(fit.diameterH), centre: fit.centre && fit.centre.map(r4) };
      const expected = { count: test.count, diameterH: test.diameterH, centre: test.centre, tol: test.tol ?? 0 };
      return out(verdict(countOk && diamOk && centreOk), measured, expected);
    }
    default:
      if (NOT_RUN_KINDS.has(test.kind)) return out("not_run", null, null, NOT_RUN_NOTE);
      return out("not_run", null, null, `unknown kind ${test.kind}`);
  }
}

const scoreAt = (test, ctx, t) => ({ ...scoreTest(test, ctx ? { ...ctx, t } : null), t });

export function scoreDock(accept, stillsByTime) {
  const ctxAt = (t) => (stillsByTime instanceof Map ? stillsByTime.get(t) : stillsByTime?.[t]) ?? null;
  const stills = accept.stills ?? [];
  const results = [];
  for (const still of stills) {
    for (const test of still.tests ?? []) results.push(scoreAt(test, ctxAt(still.t), still.t));
  }
  for (const test of accept.every ?? []) {
    for (const still of stills) results.push(scoreAt(test, ctxAt(still.t), still.t));
  }
  return results;
}

function collapse(results) {
  const groups = new Map();
  for (const r of results) groups.set(r.id, [...(groups.get(r.id) ?? []), r]);
  return [...groups].map(([id, rs]) => {
    const machine = rs.filter((r) => r.kind !== "custom");
    if (!machine.length) return { id, t: null, status: "not_run", measured: null, expected: null, note: "owner check only" };
    const worst = machine.reduce((a, b) => (RANK[b.status] > RANK[a.status] ? b : a));
    const note = worst.status === "pass" ? `${machine.length} of ${machine.length} machine tests pass` : worst.note;
    return { id, t: worst.t, status: worst.status, measured: worst.measured, expected: worst.expected, note };
  });
}

export function buildResultFile(accept, results, meta = {}) {
  return {
    dock: accept.dock,
    issue: accept.issue,
    sha: meta.sha ?? "unknown",
    adapter: meta.adapter ?? "unknown",
    results: collapse(results),
  };
}

function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function acceptDocks() {
  return readdirSync(ACCEPT_DIR)
    .filter((f) => f.endsWith(".json") && !f.startsWith("_"))
    .map((f) => f.replace(/\.json$/, ""))
    .sort();
}

function readAccept(dock) {
  return JSON.parse(readFileSync(path.join(ACCEPT_DIR, `${dock}.json`), "utf8"));
}

const adapterName = () => {
  try {
    const gl = document.createElement("canvas").getContext("webgl2");
    const ext = gl && gl.getExtension("WEBGL_debug_renderer_info");
    return ext ? String(gl.getParameter(ext.UNMASKED_RENDERER_WEBGL)) : "unknown";
  } catch {
    return "unknown";
  }
};

async function settle(page, grabName) {
  const deadline = Date.now() + SETTLE_MS;
  let prev = null;
  for (;;) {
    const probe = await page.evaluate((name) => {
      const cut = window.__cut;
      if (!cut) return { ready: false };
      if (typeof cut[name] !== "function") return { ready: true, missing: true };
      return { ready: true, shot: cut[name]() };
    }, grabName);
    if (probe.missing) return null;
    if (probe.shot && probe.shot.png === prev) return probe.shot;
    prev = probe.shot?.png ?? null;
    if (Date.now() > deadline) throw new Error(`frame did not settle within ${SETTLE_MS / 1000} s`);
    await page.waitForTimeout(250);
  }
}

async function decode(sharp, png) {
  const bytes = Buffer.from(png.slice(png.indexOf(",") + 1), "base64");
  const { data, info } = await sharp(bytes).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
  return { rgba: new Uint8Array(data.buffer, data.byteOffset, data.byteLength), w: info.width, h: info.height, bytes };
}

function idsOf(rgba, w, h) {
  const ids = new Uint8Array(w * h);
  for (let i = 0; i < w * h; i++) ids[i] = rgba[i * 4];
  return ids;
}

async function captureDock(browser, sharp, dock, base, times) {
  const page = await browser.newPage({ viewport: { width: 1280, height: 720 } });
  const dir = path.join(OUT_DIR, dock);
  mkdirSync(dir, { recursive: true });
  const stills = new Map();
  let adapter = "unknown";
  const open = (t, view) =>
    page.goto(labUrl(base, dock, `t=${t}&paused${view ? `&view=${view}` : ""}`), {
      waitUntil: "load",
      timeout: 60000,
    });
  try {
    for (const t of times) {
      try {
        await open(t);
        if (adapter === "unknown") adapter = await page.evaluate(adapterName);
        const full = await decode(sharp, (await settle(page, "grab")).png);
        writeFileSync(path.join(dir, `${t}.png`), full.bytes);
        await open(t, "ids");
        const idShot = await settle(page, "grabIds");
        let ids = null;
        if (idShot) {
          const idImg = await decode(sharp, idShot.png);
          ids = idsOf(idImg.rgba, idImg.w, idImg.h);
        }
        stills.set(t, { rgba: full.rgba, w: full.w, h: full.h, ids });
      } catch (err) {
        console.log(`error ${dock} t=${t}: ${err.message}`);
      }
    }
  } finally {
    await page.close();
  }
  return { stills, adapter };
}

async function runDock(browser, sharp, dock, base, sha) {
  const accept = readAccept(dock);
  const times = [...new Set((accept.stills ?? []).map((s) => s.t))];
  let captured = { stills: new Map(), adapter: "unknown" };
  try {
    captured = await captureDock(browser, sharp, dock, base, times);
  } catch (err) {
    console.log(`error ${dock}: ${err.message}`);
  }
  const results = scoreDock(accept, captured.stills);
  const file = buildResultFile(accept, results, { sha, adapter: captured.adapter });
  mkdirSync(OUT_DIR, { recursive: true });
  const outPath = path.join(OUT_DIR, `${dock}.json`);
  writeFileSync(outPath, `${JSON.stringify(file, null, 2)}\n`);
  for (const r of results) console.log(`${r.status} ${r.id} ${r.kind} ${JSON.stringify(r.measured)}`);
  console.log(`wrote ${path.relative(ROOT, outPath)}`);
}

async function main(argv) {
  const args = argv.slice(2);
  const bi = args.indexOf("--base");
  const base = bi >= 0 && args[bi + 1] ? args[bi + 1] : DEFAULT_BASE;
  const positional = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--base") {
      i++;
      continue;
    }
    if (!args[i].startsWith("--")) positional.push(args[i]);
  }
  const docks = args.includes("--all") ? acceptDocks() : positional.slice(0, 1);
  if (!docks.length) {
    console.log("usage: node scripts/accept-run.mjs <dock> [--base URL] | --all");
    return;
  }
  const sha = gitSha();
  const { chromium } = await import("playwright");
  const sharp = (await import("sharp")).default;
  const browser = await chromium.launch();
  try {
    for (const dock of docks) await runDock(browser, sharp, dock, base, sha);
  } finally {
    await browser.close();
  }
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv).catch((err) => console.log(`accept-run: ${err.message}`));
}
