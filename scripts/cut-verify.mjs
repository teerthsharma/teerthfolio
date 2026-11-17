/* global window, document */
// node scripts/cut-verify.mjs <dock> [--port 3811] [--out <dir>] [--step 0.5] : one dock end to end, PASS / WARN / FAIL / NOT RUN
// per rule, also in <out>/verify-<dock>.json; exit 1 on any FAIL or NOT RUN. timing.check.mjs exports nothing, so it runs as a child.
import { execFile } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import sharp from "sharp";
import { contactSheet, launchChrome } from "./cut-cap.mjs";
import { withGpuLock } from "./cut-lock.mjs";
import { cutUrl } from "./cut-serve.mjs";
import { lumaY } from "../lib/anime/tools/still-stats.js";

// every threshold in one place; callsWarn and trisWarn are placeholders the lead tunes
const LIMITS = { callsWarn: 60, trisWarn: 250000, boxMinH: 0.05, blackFail: 0.01, blackLevel: 4, lumaP: 0.999, lumaWarn: 0.93, greySatWarn: 0.08, emptyWarn: 0.85, emptyLevels: 6, pixelSamples: 12, barRowBlack: 0.995, barMaxH: 0.25, settleMs: 900, loadMs: 120000 };
const TIMING = { length: "no shot longer than 5 s", tiling: "shots tile the duration from 0", cue: "beats end before the end", fps: "fps is 8, 12 or 24" };
const SHADER = /Shader Error|shader (compile|link)|VALIDATE_STATUS|LINK_STATUS|COMPILE_STATUS|Program Info Log|ERROR: \d+:\d+/i;
const W = 1280, H = 720;
const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = promisify(execFile);

const args = process.argv.slice(2);
const opt = (name, def) => { const i = args.indexOf(name); return i >= 0 && args[i + 1] ? args[i + 1] : def; };
const dock = args.find((a, i) => !a.startsWith("--") && !(i && args[i - 1].startsWith("--")));
const port = opt("--port", "3811"), step = Number(opt("--step", "0.5"));
const out = path.resolve(opt("--out", path.join(ROOT, "verification/cut", dock ?? "_")));

const r3 = (x) => Math.round(x * 1000) / 1000;
const f = (x, d = 3) => Number(x).toFixed(d);
const pct = (x) => `${(100 * x).toFixed(2)} %`;
const first = (s) => String(s ?? "").split(/\r?\n/).find((l) => l.trim()) ?? "";
const list = (xs, n = 6) => xs.slice(0, n).join(", ") + (xs.length > n ? ` (+${xs.length - n} more)` : "");

async function timingRules() {
  const keys = Object.keys(TIMING);
  const all = (status, detail) => keys.map((k) => ({ id: `timing.${k}`, status, detail }));
  let stdout;
  try { ({ stdout } = await run(process.execPath, [path.join(ROOT, "lib/anime/cutscenes/timing.check.mjs"), "--report"], { cwd: ROOT })); }
  catch (e) { return all("NOT RUN", `timing.check.mjs failed: ${first(e.stderr || e.message)}`); }
  const line = stdout.split(/\r?\n/).find((l) => l === `ok ${dock}` || l.startsWith(`FAIL ${dock}: `));
  if (!line) return all("NOT RUN", `${dock} is not in DOCKS (lib/anime/cutscenes/index.js), so timing.check.mjs did not check it`);
  const fails = line.startsWith("FAIL") ? line.slice(`FAIL ${dock}: `.length).split("; ") : [];
  const load = fails.find((x) => x.startsWith("load "));
  if (load) return all("NOT RUN", `scene.js did not load: ${load.slice(5)}`);
  return keys.map((k) => {
    const mine = fails.filter((x) => x.startsWith(`${k} `)).map((x) => x.slice(k.length + 1));
    return { id: `timing.${k}`, status: mine.length ? "FAIL" : "PASS", detail: mine.length ? `${mine.length}: ${mine.join("; ")}` : TIMING[k] };
  });
}

