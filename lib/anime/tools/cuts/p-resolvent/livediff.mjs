// node lib/anime/tools/cuts/p-resolvent/livediff.mjs: proves each live/ file is its deployed original plus the allowed differences only.
// Prints one DRIFT line per difference outside that set (exit 1), then checks the clock against AREA.md; prints SAME when all hold.
import { readFileSync } from "node:fs";
import * as acorn from "acorn";
import { LINES, R, beatT, realAt } from "../../../cutscenes/p-resolvent/clock.js";

const ROOT = new URL("../../../../../", import.meta.url);
const LIVE = "lib/anime/cutscenes/p-resolvent/live/";
const MOVES = "components/world/cutscene/moves/";
const PAIRS = [
  { live: "toon.js", orig: `${MOVES}p-resolvent/toon.js`, named: ["pupCel"] },
  { live: "cel.js", orig: "components/world/cutscene/cel.js", named: ["celMaterial", "hullMaterial", "celFigure", "BUILDS"] },
  { live: "cast.js", orig: `${MOVES}p-resolvent/cast.js`, named: ["frierenKit"] },
  { live: "world.js", orig: `${MOVES}p-resolvent/world.js`, named: [] },
  { live: "fx.js", orig: `${MOVES}p-resolvent/fx.js`, named: ["flashQuad"] },
  { live: "letters.js", orig: `${MOVES}p-caustic/parts.js`, named: [], only: "lettering" },
];
const ALPHA_OK = [["1.0", "0.0"], ["1.0", "0.99"], ["uOpacity", "uOpacity < 0.999 ? uOpacity : 0.99"]];

const read = (p) => readFileSync(new URL(p, ROOT), "utf8");
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:"'\\])\/\/[^\n]*/g, "$1");
const toLines = (s) => strip(s).replace(/\s+/g, " ").trim().replace(/([;{}])/g, "$1\n").split("\n").map((l) => l.trim()).filter(Boolean);
const canon = (s) => toLines(s).join("\n");
const PREMUL = /premultipliedAlpha:\s*true,\s*/g;
const base = (p) => p.replace(/\.js$/, "").split("/").pop();

function statements(src) {
  const out = [];
  for (const node of acorn.parse(src, { ecmaVersion: "latest", sourceType: "module" }).body) {
    const text = src.slice(node.start, node.end);
    if (node.type === "ImportDeclaration") {
      const mod = node.source.value.replace(/\.js$/, "");
      for (const s of node.specifiers) out.push({ key: `import ${s.local.name}`, names: [s.local.name], text: `${s.local.name} from ${mod}`, raw: node.source.value });
      continue;
    }
    const d = node.type === "ExportNamedDeclaration" ? node.declaration : node;
    let names = [];
    if (d?.type === "FunctionDeclaration" || d?.type === "ClassDeclaration") names = [d.id.name];
    else if (d?.type === "VariableDeclaration") names = d.declarations.map((v) => v.id.name);
    out.push({ key: names.join(",") || text.slice(0, 40), names, text });
  }
  return out;
}

function hunks(a, b) {
  const n = a.length, m = b.length;
  const dp = Array.from({ length: n + 1 }, () => new Uint32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) dp[i][j] = a[i] === b[j] ? dp[i + 1][j + 1] + 1 : Math.max(dp[i + 1][j], dp[i][j + 1]);
  const out = [];
  let cur = null, i = 0, j = 0;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { i++; j++; cur = null; continue; }
    if (!cur) { cur = { del: [], add: [] }; out.push(cur); }
    if (j < m && (i >= n || dp[i][j + 1] >= dp[i + 1][j])) cur.add.push(b[j++]);
    else cur.del.push(a[i++]);
  }
  return out;
}

const parts = (l) => {
  const m = /^(.*), ([^,()]+)\);$/.exec(l);
  return m ? { pre: m[1], alpha: m[2] } : null;
};
function pairKind(r, a) {
  const x = parts(r), y = parts(a);
  if (!x || !y) return null;
  if (x.pre === y.pre && ALPHA_OK.some(([p, q]) => x.alpha === p && y.alpha === q)) return "fragment alpha";
  if (y.pre === `${x.pre} * a` && x.alpha === "a" && y.alpha === "a") return "premultiplied rgb";
  return null;
}
function shadowKind(r, add) {
  const m = /^gl_FragColor = vec4\((.*), ([^,()]+)\);$/.exec(r);
  if (!m) return null;
  return add[0] === `float a = ${m[2]};` && add[1] === `gl_FragColor = vec4(${m[1]} * a, a);` ? "premultiplied shadow" : null;
}
function classify(h) {
  if (h.add.length === 0) return null;
  if (h.del.length === h.add.length) {
    const kinds = h.del.map((r, k) => pairKind(r, h.add[k]));
    return kinds.every(Boolean) ? kinds : null;
  }
  if (h.del.length === 1 && h.add.length === 2) { const k = shadowKind(h.del[0], h.add); return k ? [k] : null; }
  return null;
}

