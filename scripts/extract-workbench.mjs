// Writes data/workbench.json: the owner's public lab repos, as GitHub reports them.
//
// The page only reads the JSON. This script is the one place that calls GitHub,
// and it runs by hand or at build time, never at page render:
//
//   node scripts/extract-workbench.mjs                          fetch with gh, write data/workbench.json
//   node scripts/extract-workbench.mjs --check                  fetch with gh, fail on any violation, write nothing
//   node scripts/extract-workbench.mjs --check --from FILE      check a saved list of repo records
//   node scripts/extract-workbench.mjs --from FILE             write from a saved list of repo records
//
// A violation is a repo that is private, a fork, not on the allowlist, or
// allowlisted but missing from the list. Any violation stops the write.

import { execFileSync } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const OWNER = "teerthsharma";
const ALLOWLIST = [
  "resolvent",
  "Epsilon-Hollow",
  "Aether-Lang",
  "caustic",
  "monodromy",
  "topological-ml-toolkit",
  "faraday",
  "nerve",
  "separatrix",
  "planimeter",
  "tangle",
];
const OUT = fileURLToPath(new URL("../data/workbench.json", import.meta.url));

const fullName = (name) => `${OWNER}/${name}`;
const key = (s) => s.toLowerCase();

function violations(records) {
  const found = [];
  const seen = new Set();
  const allowed = new Set(ALLOWLIST.map((n) => key(fullName(n))));
  for (const r of records) {
    const id = r.full_name ?? "(no full_name)";
    if (r.private) found.push(`${id}: private`);
    if (r.fork) found.push(`${id}: fork`);
    if (!allowed.has(key(id))) found.push(`${id}: not on the allowlist`);
    else seen.add(key(id));
  }
  for (const n of ALLOWLIST) if (!seen.has(key(fullName(n)))) found.push(`${fullName(n)}: missing`);
  return found;
}

function fetchRecords() {
  return ALLOWLIST.map((n) => JSON.parse(execFileSync("gh", ["api", `repos/${fullName(n)}`], { encoding: "utf8" })));
}

function toEntry(r) {
  return {
    name: r.name,
    fullName: r.full_name,
    url: r.html_url,
    description: r.description ?? null,
    language: r.language ?? null,
    stars: r.stargazers_count ?? 0,
    pushedAt: r.pushed_at ?? null,
    topics: r.topics ?? [],
  };
}

const args = process.argv.slice(2);
const from = args.indexOf("--from") >= 0 ? args[args.indexOf("--from") + 1] : null;
const checkOnly = args.includes("--check");
const records = from ? JSON.parse(readFileSync(from, "utf8")) : fetchRecords();

const bad = violations(records);
if (bad.length) {
  for (const b of bad) console.error(`workbench: ${b}`);
  process.exit(1);
}

if (checkOnly) {
  console.log(`workbench: ${records.length} repos pass`);
} else {
  const byName = new Map(records.map((r) => [key(r.full_name), r]));
  const out = {
    source: `https://api.github.com/repos/${OWNER}/<name> (allowlist in scripts/extract-workbench.mjs)`,
    repos: ALLOWLIST.map((n) => toEntry(byName.get(key(fullName(n))))),
  };
  writeFileSync(OUT, JSON.stringify(out, null, 2) + "\n");
  console.log(`workbench: ${out.repos.length} repos -> data/workbench.json`);
}