function stillTimes() {
  try {
    const ts = (JSON.parse(readFileSync(path.join(ROOT, "lib/anime/accept", `${dock}.json`), "utf8")).stills ?? []).map((s) => s.t).filter(Number.isFinite);
    if (ts.length) return { times: [...new Set(ts)], from: `lib/anime/accept/${dock}.json` };
  } catch { /* no acceptance file: the default times */ }
  return { times: [3, 8], from: "default 3 s and 8 s" };
}

async function pixelStats(png) {
  const { data, info } = await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true });
  const w = info.width, h = info.height, L = LIMITS.blackLevel;
  const barRow = (y) => { let n = 0; for (let o = y * w * 3, e = o + w * 3; o < e; o += 3) n += data[o] < L && data[o + 1] < L && data[o + 2] < L; return n >= w * LIMITS.barRowBlack; };
  const cap = Math.floor(h * LIMITS.barMaxH);
  let top = 0, bot = h;
  while (top < cap && barRow(top)) top++;
  while (h - bot < cap && barRow(bot - 1)) bot--;
  const yHist = new Uint32Array(1001), ch = [new Uint32Array(256), new Uint32Array(256), new Uint32Array(256)];
  let n = 0, black = 0, sat = 0, near = 0;
  const o0 = top * w * 3, o1 = bot * w * 3;
  for (let o = o0; o < o1; o += 3) {
    const r = data[o], g = data[o + 1], b = data[o + 2], mx = Math.max(r, g, b);
    black += r < L && g < L && b < L;
    sat += mx ? (mx - Math.min(r, g, b)) / mx : 0;
    yHist[Math.round(lumaY(r, g, b) * 1000)]++;
    ch[0][r]++; ch[1][g]++; ch[2][b]++; n++;
  }
  const quant = (hs, q) => { let acc = 0; for (let i = 0; i < hs.length; i++) if ((acc += hs[i]) >= q * n) return i; return hs.length - 1; };
  const med = ch.map((hs) => quant(hs, 0.5)), E = LIMITS.emptyLevels;
  for (let o = o0; o < o1; o += 3) near += Math.abs(data[o] - med[0]) <= E && Math.abs(data[o + 1] - med[1]) <= E && Math.abs(data[o + 2] - med[2]) <= E;
  return { bars: [top, h - bot], black: black / n, lumaP: quant(yHist, LIMITS.lumaP) / 1000, sat: sat / n, near: near / n, median: med };
}

