// node scripts/shader-catalog.mjs                 build lib/anime/tools/catalog.json (+ packs.gen.js) and print the summary
// node scripts/shader-catalog.mjs --check <file>  compile only the tools a file exports; exit 1 on any failure
// node scripts/shader-catalog.mjs --merge <dir>   fold description files (.oneshot/shaders/*.json) into catalog.json
// node scripts/shader-catalog.mjs --docs          write docs/shaders/README.md and docs/shaders/<pack>.md from catalog.json
// Compile check: glslangValidator (PATH or a Vulkan SDK folder) on a GLSL ES 3.00 fragment shader built the way three r178
// builds a ShaderMaterial. Without the validator every record says "unchecked" and the run says so.
import { execFile } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import os from "node:os";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { TOOLS } from "../lib/anime/tools/index.js";
import { PACKS, collectTools, glslFunctions, prepare } from "../lib/anime/tools/packs.js";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const TOOLS_DIR = path.join(ROOT, "lib/anime/tools");
const CATALOG = path.join(TOOLS_DIR, "catalog.json");
const GEN = path.join(TOOLS_DIR, "packs.gen.js");
const DESC = ["draws", "use", "suits", "params", "quality"];
const rel = (f) => path.relative(ROOT, f).split(path.sep).join("/");
const idOf = (r) => [r.pack, r.sub, r.name].filter(Boolean).join("/");

const stripComments = (s) => s.replace(/\/\*[\s\S]*?\*\//g, " ").replace(/\/\/.*$/gm, " ");
const sha = (s) => createHash("sha1").update(s).digest("hex").slice(0, 12);
const NUM = /(?<!\w)(?:\d+\.?\d*|\.\d+)(?:[eE][+-]?\d+)?[fFuU]?(?!\w)/g;

function walk(dir) {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(dir, e.name)) : e.name.endsWith(".js") ? [path.join(dir, e.name)] : []);
}

// ---- 1. enumerate -------------------------------------------------------------------------------------------------
// core, then each pack as the registry files it (packs.js prepare). Two passes: the first finds the names shared by several tools
// (QUALIFY), the second files those under "pack/[dock/]name".
async function enumerate() {
  const mods = {};
  for (const pack of Object.keys(PACKS)) mods[pack] = await import(pathToFileURL(path.join(TOOLS_DIR, pack, "index.js")).href);
  const count = new Map();
  for (const t of TOOLS) count.set(t.name, 1);
  for (const pack of Object.keys(PACKS)) for (const t of prepare(pack, mods[pack], new Set())) count.set(t.name, (count.get(t.name) ?? 0) + 1);
  const qualify = new Set([...count].filter(([, n]) => n > 1).map(([k]) => k));
  const out = TOOLS.map((t) => ({ t, pack: "core", sub: "" }));
  for (const pack of Object.keys(PACKS)) for (const t of prepare(pack, mods[pack], qualify)) out.push({ t, pack, sub: pack === "cuts" ? t.family ?? "" : "" });
  out.qualify = qualify;
  return out;
}

// source file of each tool: the file with a quoted occurrence of the name (preferring a call or `name:` position)
function locator() {
  const cache = new Map();
  const files = (dir) => cache.get(dir) ?? cache.set(dir, walk(dir).map((f) => ({ f, s: readFileSync(f, "utf8") }))).get(dir);
  const esc = (s) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  return (pack, name) => {
    const list = pack === "core" ? files(TOOLS_DIR).filter((x) => path.dirname(x.f) === TOOLS_DIR) : files(path.join(TOOLS_DIR, pack));
    const q = `["'\`]${esc(name)}["'\`]`, strong = new RegExp(`(?:\\(|name\\s*[:=])\\s*${q}`), weak = new RegExp(q);
    const hit = (re) => list.find((x) => /index\.js$/.test(x.f) ? false : re.test(x.s)) ?? list.find((x) => re.test(x.s));
    const h = hit(strong) ?? hit(weak) ?? (pack === "core" ? list.find((x) => path.basename(x.f) === `${name}.js`) : list.find((x) => path.basename(x.f) === "kit.glsl.js"));
    return h ? rel(h.f) : "";
  };
}

