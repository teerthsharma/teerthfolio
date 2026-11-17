// PACK REGISTRY: files the 17 shader packs (about 1,560 tools) into TOOLS on demand, without touching index.js.
// A cutscene writes two lines, then uses glslFor / tool / uniformsFor from index.js as usual:
//   import { loadPack } from "../../tools/packs.js";   // .../lib/anime/tools/packs.js
//   await loadPack("jjk");                              // registers every tool of the pack (kit and shaders)
//   const glsl = glslFor(["jjkVoidSpace"]);             // dependencies (the pack kit) come first
// Each pack is its own dynamic import, so a bundle carries only the packs a cutscene loads.
// Code that already imports a pack index statically: registerPack(await import("./jjk/index.js")) or registerPack(jjkNs).
// Collisions: a name shared by several tools registers only as "<pack>/<name>" ("cuts/<dock>/<name>"), the table lists the exact
// string (pull); fnClashes(names) lists GLSL functions defined by two of the named tools (they cannot share one shader). Table: docs/SHADERS.md.
import { TOOLS, tool } from "./index.js";
import { NEEDS, QUALIFY, SKIP } from "./packs.gen.js";

export const PACKS = {
  araki: () => import("./araki/index.js"),
  basic: () => import("./basic/index.js"),
  bg: () => import("./bg/index.js"),
  cuts: () => import("./cuts/index.js"),
  deepmath: () => import("./deepmath/index.js"),
  dock: () => import("./dock/index.js"),
  gold: () => import("./gold/index.js"),
  indexneeds: () => import("./indexneeds/index.js"),
  jcstaff: () => import("./jcstaff/index.js"),
  jjk: () => import("./jjk/index.js"),
  jojo: () => import("./jojo/index.js"),
  madhouse: () => import("./madhouse/index.js"),
  mappa: () => import("./mappa/index.js"),
  myth: () => import("./myth/index.js"),
  occlude: () => import("./occlude/index.js"),
  other: () => import("./other/index.js"),
  phys: () => import("./phys/index.js"),
  pierrot: () => import("./pierrot/index.js"),
  prettytv: () => import("./prettytv/index.js"),
  print: () => import("./print/index.js"),
  sakuga: () => import("./sakuga/index.js"),
  school: () => import("./school/index.js"),
  shonen: () => import("./shonen/index.js"),
  shinkai: () => import("./shinkai/index.js"),
  space: () => import("./space/index.js"),
  topo: () => import("./topo/index.js"),
  ufotable: () => import("./ufotable/index.js"),
};

const isTool = (o) => o && typeof o === "object" && typeof o.name === "string" && typeof o.glsl === "string";

// every tool a pack index exports (a tool, an array of tools, or an object of tools), each once, in export order
export function collectTools(mod) {
  const out = new Set();
  for (const v of Object.values(mod)) {
    const list = isTool(v) ? [v] : Array.isArray(v) ? v : v && typeof v === "object" && !Array.isArray(v) ? Object.values(v) : [];
    if (list.length && list.every(isTool)) list.forEach((t) => out.add(t));
  }
  return [...out];
}

