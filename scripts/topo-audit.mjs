// Program-ownership audit (E0 section C): which owner group each shader program linked at __world.ready belongs to, in real Chrome.
//   node scripts/topo-audit.mjs --self-test                 classifier on a fixture, no browser
//   node scripts/topo-audit.mjs --url http://localhost:3231 [--query "?hud=off"] --gpu intel|nvidia --run 1 --out <file.json>
// Needs the tagged build: git apply scripts/topo-tags.patch, build, git apply -R, then serve the clean build.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { withGpuLock } from "./cut-lock.mjs";
import { BASE_FLAGS, adapterFlags } from "./gpu-adapter.mjs";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const VIEW = { width: 1440, height: 900 };
const DPR = 2;
const CLASSES = ["static-only", "live-only", "dock-only", "mixed", "derived", "unattributed"];
const CHROME = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  path.join(process.env.LOCALAPPDATA ?? "", "Google/Chrome/Application/chrome.exe"),
].find(existsSync);

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) continue;
    const next = argv[i + 1];
    if (next === undefined || next.startsWith("--")) out[argv[i].slice(2)] = true;
    else { out[argv[i].slice(2)] = next; i++; }
  }
  return out;
}

export const KIND = {
  "island-static": "STATIC", buildings: "STATIC", movers: "LIVE", "water+sea": "LIVE", seal: "LIVE", "sky+fx": "LIVE", post: "LIVE",
  docks: "DOCK", "shadow-depth": "DERIVED", untagged: "UN",
};

