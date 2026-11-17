// node scripts/shader-pulls.mjs <dock> [--also pack1,pack2] [--use plate,grade,...] [--limit 60] : the shader-table entries a cutscene can pull instead of writing GLSL
// Lists real, compiling tools whose "suits" names the dock (or "any" in the --also packs), with their one-line description, inputs and the exact pull string for glslFor.
import { readFileSync } from "node:fs";
const catalog = JSON.parse(readFileSync(new URL("../lib/anime/tools/catalog.json", import.meta.url), "utf8"));
const all = Array.isArray(catalog) ? catalog : (catalog.tools ?? Object.values(catalog));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(`--${k}`); return i >= 0 && argv[i + 1] ? argv[i + 1] : d; };
const dock = argv.find((a, i) => !a.startsWith("--") && !(i && argv[i - 1].startsWith("--")));
if (!dock) throw new Error("usage: shader-pulls.mjs <dock> [--also pack,pack] [--use kind,kind] [--limit n]");
const also = new Set(opt("also", "").split(",").filter(Boolean));
const uses = new Set(opt("use", "").split(",").filter(Boolean));
const limit = Number(opt("limit", 60));
const suits = (t) => (Array.isArray(t.suits) ? t.suits : String(t.suits ?? "").split(/,\s*/)).map((s) => s.trim());
const mine = (t) => suits(t).includes(dock);
const shared = (t) => also.has(t.pack) && suits(t).includes("any");
const rows = all.filter((t) => t.quality === "real" && t.compiles !== false && (mine(t) || shared(t)) && (!uses.size || uses.has(t.use)));
rows.sort((a, b) => Number(mine(b)) - Number(mine(a)) || a.pack.localeCompare(b.pack) || a.name.localeCompare(b.name));
console.log(`# Shader-table pulls for ${dock}: ${rows.length} real entries (${rows.filter(mine).length} written for it, ${rows.length - rows.filter(mine).length} shared from ${[...also].join(", ") || "no extra packs"})\n`);
console.log("Pull: `await loadPack(\"<pack>\"); const glsl = glslFor([\"<pull name>\"]);` (imports: loadPack from lib/anime/tools/packs.js, glslFor from lib/anime/tools/index.js). Two tools that define the same GLSL function clash: check fnClashes([...]) first.\n");
console.log("| pack | name | use | draws | inputs | pull |\n|---|---|---|---|---|---|");
for (const t of rows.slice(0, limit)) console.log(`| ${t.pack} | ${t.name} | ${t.use} | ${String(t.draws ?? "").replace(/\|/g, "/").slice(0, 150)} | ${String(t.params ?? "").replace(/\|/g, "/").slice(0, 120)} | ${String(t.pull ?? "").replace(/\|/g, "/")} |`);
if (rows.length > limit) console.log(`\n(${rows.length - limit} more: raise --limit or filter with --use)`);