function comparePair({ live, orig, named, only }) {
  const drift = [];
  const count = {};
  const tally = (k, n = 1) => (count[k] = (count[k] ?? 0) + n);
  const keep = (s) => !only || s.names.includes(only);
  const O = statements(read(orig)).filter(keep);
  const L = statements(read(LIVE + live)).filter(keep);
  const byL = new Map(L.map((s) => [s.key, s]));
  const byO = new Map(O.map((s) => [s.key, s]));
  const removed = O.filter((s) => !byL.has(s.key));
  const allowed = new Set(removed.filter((s) => s.names.some((n) => named.includes(n))).map((s) => s.key));
  for (let grew = true; grew; ) {
    grew = false;
    for (const s of removed) {
      if (allowed.has(s.key)) continue;
      const users = O.filter((o) => o !== s && s.names.some((n) => new RegExp(`\\b${n}\\b`).test(canon(o.text))));
      if (users.length && users.every((u) => allowed.has(u.key))) { allowed.add(s.key); grew = true; }
    }
  }
  for (const s of removed) {
    if (allowed.has(s.key)) tally("named deletion");
    else drift.push(`DRIFT ${live} removed ${s.key}`);
  }
  for (const s of L) if (!byO.has(s.key)) drift.push(`DRIFT ${live} added ${s.key}`);
  for (const o of O) {
    const l = byL.get(o.key);
    if (!l) continue;
    if (o.raw !== undefined) {
      if (o.raw === l.raw) continue;
      if (base(o.raw) !== base(l.raw) || !l.raw.startsWith("./")) drift.push(`DRIFT ${live} import ${o.key}: from ${o.raw} -> from ${l.raw}`);
      else tally(o.raw.replace(/\.js$/, "") === l.raw.replace(/\.js$/, "") ? "import suffix" : "import path (relocated sibling)");
      continue;
    }
    const premul = (l.text.match(PREMUL) ?? []).length;
    if (premul) tally("premultipliedAlpha token", premul);
    const a = canon(o.text), b = canon(l.text.replace(PREMUL, ""));
    if (a === b) continue;
    for (const h of hunks(a.split("\n"), b.split("\n"))) {
      const kinds = classify(h);
      if (kinds) for (const k of kinds) tally(k);
      else drift.push(`DRIFT ${live} ${o.key}: ${h.del.join(" | ") || "(nothing)"} -> ${h.add.join(" | ") || "(nothing)"}`);
    }
  }
  if (only && !L.length) drift.push(`DRIFT ${live} has no ${only} (ported under another name; fx/letters.js imports letteringCanvas)`);
  return { live, drift, count };
}

const results = PAIRS.map(comparePair);
for (const r of results) {
  for (const line of r.drift.slice(0, 12)) console.log(line.slice(0, 400));
  console.log(`file ${r.live}: allowed ${JSON.stringify(r.count)} drift ${r.drift.length}`);
}

const near = (a, b) => Math.abs(a - b) <= 0.02;
const checks = [
  ["R.release", R.release, 11.37], ["R.brk", R.brk, 12.41], ["R.dis[0]", R.dis[0], 18.07],
  ["R.pill[0]", R.pill[0], 18.61], ["R.pill[1]", R.pill[1], 25.53], ["R.wipe[0]", R.wipe[0], 22.21], ["R.wipe[1]", R.wipe[1], 23.05],
  ["R.credit[0]", R.credit[0], 23.05], ["R.credit[1]", R.credit[1], 27.35], ["realAt(20)", realAt(20), 29.85], ["beatT(11)", beatT(11), 7.46],
];
let clockOk = true;
for (const [name, got, want] of checks) {
  const ok = near(got, want);
  clockOk &&= ok;
  console.log(`${ok ? "PASS" : "FAIL"} clock ${name} ${got.toFixed(3)} want ${want}`);
}
const who = LINES.map((l) => l.who).join(",");
const whoOk = who === "aura,seal,seal";
clockOk &&= whoOk;
console.log(`${whoOk ? "PASS" : "FAIL"} clock LINES who ${who}`);

const driftCount = results.reduce((n, r) => n + r.drift.length, 0);
if (driftCount === 0 && clockOk) console.log("SAME");
process.exit(driftCount === 0 && clockOk ? 0 : 1);