// ---- 2. uniforms --------------------------------------------------------------------------------------------------
function inferType(v) {
  const x = Array.isArray(v) ? v[0] : v;
  const arr = Array.isArray(v) ? `[${v.length}]` : "";
  const base = typeof x === "number" ? "float" : typeof x === "boolean" ? "bool" : !x ? "sampler2D" : x.isVector2 ? "vec2" : x.isVector3 || x.isColor ? "vec3" : x.isVector4 || x.isQuaternion ? "vec4"
    : x.isMatrix3 ? "mat3" : x.isMatrix4 ? "mat4" : x.isTexture ? "sampler2D" : "float";
  return base + arr;
}
const DECL = /\buniform\s+(?:(?:highp|mediump|lowp)\s+)?(\w+)\s+(\w+)\s*(\[[^\]]*\])?\s*;/g;
function declaredUniforms(src) { const m = new Map(); for (const x of stripComments(src).matchAll(DECL)) m.set(x[2], x[1] + (x[3] ?? "")); return m; }
function uniformsOf(t) { try { return Object.entries(t.uniforms?.({}) ?? {}).map(([n, u]) => [n, inferType(u?.value)]); } catch { return []; } }
const declares = (src, name) => new RegExp(`\\b(?:uniform|varying|in)\\b[^;{}]*\\b${name}\\b[^;]*;`).test(src);

// ---- 3. compile ---------------------------------------------------------------------------------------------------
const PRE = `#version 300 es
precision highp float;
precision highp int;
precision highp sampler2D;
precision highp samplerCube;
precision highp sampler3D;
precision highp sampler2DArray;
#define varying in
layout(location = 0) out highp vec4 pc_fragColor;
#define gl_FragColor pc_fragColor
#define gl_FragDepthEXT gl_FragDepth
#define texture2D texture
#define textureCube texture
#define texture2DProj textureProj
#define texture2DLodEXT textureLod
#define texture2DProjLodEXT textureProjLod
#define textureCubeLodEXT textureLod
#define texture2DGradEXT textureGrad
#define texture2DProjGradEXT textureProjGrad
#define textureCubeGradEXT textureGrad
uniform mat4 viewMatrix;
uniform vec3 cameraPosition;
uniform bool isOrthographic;
`;

async function findValidator() {
  const run = (bin) => new Promise((ok) => execFile(bin, ["--version"], (e) => ok(!e || e.code !== "ENOENT")));
  const cands = ["glslangValidator"];
  const sdk = process.env.VULKAN_SDK;
  if (sdk) cands.push(path.join(sdk, "Bin", "glslangValidator.exe"), path.join(sdk, "Bin", "glslangValidator"));
  for (const base of ["C:/VulkanSDK", "/usr/share/vulkan", "/opt/vulkan"]) if (existsSync(base)) for (const v of readdirSync(base).sort().reverse()) cands.push(path.join(base, v, "Bin", "glslangValidator.exe"), path.join(base, v, "bin", "glslangValidator"));
  for (const c of cands) if (await run(c)) return c;
  return null;
}

function makeResolver(recs) {
  const by = new Map();
  for (const r of recs) if (!by.has(r.t.name)) by.set(r.t.name, r.t);
  return (name) => by.get(name);
}

// dependency closure, dependencies first; unresolved dep names come back in `missing`
function chain(rec, resolve) {
  const seen = new Set(), list = [], missing = [];
  const add = (t, pack) => {
    if (seen.has(t)) return; seen.add(t);
    for (const d of t.deps ?? []) { const dt = resolve(d); if (dt) add(dt, pack); else if (!missing.includes(d)) missing.push(d); }
    list.push(t);
  };
  add(rec.t, rec.pack);
  return { list, missing };
}

