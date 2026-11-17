/* global window */
// node lib/anime/tools/cuts/p-asmodeus/draws.mjs <t...>: draw calls per clock time in real Chrome, split by named ancestor.
// Exit 2 when window.__cut.player.root is missing (the keys are printed).
import { cutUrl } from "../../../../../scripts/cut-serve.mjs";
import { launchChrome } from "../../../../../scripts/cut-cap.mjs";
import { withGpuLock } from "../../../../../scripts/cut-lock.mjs";

const DOCK = "p-asmodeus";
const GROUPS = ["world", "cast", "fx", "hero-seal", "Lucifer"];
const times = process.argv.slice(2).map(Number);
if (!times.length || times.some((t) => !Number.isFinite(t))) {
  console.error("usage: node lib/anime/tools/cuts/p-asmodeus/draws.mjs <t...>");
  process.exit(2);
}

function installHooks(groups) {
  const c = window.__cut, root = c.player.root, R = c.engine.renderer, info = R.info, orig = R.render, stack = [];
  const hook = (window.__dc = { on: false, counts: {}, scenes: {}, who: {}, names: {} });
  const groupOf = (o) => { for (let p = o; p; p = p.parent) if (groups.includes(p.name)) return p.name; return "other"; };
  root.traverse((o) => {
    if (!o.isMesh && !o.isLine && !o.isPoints && !o.isSprite) return;
    const prev = o.onBeforeRender;
    o.onBeforeRender = function (...a) {
      if (hook.on) {
        const g = groupOf(this);
        hook.counts[g] = (hook.counts[g] ?? 0) + 1;
        const nm = (hook.names[g] ??= new Set());
        if (nm.size < 40) nm.add(`${this.name || this.type}<${this.parent?.name || this.parent?.type}>`);
      }
      return prev.apply(this, a);
    };
  });
  R.render = function (scene, camera) {
    const before = info.render.calls, frame = { child: 0 };
    stack.push(frame);
    try { return orig.call(this, scene, camera); }
    finally {
      stack.pop();
      const total = info.render.calls - before, own = total - frame.child;
      if (stack.length) stack[stack.length - 1].child += total;
      const key = scene === root ? "main" : scene?.name || scene?.type || "scene";
      if (hook.on) hook.scenes[key] = (hook.scenes[key] ?? 0) + own;
      if (hook.on && key !== "main") hook.who[key] = [...new Set((scene?.children ?? []).slice(0, 12).map((o) => o.name || o.type))].join(",");
    }
  };
}

function seekAndCount(t) {
  const c = window.__cut, info = c.engine.renderer.info, hook = window.__dc;
  info.autoReset = false; info.reset();
  hook.counts = {}; hook.scenes = {}; hook.who = {}; hook.names = {}; hook.on = true;
  let threw = null;
  try { c.seek(t); } catch (e) { threw = String(e?.stack ?? e).slice(0, 300); }
  hook.on = false;
  const parts = { ...hook.counts }, mainSum = Object.values(hook.counts).reduce((a, b) => a + b, 0);
  parts.unhooked = (hook.scenes.main ?? 0) - mainSum;
  for (const [k, v] of Object.entries(hook.scenes)) if (k !== "main") parts[`scene:${k}`] = v;
  const partsSum = Object.values(parts).reduce((a, b) => a + b, 0);
  const names = Object.fromEntries(Object.entries(hook.names).map(([g, set]) => [g, [...set]]));
  return { calls: info.render.calls, partsSum, triangles: info.render.triangles, parts, names, scenesChildren: hook.who, threw };
}

async function main() {
  const browser = await launchChrome();
  try {
    const page = await browser.newPage({ viewport: { width: 1280, height: 720 }, deviceScaleFactor: 1 });
    await page.goto(await cutUrl(DOCK, "t=0&paused"), { waitUntil: "load", timeout: 180000 });
    try { await page.waitForFunction(() => Boolean(window.__cut), null, { timeout: 120000 }); }
    catch { console.log(JSON.stringify({ error: "window.__cut did not appear", text: (await page.evaluate(() => document.body?.innerText ?? "")).slice(0, 300) })); return 1; }
    const keys = await page.evaluate(() => Object.keys(window.__cut));
    console.log(JSON.stringify({ keys }));
    if (!(await page.evaluate(() => Boolean(window.__cut.player?.root)))) {
      console.log(JSON.stringify({ note: "no scene handle: window.__cut.player.root is missing; stopping" }));
      return 2;
    }
    await page.evaluate(installHooks, GROUPS);
    await page.waitForTimeout(900);
    for (const t of times) {
      const r = await page.evaluate(seekAndCount, t);
      console.log(JSON.stringify({ t, ...r }));
    }
    return 0;
  } finally {
    await browser.close();
  }
}

process.exitCode = await withGpuLock(`draws ${DOCK} pid ${process.pid}`, main);
