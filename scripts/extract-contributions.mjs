// Writes data/contributions.json from data/contributions.allow.json.
//
// Only public PRs in state MERGED or OPEN that carry no hold are kept. A
// CLOSED PR is kept only when its entry names the commit that landed it
// (`landedCommit`, optional `landedRepo`); it is then linked by commit. A PR
// with a non-null `hold` waits for the owner's confirmation.
//
//   node scripts/extract-contributions.mjs [allow.json] [out.json]

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SHOWN = new Set(["MERGED", "OPEN"]);
const SHA = /^[0-9a-f]{7,40}$/i;

function landedRow({ repo, pr, title, state, landedCommit, landedRepo }) {
  if (!SHA.test(landedCommit)) throw new Error(`extract-contributions: bad landedCommit for ${repo}#${pr}: ${landedCommit}`);
  return { repo, pr, title, state, status: "landed", commit: landedCommit, url: `https://github.com/${landedRepo || repo}/commit/${landedCommit}` };
}

export function selectContributions(allow) {
  return allow.entries
    .filter((e) => e.visibility === "public" && e.hold == null && (SHOWN.has(e.state) || (e.state === "CLOSED" && e.landedCommit != null)))
    .map((e) => (SHOWN.has(e.state) ? { repo: e.repo, pr: e.pr, title: e.title, state: e.state } : landedRow(e)));
}

function main() {
  const allowPath = process.argv[2] || "data/contributions.allow.json";
  const outPath = process.argv[3] || "data/contributions.json";
  if (!existsSync(allowPath)) {
    console.error(`extract-contributions: missing ${allowPath}`);
    process.exit(1);
  }
  const allow = JSON.parse(readFileSync(allowPath, "utf8"));
  const items = selectContributions(allow);
  writeFileSync(outPath, JSON.stringify({ source: allow.source, items }, null, 2) + "\n");
  console.log(`extract-contributions: wrote ${items.length} items to ${outPath}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) main();