export async function auditInPage(opts) {
  const W = window.__world;
  const progs = W?.gl?.info?.programs;
  if (!progs || !W.scene) throw new Error("no programs or scene at ready");
  const gl = W.gl;
  const props = gl.properties;
  const kind = opts.kind;
  const atReady = progs.slice();
  const hash = (s) => {
    let h = 0x811c9dc5;
    for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
    return (h >>> 0).toString(16).padStart(8, "0");
  };
  const tags = [];
  W.scene.traverse((o) => { if (/^own:/.test(o.name || "")) tags.push(o.name); });
  if (tags.length === 0) throw new Error("build is not the tagged build");
  const ownerOf = (o) => {
    for (let p = o; p; p = p.parent) {
      if (p.name === "seal") return "seal";
      if (p.name === "cutscene") return "docks";
      const m = /^own:(.+)$/.exec(p.name || "");
      if (m) return m[1];
    }
    return "untagged";
  };
  const use = new Map();
  const ownerMeshes = {};
  const add = (prog, owner, flags = {}) => {
    let e = use.get(prog.cacheKey);
    if (!e) { e = { owners: new Set(), meshes: 0, moved: false, custom: false, dockIds: new Set() }; use.set(prog.cacheKey, e); }
    e.owners.add(owner);
    e.meshes++;
    e.custom = e.custom || !!flags.custom;
    if (flags.dockId) e.dockIds.add(flags.dockId);
    ownerMeshes[owner] = (ownerMeshes[owner] ?? 0) + 1;
  };
  const samples = [];
  const sceneMeshes = [];
  let noProgram = 0;
  W.scene.traverse((o) => {
    const mats = [].concat(o.material ?? [], o.customDepthMaterial ?? [], o.customDistanceMaterial ?? []);
    const owner = ownerOf(o);
    for (const m of mats) {
      const prog = props.get(m)?.currentProgram;
      if (!prog) { noProgram++; continue; }
      add(prog, owner, { custom: !!m.isShaderMaterial || Object.prototype.hasOwnProperty.call(m, "onBeforeCompile") });
      sceneMeshes.push({ key: prog.cacheKey, o, owner });
      if (owner === "untagged" && samples.length < 10) {
        const chain = [];
        for (let p = o.parent, i = 0; p && i < 4; p = p.parent, i++) chain.push(p.name || p.type || "");
        samples.push({ type: o.type, geo: o.geometry?.type, mat: m.type, chain });
      }
    }
  });
  const postMats = new Set();
  const skip = new Set(["renderer", "_renderer", "parent", "scene", "camera", "composer"]);
  const collect = (x, depth, seen) => {
    if (!x || typeof x !== "object" || seen.has(x) || depth > 4 || ArrayBuffer.isView(x)) return;
    seen.add(x);
    if (x.isTexture || x.isBufferGeometry || x.isWebGLRenderTarget) return;
    if (x.isMaterial) { postMats.add(x); return; }
    if (x.isObject3D) { if (!x.isScene && !x.isCamera && x.material) collect(x.material, depth + 1, seen); return; }
    for (const k of Object.keys(x)) if (!skip.has(k)) collect(x[k], depth + 1, seen);
  };
  if (W.composer) collect(W.composer, 0, new Set());
  for (const m of postMats) {
    const prog = props.get(m)?.currentProgram;
    if (prog) add(prog, "post"); else noProgram++;
  }
  function objects(held, out = [], seen = new Set(), depth = 0) {
    if (!held || typeof held !== "object" || seen.has(held) || depth > 4) return out;
    seen.add(held);
    if (held.isObject3D) { out.push(held); return out; }
    if (held.isMaterial || held.isBufferGeometry || held.isTexture) return out;
    for (const v of Array.isArray(held) ? held : Object.values(held)) objects(v, out, seen, depth + 1);
    return out;
  }
  const dockEntries = [];
  for (const [id, e] of window.__warm || []) {
    const roots = objects(e.held);
    for (const r of roots) {
      r.traverse((o) => {
        for (const m of [].concat(o.material ?? [])) {
          const prog = props.get(m)?.currentProgram;
          if (prog) add(prog, "docks", { dockId: id });
        }
      });
    }
    dockEntries.push({ id, state: e.state, roots: roots.length });
  }
  const kindOf = (id) => kind[id] ?? "UN";
  const classOf = (p, e) => {
    if (!e || e.owners.size === 0) return /^(depth|distanceRGBA)$/.test(p.name) ? "derived" : "unattributed";
    const kinds = new Set([...e.owners].map(kindOf));
    if (kinds.size === 1 && kinds.has("UN")) return "unattributed";
    if (kinds.size >= 2) return "mixed";
    return { STATIC: "static-only", LIVE: "live-only", DOCK: "dock-only" }[[...kinds][0]] ?? "unattributed";
  };
  const classes = Object.fromEntries(["static-only", "live-only", "dock-only", "mixed", "derived", "unattributed"].map((c) => [c, 0]));
  const mixedPairs = {};
  const owners = {};
  const classed = atReady.map((p) => {
    const e = use.get(p.cacheKey);
    const cls = classOf(p, e);
    classes[cls]++;
    const ids = e ? [...e.owners].sort() : [];
    if (cls === "mixed") mixedPairs[ids.join("+")] = (mixedPairs[ids.join("+")] ?? 0) + 1;
    for (const id of ids) {
      const o = (owners[id] ??= { exclusive: 0, shared: 0, meshes: ownerMeshes[id] ?? 0 });
      if (ids.length === 1) o.exclusive++; else o.shared++;
    }
    return { p, cls, ids };
  });
  const snap = (o) => ({ m: o.matrixWorld?.elements ? o.matrixWorld.elements.slice() : [], v: o.instanceMatrix?.version ?? 0 });
  const same = (a, b) => a.v === b.v && a.m.length === b.m.length && a.m.every((x, i) => Math.abs(x - b.m[i]) <= 1e-6);
  const probe = sceneMeshes.filter((s) => s.owner !== "untagged").map((s) => ({ key: s.key, o: s.o, before: snap(s.o) }));
  await new Promise((r) => setTimeout(r, opts.settleMs));
  for (const s of probe) if (!same(s.before, snap(s.o))) use.get(s.key).moved = true;
  const totalAfterSettle = gl.info.programs.length;
  const programs = classed.map(({ p, cls, ids }) => {
    const e = use.get(p.cacheKey);
    return {
      id: hash(p.cacheKey), name: p.name, usedTimes: p.usedTimes, owners: ids, class: cls,
      moved: e?.moved ?? false, custom: e?.custom ?? false, meshes: e?.meshes ?? 0, dockIds: e ? [...e.dockIds] : [],
    };
  });
  return {
    total: { atReady: atReady.length, afterSettle: totalAfterSettle },
    tagGroups: tags.length,
    noProgram,
    owners,
    classes,
    mixedPairs,
    programs,
    untaggedSamples: samples,
    dockEntries,
    post: W.composer ? { materials: postMats.size } : null,
  };
}

function invariant(r) {
  const sum = CLASSES.reduce((n, c) => n + r.classes[c], 0);
  if (sum !== r.total.atReady || r.programs.length !== r.total.atReady) {
    throw new Error(`invariant broken: class sum ${sum}, programs ${r.programs.length}, atReady ${r.total.atReady}`);
  }
}

function fixture() {
  const names = ["lambert", "phong", "toon", "post", "depth", "x", "dock"];
  const cacheKeys = ["KEY-ISLAND-A", "KEY-SHARED-B", "KEY-SEAL-C", "KEY-POST-D", "KEY-DEPTH-E", "KEY-X-F", "KEY-DOCK-G"];
  const [P1, P2, P3, P4, P5, P6, P7] = cacheKeys.map((cacheKey, i) => ({ cacheKey, name: names[i], usedTimes: 1 }));
  const node = (name, children = [], extra = {}) => {
    const o = { name, children, isObject3D: true, parent: null, ...extra };
    for (const c of children) c.parent = o;
    o.traverse = (fn) => { fn(o); for (const c of children) c.traverse(fn); };
    return o;
  };
  const mat = (prog) => ({ isMaterial: true, __p: prog });
  const scene = node("scene", [
    node("own:island-static", [node("meshA", [], { material: mat(P1) }), node("meshB", [], { material: mat(P2) })]),
    node("own:movers", [node("meshC", [], { material: mat(P2) })]),
    node("seal", [node("meshD", [], { material: mat(P3) })]),
  ], { isScene: true });
  const composer = { passes: [{ fullscreenMaterial: mat(P4) }] };
  const dockRoot = node("dock-root", [], { material: mat(P7) });
  const warm = new Map([["dock-a", { id: "dock-a", state: "compiled", held: { root: dockRoot }, gen: 1 }]]);
  const gl = { info: { programs: [P1, P2, P3, P4, P5, P6, P7] }, properties: { get: (m) => ({ currentProgram: m.__p }) } };
  return { W: { gl, scene, composer, ready: true }, warm, cacheKeys };
}