function buildShader(rec, resolve) {
  const { list, missing } = chain(rec, resolve);
  const body = list.map((t) => t.glsl).join("\n") + "\n" + (rec.t.demo ?? "");
  const have = new Set();
  const decl = [];
  const add = (n, ty) => { if (!have.has(n) && !declares(body, n)) { have.add(n); decl.push(`uniform ${ty} ${n};`); } };
  add("uTime", "float"); add("uAspect", "float");
  if (!declares(body, "vUv")) decl.push("varying vec2 vUv;");
  if (rec.t.demoTex) add("tSrc", "sampler2D");
  for (const t of list) for (const [n, ty] of uniformsOf(t)) add(n, ty);
  const main = rec.t.demo
    ? `void main() { vec3 c = demo(vec2(vUv.x * uAspect, vUv.y), uTime); gl_FragColor = vec4(pow(clamp(c, 0.0, 1.0), vec3(1.0 / 2.2)), 1.0); }`
    : "void main() { gl_FragColor = vec4(vUv, uTime * 0.0 + uAspect * 0.0, 1.0); }";
  return { src: `${PRE}${decl.join("\n")}\n${body}\n${main}\n`, missing };
}

async function compileAll(recs, all, bin, onProgress) {
  const resolve = makeResolver(all), dir = mkdtempSync(path.join(os.tmpdir(), "shader-cat-"));
  const out = new Array(recs.length);
  let next = 0, done = 0;
  const one = async (i) => {
    const r = recs[i], { src, missing } = buildShader(r, resolve);
    if (missing.length) return { compiles: false, error: `missing dependency: ${missing.join(", ")}` };
    if (!bin) return { compiles: "unchecked", error: "" };
    const f = path.join(dir, `${i}.frag`);
    writeFileSync(f, src);
    return new Promise((ok) => execFile(bin, ["-S", "frag", f], { maxBuffer: 1 << 24 }, (e, so) => {
      if (!e) return ok({ compiles: true, error: "" });
      const line = String(so).split(/\r?\n/).find((l) => /^ERROR:/.test(l) && !/compilation errors?\./.test(l)) ?? String(so).split(/\r?\n/).find((l) => l.trim()) ?? String(e.message);
      ok({ compiles: false, error: line.replace(f, "shader").replace(/\\/g, "/").slice(0, 220) });
    }));
  };
  await Promise.all(Array.from({ length: 12 }, async () => { for (;;) { const i = next++; if (i >= recs.length) return; out[i] = await one(i); if (++done % 250 === 0) onProgress?.(done); } }));
  rmSync(dir, { recursive: true, force: true });
  return out;
}

// ---- 4. records ---------------------------------------------------------------------------------------------------
// description fields a module carries itself (packet.js files and the family packs): copied as-is, rated "real" unless the module says otherwise
function fromModule(t) {
  if (!t.draws) return {};
  const list = (v) => (Array.isArray(v) ? v.join(", ") : v);
  const o = { draws: t.draws, use: t.use, suits: list(t.suits), params: list(t.params), quality: t.quality ?? "real" };
  return Object.fromEntries(Object.entries(o).filter(([, v]) => v !== undefined));
}

// quality is exactly real | thin | alias; free text ("alias (same code as X)") moves to qualityNote, the entry it names to aliasOf
function normQuality(recs) {
  const byName = new Map();
  for (const r of recs) (byName.get(r.name) ?? byName.set(r.name, []).get(r.name)).push(r);
  for (const r of recs) {
    if (r.quality === undefined) continue;
    const m = /^\s*(real|thin|alias)\b[\s:(,-]*([\s\S]*?)\)?\s*$/i.exec(String(r.quality));
    if (!m) { r.qualityNote = String(r.quality); delete r.quality; continue; }
    const note = m[2].trim();
    if (note) r.qualityNote = String(r.quality).trim();
    r.quality = m[1].toLowerCase();
    if (r.quality === "alias" && !r.aliasOf && !note) {
      const named = [...`${r.draws ?? ""} ${r.doc ?? ""}`.matchAll(/\b(?:as|to|like|from|of)\s+(?:the\s+)?([A-Za-z_]\w{4,})/g)].map((m) => m[1]).find((w) => w !== r.name && byName.has(w));
      const c = named ? byName.get(named) : [];
      const hit = c.find((x) => x.pack === r.pack && x.sub === r.sub) ?? c.find((x) => x.pack === r.pack) ?? c[0];
      r.aliasOf = hit ? idOf(hit) : r.dupOf ?? r.likeOf ?? undefined;
      if (r.aliasOf === undefined) delete r.aliasOf;
    }
    if (!note || r.quality !== "alias") continue;
    const word = (note.match(/[A-Za-z_]\w*/g) ?? []).find((w) => byName.has(w) && w !== r.name);
    if (!word) { r.aliasOf = note; continue; }
    const c = byName.get(word).filter((x) => x !== r);
    r.aliasOf = idOf(c.find((x) => x.sub && note.includes(x.sub)) ?? c.find((x) => x.pack === r.pack && x.sub === r.sub) ?? c[0]);
  }
  return recs;
}