async function live(m) {
  let at = "load";
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
    page.on("pageerror", (e) => m.log.push({ at, kind: "pageerror", text: String(e?.stack ?? e) }));
    page.on("console", (msg) => { if (msg.type() === "error") m.log.push({ at, kind: SHADER.test(msg.text()) ? "shader" : "console", text: msg.text() }); });
    await page.goto(await cutUrl(dock, "t=0&paused", port), { waitUntil: "load", timeout: 180000 });
    let state = null;
    try { state = await (await page.waitForFunction(() => (window.__cut ? "ok" : document.querySelector("pre") ? "lab" : null), null, { timeout: LIMITS.loadMs })).jsonValue(); } catch { /* timed out */ }
    if (state !== "ok") {
      const text = await page.evaluate(() => document.body?.innerText ?? "").catch(() => "");
      m.reason = state === "lab" ? `the lab shows a failure: ${text.replace(/\s+/g, " ").slice(0, 400)}` : `window.__cut did not appear within ${LIMITS.loadMs / 1000} s${text.trim() ? `; page says: ${text.replace(/\s+/g, " ").slice(0, 300)}` : ""}`;
      return;
    }
    await page.addStyleTag({ content: "nav{display:none!important}" });
    await page.waitForTimeout(LIMITS.settleMs);
    m.init = await page.evaluate(() => { const c = window.__cut; return { duration: c.player.duration, errors: c.player.errors.map((e) => ({ layer: e.layer, message: String(e.message) })), law: c.player.director.report(), stats: c.stats() }; });
    m.started = true;
    const D = m.init.duration;
    for (let i = 0; i * step <= D + 1e-9; i++) m.times.push(r3(i * step));
    m.pixTimes = Array.from({ length: LIMITS.pixelSamples }, (_, i) => r3(((i + 0.5) * D) / LIMITS.pixelSamples));
    m.stillTimes = stillTimes();
    const stillSet = new Set(m.stillTimes.times.filter((t) => t <= D)), pixSet = new Set(m.pixTimes);
    let seen = m.init.errors.length;
    for (const t of [...new Set([...m.times, ...pixSet, ...stillSet])].sort((a, b) => a - b)) {
      at = `${t} s`;
      try {
        const s = await page.evaluate(([t, from]) => {
          const c = window.__cut, info = c.engine.renderer.info;
          info.autoReset = false;
          info.reset();
          let threw = null;
          try { c.seek(t); } catch (e) { threw = String(e?.stack ?? e); }
          return { calls: info.render.calls, tris: info.render.triangles, box: c.player.box && [...c.player.box], programs: info.programs ? info.programs.length : null, errors: c.player.errors.slice(from).map((e) => ({ layer: e.layer, message: String(e.message) })), threw };
        }, [t, seen]);
        seen += s.errors.length;
        m.samples.push({ t, ...s });
        if (!pixSet.has(t) && !stillSet.has(t)) continue;
        await page.waitForTimeout(LIMITS.settleMs);
        const png = await page.screenshot();
        // pixel rules read the engine canvas: the DOM overlay (Skip pill, bubbles) is not engine ink and peaks near 1.0
        if (pixSet.has(t)) { const g = await page.evaluate(() => window.__cut.grab().png); m.pix.push({ t, png, ...(await pixelStats(Buffer.from(g.slice(g.indexOf(",") + 1), "base64"))) }); }
        if (stillSet.has(t)) { const file = path.join(out, `still-${t}.png`); writeFileSync(file, png); m.stills.push(file); }
      } catch (e) { m.missing.push({ t, reason: first(e.message) }); }
    }
    m.end = await page.evaluate(() => window.__cut.stats()).catch(() => null);
  } finally {
    await browser.close();
  }
}

async function acceptRun() {
  const file = path.join(ROOT, "lib/anime/accept", `${dock}.json`);
  if (!existsSync(file)) return { ran: false, lines: [`accept-run: not run, there is no lib/anime/accept/${dock}.json`] };
  try {
    const { stdout } = await run(process.execPath, [path.join(ROOT, "scripts/accept-run.mjs"), dock, "--base", `http://localhost:${port}`], { cwd: ROOT, timeout: 15 * 60e3, maxBuffer: 1 << 24 });
    const lines = stdout.trim().split(/\r?\n/), a = JSON.parse(readFileSync(file, "utf8"));
    // accept-run prints results in scoreDock order without the still time; put the time back when the counts agree
    const order = [...(a.stills ?? []).flatMap((s) => (s.tests ?? []).map(() => s.t)), ...(a.every ?? []).flatMap(() => (a.stills ?? []).map((s) => s.t))];
    const isResult = (l) => /^(pass|fail|not_run) /.test(l);
    let k = 0;
    return { ran: true, lines: lines.filter(isResult).length === order.length ? lines.map((l) => (isResult(l) ? `${l} @ ${order[k++]} s` : l)) : lines };
  } catch (e) { return { ran: false, lines: [`accept-run: could not run: ${first(e.stderr || e.message)}`] }; }
}