// top-level GLSL function definitions: [{ name, sig, key }], key = name(paramTypes) (the overload identity)
export function glslFunctions(src) {
  const s = src.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ").replace(/^\s*#.*$/gm, " ");
  let top = "", d = 0;
  for (const ch of s) { if (ch === "{") { if (d++ === 0) top += "{;"; } else if (ch === "}") d--; else if (d === 0) top += ch; }
  const out = [], re = /([A-Za-z_]\w*)\s+([A-Za-z_]\w*)\s*\(([^()]*)\)\s*\{;/g;
  const q = /^(?:in|out|inout|const|highp|mediump|lowp|flat|smooth)$/;
  for (let m; (m = re.exec(top)); ) {
    if (/^(?:if|for|while|switch|return|else|struct)$/.test(m[1])) continue;
    const args = m[3].replace(/\s+/g, " ").trim();
    const types = args && args !== "void" ? args.split(",").map((a) => a.trim().split(/\s+/).filter((w) => !q.test(w))[0] ?? "") : [];
    out.push({ name: m[2], sig: `${m[1]} ${m[2]}(${args})`, key: `${m[2]}(${types.join(",")})` });
  }
  return out;
}

const idOf = (pack, t) => [pack, pack === "cuts" ? t.family : "", t.name].filter(Boolean).join("/");
const prepared = new WeakMap(); // pack namespace -> its prepared tools

// the tools of one pack as the registry files them: { ...tool, base (own name), pack, name (registry name), deps }
// - a name shared with another tool registers only as "<pack>/[dock/]name" (QUALIFY, generated), so it never depends on load order
// - jojo: its GLSL kit is a string, so it becomes the tool "jojoKit" every jojo tool depends on
// - cuts: a dock module calls its dock siblings (worldPlate ...), so those become deps
export function prepare(pack, mod, qualify = new Set(QUALIFY)) {
  let list = collectTools(mod);
  if (pack === "jojo") {
    const kit = { name: "jojoKit", doc: "shared Araki law: palette, jCap luma cap, fills, hashes; every jojo shader needs it", glsl: mod.KIT };
    list = [kit, ...list.map((t) => ({ ...t, deps: [...(t.deps ?? []), "jojoKit"] }))];
  }
  const reg = (t) => (qualify.has(t.name) ? idOf(pack, t) : t.name);
  const dock = new Map();
  if (pack === "cuts") for (const t of list) for (const f of glslFunctions(t.glsl)) { if (!dock.has(t.family)) dock.set(t.family, new Map()); dock.get(t.family).set(f.name, t); }
  const dockOf = (t) => (pack === "cuts" ? t.family ?? "" : "");
  const byBase = new Map(list.map((t) => [`${dockOf(t)}|${t.name}`, t]));
  return list.map((t) => {
    const deps = (t.deps ?? []).map((d) => { const o = byBase.get(`${dockOf(t)}|${d}`) ?? byBase.get(`|${d}`); return o ? reg(o) : d; });
    if (pack === "cuts" && t.family) {
      const own = new Set(glslFunctions(t.glsl).map((f) => f.name));
      for (const m of (t.glsl + " " + (t.demo ?? "")).matchAll(/([A-Za-z_]\w*)\s*\(/g)) {
        const s = dock.get(t.family).get(m[1]);
        if (s && s !== t && !own.has(m[1]) && !deps.includes(reg(s))) deps.push(reg(s));
      }
    }
    return { ...t, base: t.name, pack, deps, name: reg(t) };
  });
}

const loaded = new Map(); // pack -> prepared tools

// synchronous: files a pack namespace (import * as ns) into TOOLS; returns { added, aliased, skipped }
export function registerPack(mod, pack = "") {
  const r = { added: [], aliased: [], skipped: [] };
  let own = prepared.get(mod);
  if (!own) prepared.set(mod, (own = prepare(pack, mod)));
  if (pack) loaded.set(pack, own);
  for (const t of own) {
    const id = idOf(pack, { ...t, name: t.base });
    const x = TOOLS.find((y) => y.name === t.name);
    if (x && x.glsl === t.glsl) continue;
    if (SKIP.includes(id)) { r.skipped.push(id); continue; }
    if (x) {
      const q = { ...t, name: id };
      if (TOOLS.some((y) => y.name === id)) { r.skipped.push(id); continue; }
      TOOLS.push(q); r.aliased.push(id);
    } else { TOOLS.push(t); r.added.push(t.name); }
  }
  return r;
}

// async: loads a pack (and the packs its tools depend on) once; returns the registerPack result
export async function loadPack(name) {
  if (!PACKS[name]) throw new Error(`unknown shader pack: ${name} (have ${Object.keys(PACKS).join(", ")})`);
  if (loaded.has(name)) return { added: [], aliased: [], skipped: [] };
  for (const n of NEEDS[name] ?? []) await loadPack(n);
  return registerPack(await PACKS[name](), name);
}
export const loadPacks = async (names) => { for (const n of names) await loadPack(n); };

// the registry name to pass to glslFor for a pack tool given by its own name (cuts: dock too): packTool("cuts", "worldPlate", "p-nerve")
export const packTool = (pack, base, dock = "") => (loaded.get(pack) ?? []).find((t) => t.base === base && (!dock || t.family === dock));

// GLSL functions defined by more than one of the named tools (dependencies included): [{ fn, tools }]
export function fnClashes(names) {
  const seen = new Set(), by = new Map();
  const add = (n) => {
    if (seen.has(n)) return; seen.add(n);
    const t = tool(n);
    (t.deps ?? []).forEach(add);
    for (const f of glslFunctions(t.glsl)) { if (!by.has(f.key)) by.set(f.key, new Set()); by.get(f.key).add(n); }
  };
  names.forEach(add);
  return [...by].filter(([, v]) => v.size > 1).map(([fn, v]) => ({ fn, tools: [...v] }));
}