function record({ t, pack, sub }, file) {
  const glsl = t.glsl, fns = glslFunctions(glsl);
  const own = declaredUniforms(glsl), obj = uniformsOf(t);
  const uniforms = [...new Map([...own, ...obj.map(([n, ty]) => [n, own.get(n) ?? ty])]).entries()].map(([name, type]) => ({ name, type }));
  const flat = stripComments(glsl);
  const names = [...new Set(fns.map((f) => f.name))];
  let shape = flat.replace(/\s+/g, "");
  names.forEach((n, i) => { shape = shape.replace(new RegExp(`\\b${n}\\b`, "g"), `@f${i}`); });
  shape = shape.replace(NUM, "0");
  return { name: t.base ?? t.name, pack, sub, ...fromModule(t), pull: t.name, family: t.family ?? "", file, doc: t.doc ?? "", deps: t.deps ?? [], uniforms, functions: fns.map((f) => f.sig), lines: glsl.split("\n").length,
    registered: TOOLS.includes(t), hasDemo: Boolean(t.demo), compiles: "unchecked", error: "", hash: sha(flat.replace(/\s+/g, "")), shape: sha(shape), dupOf: null, likeOf: null, nameClash: [], fnClash: [], _fns: fns, _t: t };
}

function relate(recs) {
  const byHash = new Map(), byShape = new Map(), byName = new Map(), byFn = new Map();
  for (const r of recs) {
    const id = idOf(r);
    if (byHash.has(r.hash)) r.dupOf = byHash.get(r.hash); else byHash.set(r.hash, id);
    const g = byShape.get(r.shape) ?? [];
    const prior = g.find((x) => x.hash !== r.hash);
    if (prior) r.likeOf = idOf(prior);
    g.push(r); byShape.set(r.shape, g);
    (byName.get(r.name) ?? byName.set(r.name, []).get(r.name)).push(id);
    for (const k of new Set(r._fns.map((f) => f.key))) (byFn.get(k) ?? byFn.set(k, []).get(k)).push(id);
  }
  for (const r of recs) {
    const id = idOf(r);
    r.nameClash = byName.get(r.name).filter((x) => x !== id);
    r.fnClash = [...new Set(r._fns.map((f) => f.key))].filter((k) => byFn.get(k).length > 1)
      .map((k) => ({ fn: k, n: byFn.get(k).length - 1, with: byFn.get(k).filter((x) => x !== id).slice(0, 3) }));
  }
  return { nameGroups: [...byName.values()].filter((v) => v.length > 1), fnGroups: [...byFn.values()].filter((v) => v.length > 1) };
}

const strip = (r) => Object.fromEntries(Object.entries(r).filter(([k]) => k !== "_fns" && k !== "_t"));
const cmp = (a, b) => a.pack.localeCompare(b.pack) || a.sub.localeCompare(b.sub) || a.name.localeCompare(b.name);

async function buildAll(bin) {
  const ents = await enumerate(), where = locator();
  const recs = ents.map((e) => record(e, where(e.pack, e.t.base ?? e.t.name))).sort(cmp);
  recs.qualify = ents.qualify;
  const all = recs.map((r) => ({ t: r._t, pack: r.pack }));
  const res = await compileAll(all, all, bin, (n) => process.stdout.write(`  compiled ${n}/${recs.length}\r`));
  recs.forEach((r, i) => Object.assign(r, res[i]));
  const groups = relate(recs);
  return { recs, groups };
}