function judge(m) {
  const rules = [];
  const R = (id, status, detail, group) => rules.push({ id, status, detail, group });
  const S = m.samples, N = S.length;
  const log = (kind) => m.log.filter((e) => e.kind === kind);
  const shader = log("shader"), pageErr = log("pageerror"), other = [...new Map(log("console").map((e) => [e.text, e])).values()];
  R("page.shader", shader.length ? "FAIL" : "PASS", shader.length ? `${shader.length} shader compile/link error(s), first at ${shader[0].at}; full text below` : "no shader compile or link error in the console", "sweep");
  R("page.errors", pageErr.length ? "FAIL" : "PASS", pageErr.length ? `${pageErr.length} uncaught, first at ${pageErr[0].at}: ${first(pageErr[0].text)}` : "no uncaught page error", "sweep");
  R("page.console", other.length ? "WARN" : "PASS", other.length ? `${other.length} distinct console error(s), first at ${other[0].at}: ${first(other[0].text).slice(0, 160)}` : "no other console error", "sweep");
  const threw = S.filter((s) => s.threw);
  R("frame.seek", threw.length ? "FAIL" : "PASS", threw.length ? `seek threw at ${list(threw.map((s) => `${s.t} s`))}: ${first(threw[0].threw)}` : `${N} seeks, none threw`, "sweep");
  const errs = [...(m.init?.errors ?? []).map((e) => ({ ...e, t: "build" })), ...S.flatMap((s) => s.errors.map((e) => ({ ...e, t: `${s.t} s` })))];
  const layerErrs = errs.filter((e) => e.layer !== "camera"), camErrs = errs.filter((e) => e.layer === "camera");
  R("layers.errors", layerErrs.length ? "FAIL" : "PASS", layerErrs.length ? list(layerErrs.map((e) => `${e.layer} at ${e.t}: ${first(e.message).slice(0, 140)}`), 3) : "player.errors has no layer error", "sweep");
  const law = [...(m.init?.law ?? []), ...camErrs.map((e) => e.message)];
  R("camera.law", law.length ? "WARN" : "PASS", law.length ? list(law, 8) : "director.report() is empty", "sweep");

  let minH = Infinity, minT = null, cropped = 0;
  const boxBad = [];
  for (const s of S) {
    if (!s.box) { boxBad.push(`${s.t} s null`); continue; }
    const [x0, y0, x1, y1] = s.box, vw = Math.min(1, x1) - Math.max(0, x0), vh = Math.min(1, y1) - Math.max(0, y0);
    if (x0 < 0 || y0 < 0 || x1 > 1 || y1 > 1) cropped++;
    if (vw <= 0 || vh <= 0) { boxBad.push(`${s.t} s outside the frame [${s.box.map((v) => f(v, 2))}]`); continue; }
    if (vh < minH) { minH = vh; minT = s.t; }
    if (vh < LIMITS.boxMinH) boxBad.push(`${s.t} s height ${f(vh)}`);
  }
  const boxNote = `smallest visible height ${minT === null ? "n/a" : `${f(minH)} at ${minT} s`}; cropped by the frame edge at ${cropped} of ${N}`;
  R("seal.box", boxBad.length ? "FAIL" : "PASS", boxBad.length ? `${boxBad.length} of ${N} samples: ${list(boxBad)}; ${boxNote}` : `${N} samples in frame, height >= ${LIMITS.boxMinH}; ${boxNote}`, "sweep");

  const peak = (key) => S.reduce((a, s) => (s[key] > (a?.[key] ?? -1) ? s : a), null);
  const median = (key) => { const v = S.map((s) => s[key]).sort((a, b) => a - b); return v[v.length >> 1]; };
  for (const [id, key, lim] of [["draw.calls", "calls", LIMITS.callsWarn], ["draw.triangles", "tris", LIMITS.trisWarn]]) {
    const p = peak(key);
    if (!p) { R(id, "NOT RUN", "no sample", "sweep"); continue; }
    R(id, p[key] > lim ? "WARN" : "PASS", `max ${p[key]} at ${p.t} s (limit ${lim}), median ${median(key)}, over ${N} samples`, "sweep");
  }
  const p0 = S[0]?.programs, pEnd = S[N - 1]?.programs;
  if (!N || p0 == null) R("programs.linked", "NOT RUN", N ? "renderer.info.programs is not available" : "no sample", "sweep");
  else {
    const grew = S.slice(1).map((s, i) => [s, s.programs - S[i].programs]).filter(([, d]) => d > 0).map(([s, d]) => `+${d} at ${s.t} s`);
    R("programs.linked", pEnd > p0 ? "FAIL" : "PASS", pEnd > p0 ? `grew ${p0} -> ${pEnd} during playback: ${list(grew, 8)}` : `${p0} programs after the first sample, ${pEnd} at the end`, "sweep");
  }

  const P = m.pix, worst = (key, dir = 1) => P.reduce((a, p) => (a === null || dir * (p[key] - a[key]) > 0 ? p : a), null);
  const bars = P.filter((p) => p.bars[0] || p.bars[1]).map((p) => `${p.t} s ${p.bars[0]}+${p.bars[1]} px`);
  const pixRule = (id, key, bad, failStatus, label, fmt, dir) => {
    const hit = P.filter((p) => bad(p[key])), w = worst(key, dir);
    R(id, hit.length ? failStatus : "PASS", `${hit.length ? `${hit.length} of ${P.length}: ${list(hit.map((p) => `${p.t} s ${fmt(p[key])}`))}; ` : ""}${label} ${w ? `${fmt(w[key])} at ${w.t} s` : "n/a"}`, "pixels");
  };
  pixRule("pixels.black", "black", (v) => v > LIMITS.blackFail, "FAIL", `worst pure-black share (bars excluded${bars.length ? `: ${list(bars, 3)}` : ""})`, pct, 1);
  pixRule("pixels.luma", "lumaP", (v) => v > LIMITS.lumaWarn, "WARN", "max p99.9 luma", (v) => f(v), 1);
  pixRule("pixels.grey", "sat", (v) => v < LIMITS.greySatWarn, "WARN", `mean saturation over samples ${P.length ? f(P.reduce((a, p) => a + p.sat, 0) / P.length) : "n/a"}, lowest`, (v) => f(v), -1);
  pixRule("pixels.empty", "near", (v) => v > LIMITS.emptyWarn, "WARN", `max share within ${LIMITS.emptyLevels} levels of the median colour`, pct, 1);
  const why = (t) => (t > (m.init?.duration ?? Infinity) ? "past the duration" : m.missing.find((x) => x.t === t)?.reason ?? m.crash ?? "not taken");
  const st = m.stillTimes?.times ?? [], lostStills = st.filter((t) => !m.stills.includes(path.join(out, `still-${t}.png`)));
  R("stills", st.length && !lostStills.length ? "PASS" : "NOT RUN", `${st.length - lostStills.length} of ${st.length} saved (${m.stillTimes?.from ?? "no times"})${lostStills.length ? `; not saved: ${list(lostStills.map((t) => `${t} s ${why(t)}`), 4)}` : ""}`, "stills");

  const takenPix = new Set(P.map((p) => p.t)), lostPix = m.pixTimes.filter((t) => !takenPix.has(t));
  const gap = {
    sweep: !m.started ? m.reason : m.crash ? `the run stopped: ${m.crash}` : m.missing.length ? `${m.missing.length} of ${m.missing.length + N} samples not taken, first at ${m.missing[0].t} s: ${m.missing[0].reason}` : null,
    pixels: !m.started ? m.reason : lostPix.length ? `${lostPix.length} of ${m.pixTimes.length} pixel samples not taken, first at ${lostPix[0]} s: ${why(lostPix[0])}` : null,
    stills: !m.started ? m.reason : null,
  };
  for (const r of rules) if (gap[r.group] && (r.status === "PASS" || r.status === "NOT RUN")) { r.status = "NOT RUN"; r.detail = `${gap[r.group]}${m.started ? ` (measured part: ${r.detail})` : ""}`; }
  return rules;
}

