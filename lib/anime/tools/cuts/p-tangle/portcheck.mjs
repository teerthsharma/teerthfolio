// PORT check for p-tangle: live/*.js against the deployed commit 460bafd, and the clock against AREA.md. Exit 1 on DRIFT.
// Not drift: comments, whitespace, the .js import suffix, the 0.99 id alpha (gl.js OUT, cord.js core), and the ALLOW needles.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import * as C from "../../../cutscenes/p-tangle/clock.js";

const ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));
const COMMIT = "460bafd";
const SITE = "components/world/cutscene/moves/p-tangle";
const LIVE = "lib/anime/cutscenes/p-tangle/live";
const FILES = ["gl", "land", "cord", "girl", "shrine", "fx", "world"];
// 40-char needles of the T3 and T4 edits in live/fx.js; each land ticket appends its needle here with a reason.
const ALLOW = [];
const ALPHA_FROM = "vec4(pow(max(col,vec3(0.0)),vec3(2.2)),1.0)";
const ALPHA_TO = "vec4(pow(max(col,vec3(0.0)),vec3(2.2)),0.99)";

const git = (path) => execFileSync("git", ["show", `${COMMIT}:${path}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 1 << 26 });
const strip = (src) => src
  .replace(/\r/g, "")
  .replace(/\/\*[\s\S]*?\*\//g, "")
  .split("\n")
  .map((l) => l.replace(/\/\/.*$/, "").replace(/\s+/g, ""))
  .filter(Boolean);
const liveSide = (src) => strip(src).map((l) => l.replace(/from"\.\/(\w+)"/g, 'from"./$1.js"').replaceAll(ALPHA_FROM, ALPHA_TO));

const hunks = (a, b) => {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0, cur = null;
  while (i < n || j < m) {
    if (i < n && j < m && a[i] === b[j]) { cur = null; i++; j++; continue; }
    if (!cur) { cur = { a: [], b: [] }; out.push(cur); }
    if (j >= m || (i < n && L[i + 1][j] >= L[i][j + 1])) cur.a.push(a[i++]);
    else cur.b.push(b[j++]);
  }
  return out;
};

let drift = 0;
for (const f of FILES) {
  const live = liveSide(git(`${SITE}/${f}.js`));
  const port = strip(readFileSync(join(ROOT, LIVE, `${f}.js`), "utf8"));
  for (const h of hunks(live, port)) {
    const allowed = h.b.length && ALLOW.some((n) => h.b.join("").includes(n));
    if (allowed) { console.log(`ALLOW ${f}.js: ${h.b.join("").slice(0, 80)}`); continue; }
    drift++;
    console.log(`DRIFT ${f}.js live: ${h.a.join("").slice(0, 80)} | port: ${h.b.join("").slice(0, 80)}`);
  }
}
console.log(drift ? `${drift} DRIFT hunk(s) in live/` : `live/ matches ${COMMIT} (${FILES.length} files)`);

const near = (x, y) => Math.abs(x - y) < 0.0006;
const clock = [
  ["unwarp(7.9)", C.unwarp(7.9), 10.2],
  ["unwarp(9.7)", C.unwarp(9.7), 13.874],
  ["unwarp(10.3)", C.unwarp(10.3), 15.2],
  ["warp(22.4)", C.warp(22.4), 15.3],
];
let bad = 0;
for (const [name, got, want] of clock) {
  const ok = near(got, want);
  if (!ok) bad++;
  console.log(`${ok ? "ok  " : "BAD "} ${name} = ${got.toFixed(3)} (AREA.md ${want.toFixed(3)})`);
}
const AREA = { sign: [0.45, 1.05], impact: 1.15, bloom: [1.15, 1.6], enter: 1.95, lineA: 3, move: [7.7, 8.6], lineB: 8.6, lineC: 16.4, credit: 22.4, collapse: [27.8, 28.4], duration: 28.6 };
const KEY = { lineA: "A", lineB: "B", lineC: "C", duration: "length" };
const lineBad = Object.keys(AREA).filter((k) => JSON.stringify(C.LINE[KEY[k] ?? k]) !== JSON.stringify(AREA[k]));
console.log(lineBad.length ? `BAD LINE ${lineBad.join(" ")}` : "ok   LINE equals AREA.md (lineA=A, lineB=B, lineC=C, duration=length)");
bad += lineBad.length;

const pass = drift === 0 && bad === 0;
console.log(pass ? "PORT OK" : "PORT FAIL");
if (!pass) process.exitCode = 1;
