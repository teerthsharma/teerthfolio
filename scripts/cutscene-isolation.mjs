// Static isolation check: a cutscene (lib/anime/cutscenes/<dock>/) may import only the shared engine
// (lib/anime/{tools,kit,fx,sky,post}, lib/anime/pup.js, cutscenes/framework*) and its OWN folder. Never another cutscene.
// Usage: node scripts/cutscene-isolation.mjs   (exit 1 on any violation)
import fs from "fs"; import path from "path";
const CUTS = path.resolve("lib/anime/cutscenes"), ANIME = path.resolve("lib/anime");
const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).flatMap((e) => e.isDirectory() ? walk(path.join(d, e.name)) : e.name.endsWith(".js") ? [path.join(d, e.name)] : []);
const docks = fs.readdirSync(CUTS, { withFileTypes: true }).filter((e) => e.isDirectory() && !["framework", "_template"].includes(e.name)).map((e) => e.name);
const bad = []; let files = 0;
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, "").replace(/(^|[^:])\/\/.*$/gm, "$1"); // drop comments so prose cannot trip it
for (const d of docks) {
  const own = path.join(CUTS, d) + path.sep;
  for (const f of walk(path.join(CUTS, d))) {
    files++;
    const s = strip(fs.readFileSync(f, "utf8"));
    for (const m of s.matchAll(/(?:from\s*|import\s*\(?\s*)["'](\.[^"']*)["']/g)) {
      const r = path.resolve(path.dirname(f), m[1]);
      // shared engine = anything under lib/anime outside cutscenes/; inside cutscenes only the own folder and framework*
      const inCuts = (r + path.sep).startsWith(CUTS + path.sep);
      const ok = !inCuts || (r + path.sep).startsWith(own) || (path.basename(r).startsWith("framework") && path.dirname(r) === CUTS);
      if (!ok) bad.push(`${path.relative(ANIME, f)} -> ${m[1]}`);
    }
  }
}
console.log(`cutscene-isolation: ${docks.length} docks, ${files} files, ${bad.length} violations`);
for (const b of bad) console.log("  " + b);
process.exit(bad.length ? 1 : 0);
