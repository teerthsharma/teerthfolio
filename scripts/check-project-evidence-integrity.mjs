import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

import { summarizeRepositoryTree } from "../lib/github-live.js";

const root = process.cwd();
const indexSource = readFileSync(join(root, "components", "ProjectIndex.jsx"), "utf8");
const pageSource = readFileSync(join(root, "app", "page.jsx"), "utf8");
const portfolioSource = readFileSync(join(root, "components", "PortfolioPage.jsx"), "utf8");
const corpus = JSON.parse(
  readFileSync(join(root, "data", "project-intelligence.json"), "utf8"),
);

const completeTree = summarizeRepositoryTree({
  tree: [
    { path: "kernel/main.rs", type: "blob" },
    { path: "kernel/memory.rs", type: "blob" },
    { path: "README.md", type: "blob" },
    { path: "kernel", type: "tree" },
  ],
  truncated: false,
});
assert.deepEqual(completeTree, {
  directoryCount: 1,
  rustFileCount: 2,
  trackedFileCount: 3,
  treeTruncated: false,
});
assert.equal(
  summarizeRepositoryTree({ tree: [], truncated: true }),
  null,
  "a truncated tree must never be presented as total repository scope",
);

assert.doesNotMatch(
  indexSource,
  /evidenceFiles\?\.length[\s\S]{0,220}`\$\{fileCount\} files/,
  "curated evidence paths must never be labeled as total files",
);
assert.match(
  indexSource,
  /sampled paths|evidence sample/i,
  "the project index must name curated paths as a sample",
);
assert.match(
  indexSource,
  /trackedFileCount[\s\S]*rustFileCount/,
  "complete repository metrics must distinguish tracked and Rust files",
);
assert.match(pageSource, /fetchRepositoryMetrics/);
assert.match(portfolioSource, /repositoryMetrics/);

const epsilon = corpus.projects.find((project) => project.name === "Epsilon-Hollow");
assert.ok(epsilon, "Epsilon-Hollow evidence record must exist");
assert.equal(epsilon.repositorySnapshot.trackedFileCount, 1013);
assert.equal(epsilon.repositorySnapshot.rustFileCount, 397);
assert.equal(epsilon.repositorySnapshot.treeTruncated, false);
assert.equal(epsilon.repositorySnapshot.sourceMode, "github-tree-snapshot");
assert.match(epsilon.repositorySnapshot.capturedAt, /^2026-07-12T/);

console.log(
  "project evidence integrity contract passed: complete trees show repository scope; curated paths remain explicitly sampled",
);
