// T5 renderer gate (PREREGISTRATION-T5.md): flag off against ?topo=neutral on a production build, 3 runs per adapter.
//   node experiments/topological-shader/neutral.mjs pixels --url <u> --gpu intel|nvidia --run <n> --out <file>   held-frame pixel check (topo-run.ps1 calls it)
//   node experiments/topological-shader/neutral.mjs report --raw <dir> --meta <meta.json> [--out <dir>]          bars from the raw runs, writes out/t5.json and out/t5.md
// The whole run is `pwsh -NoProfile -File scripts/topo-run.ps1 -Ref <sha> -SkipTagged -Arms off,neutral -Pixels -Phases fresh,walk -OutDir <dir>`.
import { existsSync, readFileSync, readdirSync, writeFileSync, mkdirSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const BARS = {
  pixel: "neutral-vs-off pixel difference <= 1/255 per channel on 3 held frames",
  programs: "programs at ready <= 109 (Intel) and <= 124 (RTX)",
  window: "first-visit window >= 938 (Intel) and >= 844 (RTX) frames",
  tick: "longest prewarm tick <= 37 and <= 40 ms",
  key: "first key-press frame <= 36.4 ms",
  kill: "KILL: any one bar",
};

export const LIMIT = {
  intel: { programs: 109, window: 938, tick: 37 },
  nvidia: { programs: 124, window: 844, tick: 40 },
  key: 36.4,
  pixel: 1,
};
export const WORLDS = ["jjk", "frieren", "your-name"];
export const HELD_T = 2;
export const WARM_LOG_FLOOR_MS = 30;

const max = (xs) => Math.max(...xs);
const min = (xs) => Math.min(...xs);

// one raw walk json -> the three first-visit numbers; a null warmLog means no tick passed WARM_LOG_FLOOR_MS (prewarm.js logs ticks over 30 ms)
export function walkNumbers(json) {
  const log = json.fresh?.warmLog ?? [];
  return {
    window: json.fresh?.frames,
    tick: log.length ? max(log.map((e) => e[3])) : WARM_LOG_FLOOR_MS,
    tickLogged: log.length > 0,
    key: json.walk?.firstKey,
  };
}

// runs[adapter] = { off: [{progs, window, tick, key}...], neutral: [...], pixels: [{ diffs: [d0, d1, d2], controls: [c0, c1, c2], linked: [bool x3] }...] }
export function evaluate(runs) {
  const out = {};
  let voided = false;
  let killed = false;
  for (const adapter of ["intel", "nvidia"]) {
    const r = runs[adapter];
    const lim = LIMIT[adapter];
    const n = r.neutral;
    const px = r.pixels;
    const pxMax = px.length ? max(px.flatMap((p) => p.diffs)) : null;
    const controlOk = px.length > 0 && px.every((p) => p.controls.every((c) => c <= LIMIT.pixel) && p.linked.every(Boolean));
    const rows = {
      pixel: { value: pxMax, bar: BARS.pixel, pass: pxMax !== null && controlOk && pxMax <= LIMIT.pixel, void: !controlOk },
      programs: { value: max(n.map((x) => x.progs)), bar: BARS.programs, pass: max(n.map((x) => x.progs)) <= lim.programs },
      window: { value: min(n.map((x) => x.window)), bar: BARS.window, pass: min(n.map((x) => x.window)) >= lim.window },
      tick: { value: max(n.map((x) => x.tick)), bar: BARS.tick, pass: max(n.map((x) => x.tick)) <= lim.tick },
      key: { value: max(n.map((x) => x.key)), bar: BARS.key, pass: max(n.map((x) => x.key)) <= LIMIT.key },
    };
    for (const row of Object.values(rows)) {
      if (row.void) voided = true;
      else if (!row.pass) killed = true;
    }
    out[adapter] = rows;
  }
  return { verdict: voided ? "VOID" : killed ? "KILL" : "PASS", bars: out };
}

function readRaw(dir) {
  const runs = { intel: { off: [], neutral: [], pixels: [] }, nvidia: { off: [], neutral: [], pixels: [] } };
  const gpu = { intel: new Set(), nvidia: new Set() };
  for (const name of readdirSync(dir).sort()) {
    let m = /^boot-(intel|nvidia)-(off|neutral)-r(\d+)\.json$/.exec(name);
    if (m) {
      const r = JSON.parse(readFileSync(path.join(dir, name), "utf8")).phases.boot.runs[0];
      gpu[m[1]].add(r.adapter);
      const row = (runs[m[1]][m[2]][Number(m[3]) - 1] ??= {});
      row.progs = r.progs;
      continue;
    }
    m = /^walk-(intel|nvidia)-(off|neutral)-r(\d+)\.json$/.exec(name);
    if (m) {
      const j = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
      gpu[m[1]].add(j.gpu);
      Object.assign((runs[m[1]][m[2]][Number(m[3]) - 1] ??= {}), walkNumbers(j));
      continue;
    }
    m = /^pixels-(intel|nvidia)-r(\d+)\.json$/.exec(name);
    if (m) {
      const j = JSON.parse(readFileSync(path.join(dir, name), "utf8"));
      gpu[m[1]].add(j.adapter);
      runs[m[1]].pixels[Number(m[2]) - 1] = j;
    }
  }
  return { runs, gpu: Object.fromEntries(Object.entries(gpu).map(([k, v]) => [k, [...v]])) };
}

const f = (v) => (v === null || v === undefined ? "n/a" : Number.isInteger(v) ? String(v) : v.toFixed(1));

function markdown(res, raw, meta, order) {
  const L = [];
  L.push("# T5 renderer gate: flag off against ?topo=neutral", "");
  L.push(`Verdict: **${res.verdict}**. ${BARS.kill}.`, "");
  L.push(`Measured commit ${meta.commit} (production build ${meta.buildClean}), ${meta.date}, node ${meta.node}, one hybrid laptop. Pre-registration: \`PREREGISTRATION-T5.md\`, committed before the first run.`, "");
  L.push(`Arm order per run (off and neutral interleaved in one session, one build, one server):`, "", "```", ...order, "```", "");
  L.push("| adapter | bar | measured on the neutral arm | limit | result |", "|---|---|---|---|---|");
  for (const adapter of ["intel", "nvidia"]) {
    const lim = LIMIT[adapter];
    const b = res.bars[adapter];
    const gpu = raw.gpu[adapter].join(" / ");
    const lines = [
      ["pixel", `max channel difference over 3 held frames x ${raw.runs[adapter].pixels.length} runs`, `<= ${LIMIT.pixel}/255`],
      ["programs", "max programs at ready over 3 runs", `<= ${lim.programs}`],
      ["window", "min first-visit window over 3 runs, frames", `>= ${lim.window}`],
      ["tick", "max longest prewarm tick over 3 runs, ms", `<= ${lim.tick}`],
      ["key", "max first key-press frame over 3 runs, ms", `<= ${LIMIT.key}`],
    ];
    for (const [k, what, lm] of lines) L.push(`| ${gpu} | ${what} | ${f(b[k].value)}${k === "tick" && !raw.runs[adapter].neutral.every((x) => x.tickLogged) ? " (a run with no tick over 30 ms counts 30)" : ""} | ${lm} | ${b[k].void ? "VOID" : b[k].pass ? "PASS" : "FAIL"} |`);
  }
  L.push("", "## Every run", "", "| adapter | arm | run | programs at ready | first-visit window, frames | longest prewarm tick, ms | first key-press frame, ms |", "|---|---|---|---|---|---|---|");
  for (const adapter of ["intel", "nvidia"]) {
    for (const arm of ["off", "neutral"]) {
      raw.runs[adapter][arm].forEach((x, i) => L.push(`| ${adapter} | ${arm} | ${i + 1} | ${f(x.progs)} | ${f(x.window)} | ${x.tickLogged ? f(x.tick) : "<= 30 (none logged)"} | ${f(x.key)} |`));
    }
  }
  L.push("", "## Held frames", "", "| adapter | run | world | neutral against off, max channel difference | off against off (control) | topo chunk in the plate program | positive control, red chunk against off (reported, not gated) |", "|---|---|---|---|---|---|---|");
  for (const adapter of ["intel", "nvidia"]) {
    raw.runs[adapter].pixels.forEach((p, i) => WORLDS.forEach((w, k) => L.push(`| ${adapter} | ${i + 1} | ${w} | ${p.diffs[k]} | ${p.controls[k]} | ${p.linked[k]} | ${p.positives?.[k] ?? "n/a"} |`)));
  }
  L.push("", "BAND ghosting (no trace longer than 8 frames) and BAND <= 0.25 of visible cells are rows of the design's T5 and are NOT RUN here: neutral has no BAND cell, and `on` has no baked plate, so P = L and a BAND pixel cannot differ from a LIVE one.", "");
  return L.join("\n");
}

async function pixels(args) {
  const [{ chromium }, { default: sharp }, gpuMod] = await Promise.all([import("playwright"), import("sharp"), import("../../scripts/gpu-adapter.mjs")]);
  const local = process.env.LOCALAPPDATA;
  const chrome = ["C:/Program Files/Google/Chrome/Application/chrome.exe", "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe", local && path.join(local, "Google/Chrome/Application/chrome.exe")]
    .filter(Boolean).find((c) => existsSync(c));
  if (!chrome) throw new Error("real Chrome not found");
  const base = String(args.url).replace(/\/$/, "");
  if (!/^http:\/\/localhost[:/]/.test(base)) throw new Error("T5 measures a local production build only");
  const browser = await chromium.launch({ executablePath: chrome, headless: true, args: [...gpuMod.BASE_FLAGS, ...(await gpuMod.adapterFlags(chromium, chrome, args.gpu))] });
  // a chunk whose topoOut returns red: through the same splice and plate rebuild, it must change pixels, so the equal frames above are not a dead path
  const RED = { chunk: "vec3 topoOut(vec3 P, vec3 L, vec2 xz, vec2 fragCoord, float hero) { return vec3(1.0, 0.0, 0.0); }", uniforms: {} };
  const shot = async (world, topo, red = false) => {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    try {
      if (red) await page.addInitScript((plug) => { window.__world = { topo: plug }; }, RED);
      await page.goto(`${base}/lab/anime?demo=world&style=${world}&paused&t=${HELD_T}${topo ? "&topo=neutral" : ""}`, { waitUntil: "load", timeout: 120000 });
      await page.waitForFunction(() => window.__anime?.engine, null, { timeout: 60000 });
      if (topo) await page.waitForFunction(() => window.__world?.topo, null, { timeout: 30000 });
      await page.addStyleTag({ content: "nav{display:none!important}" });
      await page.evaluate((t) => window.__anime.seek(t), HELD_T);
      await page.waitForTimeout(1500);
      await page.evaluate((t) => window.__anime.seek(t), HELD_T);
      await page.waitForTimeout(500);
      const info = await page.evaluate(() => ({ adapter: window.__anime.engine.adapter, linked: window.__anime.panels[0].c.mPlate.fragmentShader.includes("topoOut"), topo: Boolean(window.__anime.panels[0].c.topo) }));
      const png = await page.screenshot({ type: "png" });
      return { ...info, ...(await sharp(png).removeAlpha().raw().toBuffer({ resolveWithObject: true })) };
    } finally {
      await page.close();
    }
  };
  const diff = (a, b) => {
    if (a.info.width !== b.info.width || a.info.height !== b.info.height) throw new Error("frame sizes differ");
    let d = 0;
    for (let i = 0; i < a.data.length; i++) d = Math.max(d, Math.abs(a.data[i] - b.data[i]));
    return d;
  };
  const out = { adapter: null, run: Number(args.run), diffs: [], controls: [], positives: [], linked: [], offLinked: [], t: HELD_T, worlds: WORLDS };
  try {
    for (const w of WORLDS) {
      const off = await shot(w, false);
      const off2 = await shot(w, false);
      const neutral = await shot(w, true);
      out.positives.push(diff(off, await shot(w, false, true)));
      out.adapter ??= off.adapter;
      out.diffs.push(diff(off, neutral));
      out.controls.push(diff(off, off2));
      out.linked.push(neutral.linked && neutral.topo);
      out.offLinked.push(off.linked || off.topo);
    }
  } finally {
    await browser.close();
  }
  if (out.offLinked.some(Boolean)) throw new Error("the off arm carries the topo chunk: the flag leaks");
  writeFileSync(String(args.out), JSON.stringify(out, null, 1));
  console.log(JSON.stringify(out));
}

function report(args) {
  const raw = readRaw(String(args.raw));
  const res = evaluate(raw.runs);
  const meta = existsSync(String(args.meta)) ? JSON.parse(readFileSync(String(args.meta), "utf8").replace(/^\uFEFF/, "")) : {};
  const orderFile = path.join(String(args.raw), "order.txt");
  const order = existsSync(orderFile) ? readFileSync(orderFile, "utf8").split(/\r?\n/).filter(Boolean) : [];
  const dir = String(args.out ?? path.join(path.dirname(fileURLToPath(import.meta.url)), "out"));
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "t5.json"), JSON.stringify({ verdict: res.verdict, bars: res.bars, runs: raw.runs, adapters: raw.gpu, order, meta }, null, 1));
  writeFileSync(path.join(dir, "t5.md"), markdown(res, raw, meta, order));
  console.log(`T5 ${res.verdict}`);
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const [cmd, ...rest] = process.argv.slice(2);
  const args = Object.fromEntries(rest.reduce((p, t, i, all) => (t.startsWith("--") ? [...p, [t.slice(2), all[i + 1]]] : p), []));
  if (cmd === "pixels") await pixels(args);
  else if (cmd === "report") report(args);
  else throw new Error("usage: neutral.mjs pixels|report ...");
}
