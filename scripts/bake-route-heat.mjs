// Bakes the route-heat plates of the 8-leg library L8 to public/topo/route-plates.json (format version 1).
//   node scripts/bake-route-heat.mjs            write the file
//   node scripts/bake-route-heat.mjs --check    exit 1 unless the committed file equals a fresh bake
//   --file <path>                               use another file than the committed one
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { makeHexGrid } from "../lib/world/heat/hexgrid.js";
import { routeHeat } from "../lib/world/heat/route-heat.js";
import { SPAWN_PLAY } from "../lib/world/places.js";
import { buildL8, ticksOf, walkLeg } from "../experiments/topological-shader/library.mjs";

const R = 84;
const H = 4;
const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const FILE = join(ROOT, "public", "topo", "route-plates.json");
const round = (v, k) => Math.round(v * 10 ** k) / 10 ** k;

export function bakeRoutePlates() {
  const grid = makeHexGrid(R, H);
  const legs = buildL8().map((leg) => {
    const from = leg.from === "spawn" ? SPAWN_PLAY : leg.from;
    const heat = Array.from(routeHeat(grid, ticksOf(walkLeg(leg.start, leg.end))), (v) => round(v, 4));
    return JSON.stringify({ id: `${from}-to-${leg.to}`, from, to: leg.to, lengthM: round(leg.length, 1), heat });
  });
  return `{"version":1,"grid":{"R":${R},"h":${H},"n":${grid.n}},"legs":[\n${legs.join(",\n")}\n]}\n`;
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const args = process.argv.slice(2);
  const at = args.indexOf("--file");
  const file = at >= 0 ? args[at + 1] : FILE;
  const fresh = bakeRoutePlates();
  if (args.includes("--check")) {
    let have = null;
    try {
      have = readFileSync(file, "utf8").replace(/\r\n/g, "\n");
    } catch {}
    if (have !== fresh) {
      console.error(`bake-route-heat: ${file} differs from a fresh bake`);
      process.exit(1);
    }
    console.log("bake-route-heat: committed plates match a fresh bake");
  } else {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, fresh);
    console.log(`bake-route-heat: wrote ${file} (${fresh.length} bytes)`);
  }
}