function writeGen(recs) {
  const skip = recs.filter((r) => r.compiles === false).map(idOf).sort();
  const resolve = makeResolver(recs.map((r) => ({ t: r._t, pack: r.pack }))), packOf = new Map(recs.map((r) => [r._t, r.pack]));
  const needs = {};
  for (const r of recs) for (const d of r.deps) { const dt = resolve(d), p = dt && packOf.get(dt); if (p && p !== r.pack && p !== "core") (needs[r.pack] ??= new Set()).add(p); }
  const body = `// Generated by scripts/shader-catalog.mjs. QUALIFY: names shared by several tools (filed only as pack/[dock/]name). SKIP: ids ("pack/[dock/]name") of tools that failed the GLSL compile check. NEEDS: packs a pack's tools depend on.\n`
    + `export const SKIP = ${JSON.stringify(skip, null, 2)};\nexport const NEEDS = ${JSON.stringify(Object.fromEntries(Object.entries(needs).map(([k, v]) => [k, [...v].sort()])), null, 2)};\nexport const QUALIFY = ${JSON.stringify([...recs.qualify].sort(), null, 2)};\n`;
  writeFileSync(GEN, body);
}

function summary(recs, groups, bin) {
  const per = {};
  for (const r of recs) { const p = (per[r.pack] ??= { n: 0, ok: 0, bad: 0, un: 0 }); p.n++; r.compiles === true ? p.ok++ : r.compiles === false ? p.bad++ : p.un++; }
  console.log(`\nshader catalogue: ${recs.length} tools, validator: ${bin ?? "NONE FOUND - every compile result is unchecked"}`);
  for (const [k, v] of Object.entries(per)) console.log(`  ${k.padEnd(11)} ${String(v.n).padStart(4)}   compiled ${v.ok}  failed ${v.bad}  unchecked ${v.un}`);
  const c = (f) => recs.filter(f).length;
  console.log(`  total: compiled ${c((r) => r.compiles === true)}, failed ${c((r) => r.compiles === false)}, unchecked ${c((r) => r.compiles === "unchecked")}`);
  console.log(`  exact duplicates ${c((r) => r.dupOf)}, near-copies ${c((r) => r.likeOf)} (same shape, different constants or function names)`);
  console.log(`  name collisions: ${groups.nameGroups.length} names shared by ${groups.nameGroups.reduce((a, g) => a + g.length, 0)} tools; function collisions: ${groups.fnGroups.length} functions defined by more than one tool`);
  console.log(`  not located in a file: ${c((r) => !r.file)}; with demo: ${c((r) => r.hasDemo)}; registered in TOOLS: ${c((r) => r.registered)}`);
  const bad = recs.filter((r) => r.compiles === false).slice(0, 8);
  for (const r of bad) console.log(`  FAIL ${idOf(r)}: ${r.error}`);
}

// ---- modes --------------------------------------------------------------------------------------------------------
async function modeBuild() {
  const bin = await findValidator();
  if (!bin) console.log("WARNING: glslangValidator not found (PATH, VULKAN_SDK, C:/VulkanSDK). Nothing is compiled; records say \"unchecked\".");
  const old = existsSync(CATALOG) ? new Map(JSON.parse(readFileSync(CATALOG, "utf8")).map((r) => [idOf(r), r])) : new Map();
  const { recs, groups } = await buildAll(bin);
  for (const r of recs) { const o = old.get(idOf(r)); if (o) for (const k of [...DESC, "qualityNote", "aliasOf"]) if (r[k] === undefined && o[k] !== undefined) r[k] = o[k]; }
  normQuality(recs);
  writeGen(recs);
  writeFileSync(CATALOG, JSON.stringify(recs.map(strip), null, 1) + "\n");
  summary(recs, groups, bin);
  console.log(`  wrote ${rel(CATALOG)} and ${rel(GEN)}`);
}

