// Line-by-line check that the live copy in cutscenes/pr-pyrefly-4180/live/ is the live move's own code.
// Run: node lib/anime/tools/cuts/pr-pyrefly-4180/portdiff.mjs. Prints SAME or DIFF per file; exit 1 on any DIFF.
// Both sides lose comments, CR, trailing and repeated spaces and blank lines; import suffixes compare as ".js".
// The one allowed code change is the alpha of opaque paper materials (uOp 0.99), applied to the live side only.
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../../../..");
const SRC = path.join(ROOT, "components/world/cutscene/moves/pr-pyrefly-4180");
const LIVE = path.join(ROOT, "lib/anime/cutscenes/pr-pyrefly-4180/live");
const FILES = ["chain", "paper", "puppets", "world"];
const ALLOW = { paper: [["uOp: { value: opacity }", "uOp: { value: opacity >= 1 ? 0.99 : opacity }"]] };

const norm = (line) =>
  line
    .replace(/\/\*.*?\*\//g, "")
    .replace(/(^|\s)\/\/.*$/, "$1")
    .replace(/from "\.\/([A-Za-z0-9_]+)(\.js)?"/g, 'from "./$1.js"')
    .trim()
    .replace(/ {2,}/g, " ");

const lines = (text) => text.replace(/\r/g, "").split("\n").map(norm).filter((l) => l !== "");

const srcLines = (name) => {
  let text = readFileSync(path.join(SRC, `${name}.js`), "utf8");
  for (const [from, to] of ALLOW[name] ?? []) text = text.split(from).join(to);
  return lines(text);
};

let bad = 0;
for (const name of FILES) {
  let live;
  try {
    live = lines(readFileSync(path.join(LIVE, `${name}.js`), "utf8"));
  } catch {
    console.log(`DIFF ${name}.js missing in live/`);
    bad++;
    continue;
  }
  const src = srcLines(name);
  const n = Math.max(src.length, live.length);
  const pairs = [];
  for (let i = 0; i < n; i++) if (src[i] !== live[i]) pairs.push([i + 1, src[i] ?? "<end>", live[i] ?? "<end>"]);
  if (pairs.length === 0) {
    console.log(`SAME ${name}.js ${live.length} lines`);
  } else {
    bad++;
    console.log(`DIFF ${name}.js ${pairs.length} lines`);
    for (const [ln, s, l] of pairs.slice(0, 20)) console.log(`  line ${ln}\n    src  ${s.slice(0, 200)}\n    live ${l.slice(0, 200)}`);
  }
}
process.exit(bad ? 1 : 0);
