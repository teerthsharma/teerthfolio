import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

const root = process.cwd();
const read = (path) => readFileSync(join(root, path), "utf8");
const authoredSurfaces = [
  "components/AntarcticSplashShader.jsx",
  "components/EvidenceArchive.jsx",
  "components/IglooHud.jsx",
  "components/IglooWorld.jsx",
  "components/LiveRadar.jsx",
  "components/ProjectIndex.jsx",
  "components/SdfSealSplash.jsx",
];
const highRiskSlop = [
  "delve into",
  "dive deep into",
  "navigate the complexities",
  "ever-evolving landscape",
  "in today's fast-paced world",
  "it's important to note that",
  "game-changer",
  "cutting-edge",
  "unlock potential",
  "empower users",
  "maximize value",
];

for (const path of authoredSurfaces) {
  const source = read(path).toLowerCase();
  for (const phrase of highRiskSlop) {
    assert.equal(
      source.includes(phrase),
      false,
      `${path} contains high-confidence UI slop: ${phrase}`,
    );
  }
}

const gate = `${read("components/AntarcticSplashShader.jsx")}\n${read(
  "components/SdfSealSplash.jsx",
)}`;
const index = read("components/ProjectIndex.jsx");
const radar = read("components/LiveRadar.jsx");
const world = read("components/IglooWorld.jsx");
const hud = read("components/IglooHud.jsx");

assert.match(gate, /Start the adventure into Seal's Topological Land/i);
assert.match(gate, /Scroll left if boring/i);
assert.doesNotMatch(gate, />\s*(Get started|Learn more|Explore more)\s*</i);
assert.match(`${world}\n${hud}`, /Enter the topology archive/);
assert.match(`${world}\n${hud}`, /Stay in the polar world/);
assert.match(radar, /live-github/);
assert.match(radar, /research-snapshot/);
assert.doesNotMatch(
  index,
  /evidenceFiles\?\.length[\s\S]{0,240}`\$\{fileCount\} files/,
  "sampled evidence paths must not be presented as total files",
);
assert.match(index, /sampled paths|sampled evidence paths/);
assert.match(index, /Live GitHub tree[\s\S]*Verified GitHub tree snapshot/);

const auditPath = join(
  root,
  "docs",
  "research",
  "2026-07-12-user-facing-copy-audit.md",
);
assert.ok(existsSync(auditPath), "Wave G requires a surface-by-surface copy rationale audit");
const audit = readFileSync(auditPath, "utf8");
for (const requiredSurface of [
  "Entry gate",
  "World masthead",
  "Route instrument",
  "Station evidence",
  "GitHub radar",
  "Topology archive",
  "Project index",
  "Quality controls",
  "Fallback",
]) {
  assert.ok(audit.includes(requiredSurface), `copy audit is missing ${requiredSurface}`);
}

console.log("user-facing copy contract passed: every major surface has purpose, evidence scope, and direct wording");
