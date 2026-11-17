// node scripts/issues-checklist.mjs : writes verification/ISSUES.md, the one page the owner reads to close the open issues.
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const ACCEPT_DIR = path.join(ROOT, "lib/anime/accept");
const RESULT_DIR = path.join(ROOT, "verification/accept");
const OUT = path.join(ROOT, "verification/ISSUES.md");
const OWNER = "owner's eye";
const SKIP_FIELDS = new Set(["id", "stage", "kind", "src"]);

const esc = (v) => String(v).replace(/\|/g, "\\|").replace(/\s+/g, " ");
const clip = (s, n = 160) => (s.length > n ? `${s.slice(0, n - 3)}...` : s);
const fmt = (v) => (v === undefined ? "-" : typeof v === "string" ? v : JSON.stringify(v));

function statusOf(result) {
  if (!result) return "not run";
  if (result.status === "pass") return "passed";
  if (result.status === "fail") return "failed";
  return "not run";
}

function describe(test, at) {
  const nums = Object.entries(test)
    .filter(([k, v]) => !SKIP_FIELDS.has(k) && v !== null && typeof v !== "object")
    .map(([k, v]) => `${k} ${v}`);
  return clip([test.kind ?? "test", at !== undefined ? `at ${at} s` : null, ...nums].filter(Boolean).join(", "));
}

function dockRows(accept, result) {
  const byId = new Map((result?.results ?? []).map((r) => [r.id, r]));
  const rows = [];
  const seen = new Set();
  const addTest = (test, at) => {
    if (seen.has(test.id)) return;
    seen.add(test.id);
    const r = byId.get(test.id);
    rows.push({
      id: test.id,
      stage: test.stage ?? "-",
      what: describe(test, at),
      status: test.kind === "custom" ? OWNER : statusOf(r),
      measured: clip(fmt(r?.measured)),
      src: test.src ?? "-",
    });
  };
  for (const still of accept.stills ?? []) for (const test of still.tests ?? []) addTest(test, still.t);
  for (const test of accept.every ?? []) addTest(test, undefined);
  for (const m of accept.manual ?? []) {
    rows.push({ id: m.id, stage: "-", what: clip(m.text ?? "-"), status: OWNER, measured: "-", src: m.src ?? "-" });
  }
  return rows;
}

function tally(rows) {
  const counts = { passed: 0, failed: 0, "not run": 0, [OWNER]: 0 };
  for (const r of rows) counts[r.status] += 1;
  return counts;
}

function renderSection(issue, title, rows) {
  const counts = tally(rows);
  const ready = counts.failed === 0 && counts["not run"] === 0;
  const table = rows.map(
    (r) => `| ${esc(r.id)} | ${esc(r.stage)} | ${esc(r.what)} | ${r.status} | ${esc(r.measured)} | ${esc(r.src)} |`,
  );
  return {
    issue,
    counts,
    lines: [
      `## #${issue} ${title}`,
      "",
      "| id | stage | what | status | measured | source |",
      "| --- | --- | --- | --- | --- | --- |",
      ...table,
      "",
      ready ? "Ready to close: yes" : `Ready to close: no (${counts.failed} failed, ${counts["not run"]} not run)`,
      "",
    ],
  };
}

export function buildChecklist({ accepts = [], results = [], umbrella = null, sha = "unknown", date = "" }) {
  const resultByDock = new Map(results.map((r) => [r.dock, r]));
  const sections = accepts.map((acc) =>
    renderSection(acc.issue, acc.dock, dockRows(acc, resultByDock.get(acc.dock))),
  );
  for (const u of umbrella?.issues ?? []) {
    const rows = (u.rows ?? []).map((r) => ({
      id: r.id, stage: "-", what: clip(r.text), status: OWNER, measured: "-", src: r.src ?? "-",
    }));
    sections.push(renderSection(u.issue, u.title, rows));
  }
  sections.sort((a, b) => a.issue - b.issue);

  const totals = { passed: 0, failed: 0, "not run": 0, [OWNER]: 0 };
  for (const s of sections) for (const k of Object.keys(totals)) totals[k] += s.counts[k];

  const header = [
    "# Issues checklist",
    "",
    `Git sha \`${sha}\`, built ${date} by \`scripts/issues-checklist.mjs\`. Generated; not committed.`,
    "",
    `Totals: passed ${totals.passed}, failed ${totals.failed}, not run ${totals["not run"]}, needs the owner's eye ${totals[OWNER]}. Sections: ${sections.length}.`,
    "",
  ];
  const markdown = [...header, ...sections.flatMap((s) => s.lines)].join("\n");
  return { markdown, totals };
}

function readJsonDir(dir, skipUnderscore) {
  if (!existsSync(dir)) return [];
  const out = [];
  for (const file of readdirSync(dir).filter((f) => f.endsWith(".json")).sort()) {
    if (skipUnderscore && file.startsWith("_")) continue;
    const name = file.replace(/\.json$/, "");
    try {
      out.push({ name, data: JSON.parse(readFileSync(path.join(dir, file), "utf8")) });
    } catch (err) {
      console.warn(`skipped ${path.join(dir, file)}: ${err.message}`);
    }
  }
  return out;
}

function gitSha() {
  try {
    return execFileSync("git", ["rev-parse", "--short", "HEAD"], { cwd: ROOT, encoding: "utf8" }).trim();
  } catch {
    return "unknown";
  }
}

function main() {
  const accepts = readJsonDir(ACCEPT_DIR, true).map(({ name, data }) => ({ ...data, dock: data.dock ?? name }));
  const results = readJsonDir(RESULT_DIR, true).map(({ name, data }) => ({ ...data, dock: data.dock ?? name }));
  const umbrellaPath = path.join(ACCEPT_DIR, "_umbrella.json");
  const umbrella = existsSync(umbrellaPath) ? JSON.parse(readFileSync(umbrellaPath, "utf8")) : null;

  const { markdown, totals } = buildChecklist({
    accepts,
    results,
    umbrella,
    sha: gitSha(),
    date: new Date().toISOString().slice(0, 10),
  });
  mkdirSync(path.dirname(OUT), { recursive: true });
  writeFileSync(OUT, `${markdown}\n`);
  console.log(`wrote ${OUT}`);
  console.log(
    `totals: passed ${totals.passed}, failed ${totals.failed}, not run ${totals["not run"]}, needs the owner's eye ${totals[OWNER]}`,
  );
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) main();