async function modeCheck(file) {
  const bin = await findValidator();
  if (!bin) { console.log("glslangValidator not found: cannot check. Exiting 1 rather than pretending."); return 1; }
  const abs = path.resolve(file), mod = await import(pathToFileURL(abs).href);
  const rp = path.relative(TOOLS_DIR, abs).split(path.sep), pack = rp[0] && !rp[0].startsWith("..") && rp.length > 1 ? rp[0] : "core";
  const mine = collectTools(mod);
  if (!mine.length) { console.log(`no tool modules exported by ${file}`); return 1; }
  const ents = await enumerate();
  for (const t of mine) if (!ents.some((e) => e.t === t)) ents.push({ t, pack, sub: "" });
  const recs = mine.map((t) => ({ t, pack, sub: "" }));
  const res = await compileAll(recs, ents, bin);
  let bad = 0;
  recs.forEach((r, i) => { if (res[i].compiles !== true) { bad++; console.log(`FAIL ${r.t.name}: ${res[i].error}`); } });
  console.log(`${file}: ${mine.length} tools, ${mine.length - bad} compile, ${bad} fail`);
  return bad ? 1 : 0;
}

function modeMerge(dir) {
  const recs = JSON.parse(readFileSync(CATALOG, "utf8")), by = new Map(recs.map((r) => [idOf(r), r]));
  const byPN = new Map();
  for (const r of recs) (byPN.get(`${r.pack}/${r.name}`) ?? byPN.set(`${r.pack}/${r.name}`, []).get(`${r.pack}/${r.name}`)).push(r);
  let merged = 0, miss = [];
  for (const f of readdirSync(dir).filter((x) => x.endsWith(".json")).sort()) {
    let arr; try { arr = JSON.parse(readFileSync(path.join(dir, f), "utf8")); } catch (e) { console.log(`skip ${f}: ${e.message}`); continue; }
    for (const d of arr) { const alt = byPN.get(`${d.pack}/${d.name}`), r = by.get(idOf(d)) ?? (alt?.length === 1 ? alt[0] : undefined); if (!r) { miss.push(`${f}: ${idOf(d)}`); continue; } for (const k of DESC) if (d[k] !== undefined) r[k] = d[k]; merged++; }
  }
  normQuality(recs);
  writeFileSync(CATALOG, JSON.stringify(recs, null, 1) + "\n");
  const described = recs.filter((r) => r.draws).length;
  console.log(`merged ${merged} descriptions; ${described}/${recs.length} tools now have "draws"; ${miss.length} unmatched${miss.length ? ":\n  " + miss.slice(0, 10).join("\n  ") : ""}`);
}

const cell = (s, n = 150) => String(s ?? "").replace(/\s+/g, " ").replace(/\|/g, "\\|").slice(0, n);
const mark = (c) => (c === true ? "yes" : c === false ? "NO" : "unchecked");

