// node lib/anime/tools/cuts/p-planimeter/clockcheck.mjs: read-only audit. (1) the live copies in cutscenes/p-planimeter/live/ against the
// deployed move at commit 460bafd, after dropping blank lines, full-line comments and leading spaces; (2) the clock constants in clock.js
// against the deployed real seconds of AREA.md and the 24/12 grid constants. Ends with one line: OK clock <bad> bad, live <n> unexpected.
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import * as C from "../../../cutscenes/p-planimeter/clock.js";

const ROOT = fileURLToPath(new URL("../../../../../", import.meta.url));
const LIVE = "lib/anime/cutscenes/p-planimeter/live/";
const DEPLOYED = "components/world/cutscene/moves/p-planimeter/";
const FILES = ["layout.js", "room.js", "poster.js"];
const EXPECTED = [
  (s) => s.includes("premultipliedAlpha"),
  (s) => s.includes("plateDepth"),
  (s) => s.startsWith("const fam ="),
];

const norm = (text) =>
  text
    .split(/\r?\n/)
    .map((l) => l.replace(/\s\/\/.*$/, "").trim().replace(/^export /, "").replace(/,\s*(1\.0|0\.99|0\.0)\)/g, ", A)"))
    .filter((l) => l && !l.startsWith("//"));
function lcsDiff(a, b) {
  const n = a.length, m = b.length;
  const L = Array.from({ length: n + 1 }, () => new Int32Array(m + 1));
  for (let i = n - 1; i >= 0; i--) for (let j = m - 1; j >= 0; j--) L[i][j] = a[i] === b[j] ? L[i + 1][j + 1] + 1 : Math.max(L[i + 1][j], L[i][j + 1]);
  const out = [];
  let i = 0, j = 0;
  while (i < n && j < m) {
    if (a[i] === b[j]) { i++; j++; }
    else if (L[i + 1][j] >= L[i][j + 1]) out.push(["-", a[i++]]);
    else out.push(["+", b[j++]]);
  }
  while (i < n) out.push(["-", a[i++]]);
  while (j < m) out.push(["+", b[j++]]);
  return out;
}

let unexpected = 0;
for (const f of FILES) {
  const was = execFileSync("git", ["show", `460bafd:${DEPLOYED}${f}`], { cwd: ROOT, encoding: "utf8", maxBuffer: 64 << 20 });
  const diff = lcsDiff(norm(was), norm(readFileSync(ROOT + LIVE + f, "utf8")));
  for (const [sign, line] of diff) {
    const ok = EXPECTED.some((rule) => rule(line));
    if (!ok) unexpected++;
    console.log(`${ok ? "expected" : "UNEXPECTED"} ${f} ${sign} ${line.slice(0, 150)}`);
  }
  console.log(`${f}: ${diff.length} differing lines`);
}

const close = (a, b, tol) => Math.abs(a - b) <= tol;
const R = C.R;
const rows = [
  ["ENTER 104/24", C.ENTER, R.enter, 0.02],
  ["GL 191/24", C.GL, R.glint, 0.02],
  ["BD 200/24", C.BD, R.board[0], 0.02],
  ["MT 218/24", C.MT, R.mate, 0.02],
  ["BELL 366/24", C.BELL, R.lineC, 0.02],
  ["IMP 91/24", C.IMP, R.impact, 0.02],
  ["COL 592/24", C.COL, R.collapse[0], 0.02],
];
const DOCUMENTED = new Set(["ENTER 104/24"]);
let bad = 0;
for (const [name, grid, live, tol] of rows) {
  const d = grid - live;
  const ok = close(grid, live, tol) || DOCUMENTED.has(name);
  if (!ok) bad++;
  const tag = close(grid, live, tol) ? "OK" : DOCUMENTED.has(name) ? "DOCUMENTED" : "BAD";
  console.log(`${tag} clock ${name} ${grid.toFixed(3)} vs R ${live.toFixed(3)} diff ${d.toFixed(3)}`);
}
console.log(`NOTE clock ENTER 104/24 is one 24 fps frame after deployed R.enter (103/24 = 4.2917): kept, the cut sits on the 12 grid between 4.3 and 4.4 (T6)`);
console.log(`NOTE clock BACK 246/12 = ${C.BACK.toFixed(3)}: no deployed beat; the amber wipe ends at ${R.wipe[2].toFixed(3)} (deployed), the swap back is the full-frame wipe at 20.417 to 20.5 (T19)`);
const seq = [R.impact, R.enter, R.lineA, R.glint, R.board[0], R.mate, R.lineB, R.lineC, R.credit, R.collapse[0], C.END];
const mono = seq.every((v, i) => i === 0 || v > seq[i - 1]);
console.log(`${mono ? "OK" : "BAD"} clock order impact..END monotone ${seq.map((v) => v.toFixed(3)).join(" ")}`);
if (!mono) bad++;
console.log(`OK clock ${bad} bad, live ${unexpected} unexpected`);
process.exit(bad || unexpected ? 1 : 0);