async function main() {
  if (!dock || !(step > 0)) { console.log("usage: node scripts/cut-verify.mjs <dock> [--port 3811] [--out <dir>] [--step 0.5]"); process.exitCode = 1; return; }
  mkdirSync(out, { recursive: true });
  const sha = await run("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT }).then((r) => r.stdout.trim(), () => "unknown");
  const rules = await timingRules();
  const m = { started: false, reason: null, crash: null, times: [], pixTimes: [], stillTimes: null, samples: [], missing: [], pix: [], stills: [], log: [], init: null, end: null, accept: null };
  try {
    await withGpuLock(`cut-verify ${dock} pid ${process.pid}`, async () => {
      await live(m).catch((e) => { m.crash = first(e.message); if (!m.started) m.reason = `the browser run failed: ${m.crash}`; });
      m.accept = await acceptRun();
    });
  } catch (e) { m.reason = `no GPU run: ${first(e.message)}`; }
  rules.push(...judge(m));
  const sheet = m.pix.length ? path.join(out, "sheet.jpg") : null;
  if (sheet) await contactSheet(m.pix.map((p) => p.png), sheet, W / 2, H / 2);

  const count = (s) => rules.filter((r) => r.status === s).length;
  const result = count("FAIL") || count("NOT RUN") ? "FAIL" : "PASS";
  const shaderFull = [...new Set(m.log.filter((e) => e.kind === "shader").map((e) => `[${e.at}] ${e.text}`))];
  const acc = m.accept ?? { ran: false, lines: ["accept-run: not run, the GPU run did not happen"] };
  const accCount = (s) => acc.lines.filter((l) => l.startsWith(`${s} `)).length;
  const stats = m.init?.stats;
  console.log(`cut-verify ${dock} @ ${sha} | ${stats?.adapter ?? "adapter unknown"} | tier ${stats?.tier ?? "?"} -> ${m.end?.tier ?? "?"} | ${W}x${H} | duration ${m.init?.duration ?? "?"} s, step ${step} s, ${m.samples.length} samples (${m.pix.length} pixel on the engine canvas, ${m.stills.length} still)`);
  for (const r of rules) console.log(`${r.status.padEnd(8)} ${r.id.padEnd(16)} ${r.detail.length > 330 ? r.detail.slice(0, 330) + " ..." : r.detail}`);
  if (shaderFull.length) console.log(`\nSHADER ERRORS (${shaderFull.length}, in full):\n${shaderFull.join("\n\n")}`);
  console.log(`\naccept-run${acc.ran ? ` (not counted in the exit code): ${accCount("pass")} pass, ${accCount("fail")} fail, ${accCount("not_run")} not_run; pass and not_run lines are in the JSON` : ""}`);
  for (const l of acc.lines.filter((x) => /^(fail|error|wrote|accept-run)/.test(x))) console.log(`  ${l}`);
  console.log("");
  for (const s of m.stills) console.log(`STILL ${s}`);
  if (sheet) console.log(`SHEET ${sheet}  (${m.pix.length} tiles, 3 across, at ${m.pix.map((p) => p.t).join(", ")} s)`);
  const json = path.join(out, `verify-${dock}.json`);
  const pix = m.pix.map((p) => ({ ...p, png: undefined }));
  writeFileSync(json, `${JSON.stringify({ dock, sha, adapter: stats?.adapter ?? null, tier: [stats?.tier ?? null, m.end?.tier ?? null], size: `${W}x${H}`, step, duration: m.init?.duration ?? null, limits: LIMITS, result, rules, pixels: pix, samples: m.samples, missing: m.missing, console: m.log, accept: acc, stills: m.stills, sheet }, null, 2)}\n`);
  console.log(`JSON  ${json}`);
  console.log(`RESULT ${result}: ${count("FAIL")} FAIL, ${count("NOT RUN")} NOT RUN, ${count("WARN")} WARN, ${count("PASS")} PASS`);
  process.exitCode = result === "FAIL" ? 1 : 0;
}

main().catch((e) => { console.log(`cut-verify: ${e.stack ?? e}`); process.exitCode = 1; });