function modeDocs() {
  const recs = JSON.parse(readFileSync(CATALOG, "utf8")), packs = [...new Set(recs.map((r) => r.pack))];
  mkdirSync(path.join(ROOT, "docs/shaders"), { recursive: true });
  const lines = [];
  for (const p of packs) {
    const rs = recs.filter((r) => r.pack === p), ok = rs.filter((r) => r.compiles === true).length;
    const hasSub = rs.some((r) => r.sub);
    lines.push(`- [${p}](${p}.md): ${rs.length} tools, ${ok} compile${rs.some((r) => r.compiles === false) ? `, ${rs.filter((r) => r.compiles === false).length} fail` : ""}${p === "core" ? " (registered in TOOLS already)" : ""}`);
    const head = [`# ${p}`, "", `${rs.length} tools. ${p === "core" ? "These are in TOOLS already: glslFor([name])." : `Pull one: await loadPack("${p}"), then glslFor(["<name>"]) from lib/anime/tools/index.js.`}`, "",
      `| name | ${hasSub ? "dock | " : ""}what it draws | use | suits | inputs | rated | compiles | how to pull it |`, `|${hasSub ? "---|" : ""}---|---|---|---|---|---|---|---|`];
    const rows = rs.map((r) => `| ${cell(r.name)} | ${hasSub ? cell(r.sub) + " | " : ""}${cell(r.draws || r.doc)} | ${cell(r.use)} | ${cell(r.suits)} | ${cell(r.params || r.uniforms.map((u) => u.name).join(", ") || "none", 80)} | ${r.quality ?? ""}${r.aliasOf ? ` (use ${cell(r.aliasOf)})` : ""} | ${mark(r.compiles)} | glslFor(["${cell(r.pull ?? r.name)}"]) |`);
    writeFileSync(path.join(ROOT, `docs/shaders/${p}.md`), [...head, ...rows, ""].join("\n"));
  }
  const n = Object.fromEntries(["real", "thin", "alias"].map((q) => [q, recs.filter((r) => r.quality === q).length]));
  const useList = [...new Set(recs.map((r) => r.use).filter(Boolean))].sort().join(", ");
  const md = `# Shader table

${recs.length} shader tools in ${packs.length} packs, filed so a cutscene can pick them off one table and knit them together.

## Picking a shader

Search a pack table (docs/shaders/<pack>.md) with your editor's find, on two columns:

- **suits** names the cutscene (dock) the shader was written for, or "any". Search the dock name to see everything made for that cutscene, then search "any" for the shared ones.
- **use** says the kind: ${useList}. Search the kind to find, for example, every plate or every grade.

Read the **rated** column before you build on one:

- **real**: a finished shader with its own look (${n.real} of ${recs.length}). Build on these.
- **thin**: a small helper or a plain fill (${n.thin}). Fine as a part of a frame, not as the frame.
- **alias**: the same picture as another entry (${n.alias}); the column names the entry to use instead, as pack/[dock/]name.

To pull one, a cutscene writes these lines, with the pack and name from the table:

\`\`\`js
import { loadPack } from "../../tools/packs.js";
import { glslFor } from "../../tools/index.js";
await loadPack("<pack>");
const glsl = glslFor(["<name from the how-to-pull column>"]);
\`\`\`

## Find one

- One table per pack in docs/shaders/<pack>.md: name, what it draws, use, suits, inputs, whether it compiles, how to pull it.
- The machine-readable table is lib/anime/tools/catalog.json (one record per tool: pack, dock, file, GLSL functions, uniforms, hashes, duplicates, collisions, compile result). Rebuild it with \`node scripts/shader-catalog.mjs\`.
- Thumbnails: \`node scripts/tool-sheet.mjs --pack <name>\` writes verification/shaders/<pack>.jpg. See one live at /lab/anime?tool=<name> after the pack is loaded.

## Use one (two lines in a cutscene)

\`\`\`js
import { loadPack } from "../../tools/packs.js";
await loadPack("jjk");
\`\`\`

Then glslFor(["jjkVoidSpace"]), tool(name) and uniformsFor(...) from lib/anime/tools/index.js see the whole pack. Each pack is a separate dynamic import, so only the loaded packs ship. Code that imports a pack index itself calls registerPack(namespace) instead.

- A tool that failed the compile check is not registered (lib/anime/tools/packs.gen.js, SKIP).
- A name shared by several tools (QUALIFY in packs.gen.js, ${recs.filter((r) => r.nameClash.length).length} tools) registers only as "<pack>/<name>" ("cuts/<dock>/<name>"), so it never depends on load order. The "how to pull it" column gives the exact string for glslFor.
- A dock module in cuts/ calls its dock siblings (worldPlate, stubSky); those are filed as its dependencies, so one name pulls the lot.
- jojo needs its kit (jojoKit); it is filed as a tool and every jojo tool depends on it.
- Two tools that define the same GLSL function cannot share one shader: fnClashes(["a", "b"]) lists them before you build.
- Tools with deps load their kit with them; a pack that needs another pack loads it first (NEEDS in packs.gen.js).

## Packs

${lines.join("\n")}
`;
  writeFileSync(path.join(ROOT, "docs/shaders/README.md"), md);
  console.log(`wrote docs/shaders/README.md and ${packs.length} files in docs/shaders/`);
}

const argv = process.argv.slice(2), arg = (f) => { const i = argv.indexOf(f); return i >= 0 ? argv[i + 1] : undefined; };
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  (async () => {
    if (argv.includes("--check")) { const f = arg("--check"); if (!f) throw new Error("usage: --check <file>"); process.exitCode = await modeCheck(f); return; }
    if (argv.includes("--merge")) { const d = arg("--merge"); if (!d) throw new Error("usage: --merge <dir>"); modeMerge(d); if (argv.includes("--docs")) modeDocs(); return; }
    if (argv.includes("--docs")) { modeDocs(); return; }
    await modeBuild();
  })().catch((e) => { console.log(`shader-catalog: ${e.stack ?? e.message}`); process.exitCode = 1; });
}