async function selfTest() {
  const { W, warm, cacheKeys } = fixture();
  globalThis.window = { __world: W, __warm: warm };
  const r = await auditInPage({ settleMs: 0, kind: KIND });
  const fail = (why) => { console.error(`self-test FAIL: ${why}`); process.exit(1); };
  const want = { "static-only": 1, "live-only": 2, "dock-only": 1, mixed: 1, derived: 1, unattributed: 1 };
  for (const c of Object.keys(want)) if (r.classes[c] !== want[c]) fail(`class ${c} = ${r.classes[c]}, want ${want[c]}`);
  if (r.owners["island-static"].exclusive !== 1 || r.owners["island-static"].shared !== 1) fail("island-static exclusive/shared");
  if (r.mixedPairs["island-static+movers"] !== 1) fail("mixedPairs island-static+movers");
  if (r.total.atReady !== 7 || r.programs.length !== 7) fail(`total.atReady ${r.total.atReady}`);
  if (r.tagGroups !== 2 || r.post?.materials !== 1 || r.dockEntries.length !== 1) fail("tagGroups, post or dockEntries");
  invariant(r);
  const text = JSON.stringify(r);
  for (const k of cacheKeys) if (text.includes(k)) fail(`raw cacheKey ${k} in output`);
  console.log("self-test OK");
}

const MARKS = () => {
  window.__mk = {};
  const tick = (now) => {
    const w = window.__world;
    if (w?.gl && window.__mk.canvasMs === undefined) window.__mk.canvasMs = Math.round(now);
    if (w?.ready && window.__mk.readyMs === undefined) window.__mk.readyMs = Math.round(now);
    if (window.__mk.readyMs === undefined) requestAnimationFrame(tick);
  };
  requestAnimationFrame(tick);
};

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a["self-test"]) return selfTest();
  if (!CHROME) throw new Error("topo-audit: no Chrome install found");
  const url = typeof a.url === "string" ? a.url : "http://localhost:3231";
  const query = typeof a.query === "string" ? a.query : "";
  const gpu = typeof a.gpu === "string" ? a.gpu : null;
  const commit = execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  const buildFile = path.join(ROOT, ".next", "BUILD_ID");
  const build = existsSync(buildFile) ? readFileSync(buildFile, "utf8").trim() : "none";
  const { chromium } = await import("playwright");
  const audit = await withGpuLock(`topo-audit ${gpu ?? "default"}`, async () => {
    const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: [...BASE_FLAGS, ...(await adapterFlags(chromium, CHROME, gpu))] });
    try {
      const context = await browser.newContext({ viewport: VIEW, deviceScaleFactor: DPR });
      await context.addInitScript(MARKS);
      const page = await context.newPage();
      await page.goto(`${url}/${query}`, { waitUntil: "commit" });
      await page.waitForFunction(() => window.__world?.ready, null, { timeout: 120e3 });
      const result = await page.evaluate(auditInPage, { settleMs: 2000, kind: KIND });
      const marks = await page.evaluate(() => window.__mk ?? {});
      const adapter = await page.evaluate(() => {
        const gl = window.__world?.gl?.getContext?.();
        const dbg = gl?.getExtension("WEBGL_debug_renderer_info");
        return dbg ? gl.getParameter(dbg.UNMASKED_RENDERER_WEBGL) : "unknown";
      });
      return { ...result, marks: { canvasMs: marks.canvasMs ?? null, readyMs: marks.readyMs ?? null }, adapter };
    } finally {
      await browser.close();
    }
  });
  const { adapter, marks, ...rest } = audit;
  invariant(rest);
  const out = { schema: "topo-audit/1", commit, build, url, query, gpuFlag: gpu, adapter, run: Number(a.run ?? 1), viewport: "1440x900@2", marks, ...rest };
  const text = JSON.stringify(out, null, 2) + "\n";
  if (typeof a.out === "string") {
    mkdirSync(path.dirname(path.resolve(a.out)), { recursive: true });
    writeFileSync(a.out, text);
  } else process.stdout.write(text);
}

if (path.resolve(fileURLToPath(import.meta.url)) === path.resolve(process.argv[1] ?? "")) {
  main().catch((e) => { console.error(`topo-audit: ${e.message}`); process.exitCode = 1; });
}
